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


@api_bp.route('/merged-mask/<image_id>', methods=['GET'])
@requires_admin
def merged_mask(image_id):
    """
    The mask of an image merged from the masks of all users (admin-only).

    One byte per pixel of the mask area, row by row: the class most users gave
    the pixel. The browser makes the exported GeoTIFFs from it.
    """
    from iris.segmentation import compute_merged_mask, read_user_masks

    if image_id not in project.image_ids:
        return flask.jsonify({'error': 'Image not found'}), 404

    _, final_masks = read_user_masks(image_id)
    if final_masks is None:
        return flask.jsonify({'error': 'No users have annotated this image yet'}), 404

    response = flask.make_response(compute_merged_mask(final_masks).astype('uint8').tobytes())
    response.headers.set('Content-Type', 'application/octet-stream')
    response.headers.set('Cache-Control', 'no-store')
    return response
