"""
JSON API endpoints for admin interface.

This module provides REST API endpoints that return JSON data for the React frontend.
These endpoints replace the legacy HTML template rendering approach, enabling a modern
single-page application architecture.

Migration Context:
    - Previously: Flask rendered HTML templates server-side (admin/templates/admin/*.html)
    - Now: React components fetch JSON from these endpoints and render client-side
    - Benefits: Better UX, type safety with TypeScript, easier testing, modern dev workflow
"""
import re
from collections import defaultdict
from datetime import datetime, timedelta

import flask

from iris import db
from iris.models import Action, User
from iris.project import project
from iris.user import requires_admin, requires_auth

api_bp = flask.Blueprint(
    'admin_api', __name__,
    url_prefix='/admin/api'
)


@api_bp.route('/users', methods=['GET'])
@requires_auth
def users():
    """
    Get list of users as JSON for the React UsersPage component.

    This endpoint supports sorting and ordering to match the legacy template functionality.

    Query Parameters:
        order_by (str): Column to sort by (id, name, admin, created). Default: 'id'
        ascending (str): 'true' or 'false' for sort direction. Default: 'true'

    Returns:
        JSON response with format:
        {
            "users": [
                {
                    "id": 1,
                    "name": "admin",
                    "admin": true,
                    "created": "2024-01-01T00:00:00",
                    "segmentation": {
                        "score": 85,
                        "score_unverified": 10,
                        "n_masks": 5
                    }
                },
                ...
            ]
        }

    Note:
        - Preserves exact functionality from legacy admin/templates/admin/users.html
        - User.to_json() includes segmentation statistics automatically
    """
    # Parse query parameters for sorting
    order_by = flask.request.args.get('order_by', 'id')
    ascending = flask.request.args.get('ascending', 'true')
    ascending = ascending == 'true'

    # Query users with sorting
    users = User.query
    if ascending:
        users = users.order_by(getattr(User, order_by)).all()
    else:
        users = users.order_by(getattr(User, order_by).desc()).all()

    # Convert to JSON (includes segmentation stats via User.to_json())
    users_json = [user.to_json() for user in users]

    return flask.jsonify({'users': users_json})


@api_bp.route('/actions/<type>', methods=['GET'])
@requires_auth
def actions(type):
    """
    Get list of actions (annotations) as JSON for the React ActionsPage component.

    This endpoint provides action/annotation data with user information and progress statistics.
    Replaces the legacy admin/fragments/actions/<type> HTML endpoint.

    URL Parameters:
        type (str): Action type to filter by (e.g., 'segmentation', 'classification', 'detection')

    Query Parameters:
        order_by (str): Column to sort by (user_id, score, difficulty, last_modification, etc.)
                       Default: 'user_id'
        ascending (str): 'true' or 'false' for sort direction. Default: 'true'

    Returns:
        JSON response with format:
        {
            "actions": [
                {
                    "id": 1,
                    "type": "segmentation",
                    "image_id": "image_001",
                    "user_id": 1,
                    "username": "admin",  // Joined from User table
                    "score": 85,
                    "difficulty": 3,
                    "complete": true,
                    "unverified": false,
                    "last_modification": "2024-01-01T12:00:00",
                    "time_spent": "0:30:00",
                    "notes": "Difficult clouds"
                },
                ...
            ],
            "image_stats": {
                "processed": 5,  // Number of unique images with annotations
                "total": 10      // Total images in project
            },
            "order_by": "user_id",
            "ascending": true
        }

    Note:
        - Preserves exact functionality from legacy admin/templates/admin/actions.html
        - Joins username from User table for display
        - Calculates progress statistics for progress bar
    """
    # Parse query parameters for sorting
    order_by = flask.request.args.get('order_by', 'user_id')
    ascending = flask.request.args.get('ascending', 'true')
    ascending = ascending == 'true'

    # Query actions filtered by type (e.g., 'segmentation') with sorting
    actions = Action.query.filter_by(type=type)
    if ascending:
        actions = actions.order_by(getattr(Action, order_by)).all()
    else:
        actions = actions.order_by(getattr(Action, order_by).desc()).all()

    # Convert to JSON and join username from User table
    # Note: action.user is a SQLAlchemy relationship, so we can access user.name directly
    actions_json = [
        {**action.to_json(), 'username': action.user.name if action.user else 'Unknown User'}
        for action in actions
    ]

    # Calculate image statistics for progress bar
    # - processed: count of unique images that have been annotated
    # - total: total number of images in the project
    image_stats = {
        "processed": len({action.image_id for action in actions}),
        "total": len(project.image_ids)
    }

    return flask.jsonify({
        'actions': actions_json,
        'image_stats': image_stats,
        'order_by': order_by,
        'ascending': ascending
    })


@api_bp.route('/images', methods=['GET'])
@requires_auth
def images():
    """
    Get image statistics with aggregated action data for the React ImagesPage component.

    This endpoint aggregates all actions (annotations) per image and calculates statistics
    like average score, difficulty, and time spent. Replaces the legacy
    admin/fragments/images HTML endpoint.

    Query Parameters:
        order_by (str): Column to sort by (currently only 'image_id' supported). Default: 'image_id'
        ascending (str): 'true' or 'false' for sort direction. Default: 'true'

    Returns:
        JSON response with format:
        {
            "images": [
                {
                    "image_id": "image_001",
                    "types": {
                        "segmentation": {
                            "score": 85.5,      // Average score across all annotations
                            "count": 3,          // Number of annotations for this image
                            "difficulty": 3.0,   // Average difficulty rating
                            "time_spent": 0.5    // Average time in hours
                        },
                        "classification": { ... }  // If other action types exist
                    }
                },
                ...
            ],
            "order_by": "image_id",
            "ascending": true
        }

    Algorithm:
        1. For each image in the project:
           - Group all actions by action type (segmentation, classification, etc.)
           - Sum up scores, difficulties, and time spent
           - Count number of annotations
        2. Calculate averages (sum / count)
        3. Convert time from timedelta to hours (float)
        4. Round values for display

    Note:
        - Preserves exact functionality from legacy admin/templates/admin/images.html
        - Uses same aggregation logic as legacy code for consistency
        - TODO: Could be optimized with SQL aggregation queries for large datasets
    """
    # Parse query parameters for sorting
    order_by = flask.request.args.get('order_by', 'image_id')
    ascending = flask.request.args.get('ascending', 'true')
    ascending = ascending == 'true'

    # Build image statistics using same algorithm as legacy code
    # Structure: images_data[image_id][action_type] = {score, count, difficulty, time_spent}
    images_data = defaultdict(dict)
    actions = Action.query.all()

    # Default statistics structure for each image/type combination
    default_stats = {
        'score': 0,
        'count': 0,
        'difficulty': 0,
        'time_spent': timedelta(),
    }

    # Iterate through all images in the project
    for image_id in project.image_ids:
        # For each image, aggregate all actions
        for action in actions:
            if action.image_id != image_id:
                continue

            # Initialize stats for this action type if not exists
            if action.type not in images_data[image_id]:
                images_data[image_id][action.type] = default_stats.copy()

            # Accumulate statistics
            images_data[image_id][action.type]['count'] += 1
            images_data[image_id][action.type]['score'] += action.score
            images_data[image_id][action.type]['difficulty'] += action.difficulty
            images_data[image_id][action.type]['time_spent'] += action.time_spent

        # Calculate the average values (sum / count)
        for stats in images_data[image_id].values():
            if stats['count'] > 0:
                stats['score'] /= stats['count']
                stats['difficulty'] /= stats['count']
                stats['time_spent'] /= stats['count']
                # Convert timedelta to hours (float) for easier display
                stats['time_spent'] = stats['time_spent'].total_seconds() / 3600.

    # Convert nested dict to list format for easier frontend handling
    # Frontend can iterate over array and access types by key
    images_list = []
    for image_id, types_data in images_data.items():
        image_entry = {
            'image_id': image_id,
            'types': {}
        }
        # Round values for cleaner display
        for action_type, stats in types_data.items():
            image_entry['types'][action_type] = {
                'score': round(stats['score'], 2),
                'count': stats['count'],
                'difficulty': round(stats['difficulty'], 2),
                'time_spent': round(stats['time_spent'], 2)
            }
        images_list.append(image_entry)

    return flask.jsonify({
        'images': images_list,
        'order_by': order_by,
        'ascending': ascending
    })


@api_bp.route('/password-reset-requests', methods=['GET'])
@requires_admin
def get_password_reset_requests():
    """
    Get list of password reset requests for admin interface.

    Returns:
        JSON response with format:
        {
            "requests": [
                {
                    "id": 1,
                    "user_id": 5,
                    "username": "john_doe",
                    "email": "john@example.com",
                    "requested_at": "2024-01-01T12:00:00",
                    "resolved": false,
                    "resolved_at": null,
                    "resolved_by_user_id": null
                },
                ...
            ]
        }
    """
    from iris.models import PasswordResetRequest

    # Get all unresolved requests first, then resolved ones
    requests = PasswordResetRequest.query.order_by(
        PasswordResetRequest.resolved.asc(),
        PasswordResetRequest.requested_at.desc()
    ).all()

    requests_json = []
    for req in requests:
        req_data = req.to_json()
        # Add username and email from user
        if req.user:
            req_data['username'] = req.user.name
            req_data['email'] = req.user.email
        else:
            req_data['username'] = 'Unknown'
            req_data['email'] = None
        requests_json.append(req_data)

    return flask.jsonify({'requests': requests_json})


@api_bp.route('/password-reset-requests/<int:request_id>/generate-password', methods=['POST'])
@requires_admin
def generate_temporary_password(request_id):
    """
    Generate a temporary password for a password reset request.

    URL Parameters:
        request_id (int): ID of the password reset request

    Returns:
        JSON response with format:
        {
            "temporary_password": "abc123xyz",
            "email": "user@example.com",
            "username": "john_doe"
        }
    """
    import secrets
    import string

    from iris.models import PasswordResetRequest

    reset_request = PasswordResetRequest.query.get_or_404(request_id)

    if reset_request.resolved:
        return flask.jsonify({'error': 'This request has already been resolved'}), 400

    user = reset_request.user
    if not user:
        return flask.jsonify({'error': 'User not found'}), 404

    # Generate a simple temporary password (8 characters, alphanumeric)
    alphabet = string.ascii_letters + string.digits
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(8))

    # Set the temporary password
    user.set_password(temp_password)

    # Mark request as resolved
    reset_request.resolved = True
    reset_request.resolved_at = datetime.utcnow()
    reset_request.resolved_by_user_id = flask.session['user_id']

    db.session.add(user)
    db.session.add(reset_request)
    db.session.commit()

    return flask.jsonify({
        'temporary_password': temp_password,
        'email': user.email,
        'username': user.name
    })


@api_bp.route('/export-merged-geotiff/<image_id>', methods=['GET'])
@requires_admin
def export_merged_geotiff(image_id):
    """
    Export merged mask as GeoTIFF (admin-only).

    This endpoint creates a GeoTIFF with RGB bands from the original image
    and the merged mask from all users as the 4th band. Only administrators
    can access this endpoint.

    URL Parameters:
        image_id (str): ID of the image to export

    Returns:
        GeoTIFF file download with format:
        - Band 1-3: RGB composite of original image
        - Band 4: Merged segmentation mask from all users

    Security:
        - Admin-only access via @requires_admin decorator (403 if not admin)
        - Validates image_id exists in project
        - Uses merged mask (voting system across all user annotations)

    Note:
        - Similar to segmentation export but uses merged masks instead of single user
        - Merged mask combines all user annotations via voting system
        - Useful for exporting final consensus annotations
    """
    import tempfile
    from glob import glob

    import numpy as np
    import rasterio as rio

    # Validate image exists
    if image_id not in project.image_ids:
        return flask.jsonify({'error': 'Image not found'}), 404

    try:
        # Get the original image path
        image_path = project.get_image_path(image_id)

        # Handle multi-source images - prefer Sentinel2 over Sentinel1
        if isinstance(image_path, dict):
            if 'Sentinel2' in image_path:
                image_path = image_path['Sentinel2']
            elif 'Sentinel-2' in image_path:
                image_path = image_path['Sentinel-2']
            else:
                image_path = list(image_path.values())[0]

        # Load merged mask by reading all user masks and merging them
        from iris.segmentation import get_mask_filenames

        final_mask_paths = get_mask_filenames(image_id, user_id="*")[0]
        mask_files = glob(final_mask_paths)

        if not mask_files:
            return flask.jsonify({
                'error': 'No mask data available',
                'message': 'No users have annotated this image yet'
            }), 404

        # Load all user masks and merge them using voting system
        final_masks = []
        for path in mask_files:
            mask_data = np.load(path)
            # Convert from one-hot encoding to class indices
            final_masks.append(np.argmax(mask_data, axis=-1))

        final_masks = np.dstack(final_masks)

        # Merge masks using voting system (reuses compute_merged_mask function)
        from iris.segmentation import compute_merged_mask
        merged_mask = compute_merged_mask(final_masks)

        # Render RGB image using IRIS's rendering engine
        try:
            rgb_view = None
            if 'views' in project.config:
                if 'RGB' in project.config['views']:
                    rgb_view = project.config['views']['RGB']
                elif 'NRGB' in project.config['views']:
                    rgb_view = project.config['views']['NRGB']

            if rgb_view:
                rendered_rgb = project.render_image(image_id, rgb_view)
            else:
                # Fallback: open original GeoTIFF
                with rio.open(image_path) as src:
                    original_data = src.read()
                    if original_data.shape[0] >= 3:
                        rendered_rgb = np.stack([
                            original_data[0],
                            original_data[1],
                            original_data[2]
                        ], axis=-1)
                    else:
                        rendered_rgb = np.stack([original_data[0]]*3, axis=-1)

                    # Normalize to 0-255
                    rendered_rgb = ((rendered_rgb - rendered_rgb.min()) /
                                   (rendered_rgb.max() - rendered_rgb.min()) * 255).astype(np.uint8)
        except Exception as e:
            return flask.jsonify({
                'error': 'Failed to render image',
                'message': str(e)
            }), 500

        # Get correct dimensions
        correct_height, correct_width = merged_mask.shape

        # Create profile for output GeoTIFF
        profile = {
            'driver': 'GTiff',
            'dtype': 'uint8',
            'width': correct_width,
            'height': correct_height,
            'count': 4,  # RGB + mask
            'crs': None,
            'transform': rio.transform.from_bounds(0, 0, correct_width, correct_height,
                                                   correct_width, correct_height)
        }

        # Create temporary file for export
        temp_file = tempfile.NamedTemporaryFile(  # noqa: SIM115
            delete=False,
            suffix='.tif',
            prefix=f'{image_id}_merged_'
        )
        temp_path = temp_file.name
        temp_file.close()

        # Write GeoTIFF with RGB bands + merged mask
        with rio.open(temp_path, 'w', **profile) as dst:
            # Resize rendered RGB if needed
            if rendered_rgb.shape[:2] != (correct_height, correct_width):
                from skimage.transform import resize
                rendered_rgb = resize(
                    rendered_rgb,
                    (correct_height, correct_width),
                    order=1,
                    preserve_range=True,
                    anti_aliasing=True
                ).astype(np.uint8)

            # Write RGB bands
            dst.write(rendered_rgb[:, :, 0], 1)  # Red
            dst.write(rendered_rgb[:, :, 1], 2)  # Green
            dst.write(rendered_rgb[:, :, 2], 3)  # Blue

            # Write merged mask as 4th band
            dst.write(merged_mask.astype(np.uint8), 4)

            # Add band descriptions
            dst.set_band_description(1, 'Red')
            dst.set_band_description(2, 'Green')
            dst.set_band_description(3, 'Blue')
            dst.set_band_description(4, 'Merged Segmentation Mask')

        # Send file to user
        return flask.send_file(
            temp_path,
            as_attachment=True,
            download_name=f'{image_id}_merged.tif',
            mimetype='image/tiff'
        )

    except Exception as e:
        return flask.jsonify({
            'error': 'Failed to export merged GeoTIFF',
            'message': str(e)
        }), 500


@api_bp.route('/export-all-geotiffs', methods=['POST'])
@requires_admin
def export_all_geotiffs():
    """
    Export all images with merged masks as GeoTIFF files (admin-only).

    This endpoint creates GeoTIFF files for all images that have annotations,
    saving them to a specified directory. Each file contains RGB bands from
    the original image and the merged mask as the 4th band.

    Request Body (JSON):
        {
            "output_dir": "path/to/output/directory"  // Optional, defaults to "exports"
        }

    Returns:
        JSON response with format:
        {
            "success": true,
            "exported_count": 5,
            "skipped_count": 2,
            "total_images": 7,
            "output_dir": "/absolute/path/to/exports",
            "files": [
                "project_name_image_001_merged.tif",
                "project_name_image_002_merged.tif",
                ...
            ],
            "skipped": [
                {"image_id": "image_003", "reason": "No annotations"},
                ...
            ]
        }

    Security:
        - Admin-only access via @requires_admin decorator
        - Validates and sanitizes output directory path
        - Only exports images with existing annotations
    """
    import os
    from glob import glob

    import numpy as np
    import rasterio as rio

    try:
        # Parse request body
        data = flask.request.get_json() or {}
        output_dir = data.get('output_dir', 'exports')

        # Convert to absolute path and create directory
        if not os.path.isabs(output_dir):
            output_dir = os.path.join(os.getcwd(), output_dir)

        os.makedirs(output_dir, exist_ok=True)

        # Get project name for filename prefix
        project_name = project.config.get('name', 'project')
        # Sanitize project name for filesystem
        project_name = re.sub(r'[^\w\-_]', '_', project_name)

        exported_files = []
        skipped_images = []

        from iris.segmentation import compute_merged_mask, get_mask_filenames

        # Iterate through all images
        for image_id in project.image_ids:
            try:
                # Check if image has any annotations
                final_mask_paths = get_mask_filenames(image_id, user_id="*")[0]
                mask_files = glob(final_mask_paths)

                if not mask_files:
                    skipped_images.append({
                        'image_id': image_id,
                        'reason': 'No annotations'
                    })
                    continue

                # Get the original image path
                image_path = project.get_image_path(image_id)

                # Handle multi-source images - prefer Sentinel2
                if isinstance(image_path, dict):
                    if 'Sentinel2' in image_path:
                        image_path = image_path['Sentinel2']
                    elif 'Sentinel-2' in image_path:
                        image_path = image_path['Sentinel-2']
                    else:
                        image_path = list(image_path.values())[0]

                # Load all user masks and merge them
                final_masks = []
                for path in mask_files:
                    mask_data = np.load(path)
                    final_masks.append(np.argmax(mask_data, axis=-1))

                final_masks = np.dstack(final_masks)
                merged_mask = compute_merged_mask(final_masks)

                # Render RGB image
                rgb_view = None
                if 'views' in project.config:
                    if 'RGB' in project.config['views']:
                        rgb_view = project.config['views']['RGB']
                    elif 'NRGB' in project.config['views']:
                        rgb_view = project.config['views']['NRGB']

                if rgb_view:
                    rendered_rgb = project.render_image(image_id, rgb_view)
                else:
                    # Fallback: open original GeoTIFF
                    with rio.open(image_path) as src:
                        original_data = src.read()
                        if original_data.shape[0] >= 3:
                            rendered_rgb = np.stack([
                                original_data[0],
                                original_data[1],
                                original_data[2]
                            ], axis=-1)
                        else:
                            rendered_rgb = np.stack([original_data[0]]*3, axis=-1)

                        # Normalize to 0-255
                        rendered_rgb = ((rendered_rgb - rendered_rgb.min()) /
                                       (rendered_rgb.max() - rendered_rgb.min()) * 255).astype(np.uint8)

                # Get correct dimensions
                correct_height, correct_width = merged_mask.shape

                # Create profile for output GeoTIFF
                profile = {
                    'driver': 'GTiff',
                    'dtype': 'uint8',
                    'width': correct_width,
                    'height': correct_height,
                    'count': 4,  # RGB + mask
                    'crs': None,
                    'transform': rio.transform.from_bounds(0, 0, correct_width, correct_height,
                                                           correct_width, correct_height)
                }

                # Create output filename
                output_filename = f'{project_name}_{image_id}_merged.tif'
                output_path = os.path.join(output_dir, output_filename)

                # Write GeoTIFF
                with rio.open(output_path, 'w', **profile) as dst:
                    # Resize rendered RGB if needed
                    if rendered_rgb.shape[:2] != (correct_height, correct_width):
                        from skimage.transform import resize
                        rendered_rgb = resize(
                            rendered_rgb,
                            (correct_height, correct_width),
                            order=1,
                            preserve_range=True,
                            anti_aliasing=True
                        ).astype(np.uint8)

                    # Write RGB bands
                    dst.write(rendered_rgb[:, :, 0], 1)  # Red
                    dst.write(rendered_rgb[:, :, 1], 2)  # Green
                    dst.write(rendered_rgb[:, :, 2], 3)  # Blue

                    # Write merged mask as 4th band
                    dst.write(merged_mask.astype(np.uint8), 4)

                    # Add band descriptions
                    dst.set_band_description(1, 'Red')
                    dst.set_band_description(2, 'Green')
                    dst.set_band_description(3, 'Blue')
                    dst.set_band_description(4, 'Merged Segmentation Mask')

                exported_files.append(output_filename)

            except Exception as e:
                skipped_images.append({
                    'image_id': image_id,
                    'reason': str(e)
                })

        return flask.jsonify({
            'success': True,
            'exported_count': len(exported_files),
            'skipped_count': len(skipped_images),
            'total_images': len(project.image_ids),
            'output_dir': output_dir,
            'files': exported_files,
            'skipped': skipped_images
        })

    except Exception as e:
        return flask.jsonify({
            'error': 'Failed to export GeoTIFFs',
            'message': str(e)
        }), 500
