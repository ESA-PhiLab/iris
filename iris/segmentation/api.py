"""
JSON API endpoints for segmentation interface.

Provides REST API endpoints that return JSON data for the React frontend.
"""
import json

import flask

from iris.project import project
from iris.user import requires_auth

api_bp = flask.Blueprint(
    'segmentation_api', __name__,
    url_prefix='/segmentation/api'
)


@api_bp.route('/config', methods=['GET'])
@requires_auth
def get_config():
    """Get project configuration as JSON."""
    # Get the full project config
    config = project.config

    return flask.jsonify(config)


@api_bp.route('/user-config', methods=['GET'])
@requires_auth
def get_user_config():
    """Get current user configuration as JSON."""
    from iris.models import User

    user_id = flask.session['user_id']
    user = User.query.get(user_id)
    config = project.get_user_config(user_id)
    all_bands = project.get_image_bands(project.image_ids[0])

    # If no specific bands set for model, use all bands:
    if config['segmentation']['ai_model']['bands'] is None:
        config['segmentation']['ai_model']['bands'] = all_bands

    return flask.jsonify({
        'config': config,
        'all_bands': all_bands,
        'is_admin': user.admin if user else False
    })


@api_bp.route('/user-config', methods=['POST'])
@requires_auth
def save_user_config():
    """Save user configuration."""
    user_id = flask.session['user_id']
    user_config = json.loads(flask.request.data)

    project.save_user_config(user_id, user_config)

    return flask.jsonify({'message': 'Saved user config successfully!'})



@api_bp.route('/images/list', methods=['GET'])
@requires_auth
def list_images():
    """
    Get list of all images with their annotation status.

    Returns:
        JSON response with format:
        {
            "images": [
                {
                    "image_id": "image_001",
                    "has_user_annotation": true,
                    "has_any_annotation": true,
                    "annotation_count": 3
                },
                ...
            ],
            "current_image_id": "image_001"
        }
    """
    from iris.models import Action

    user_id = flask.session['user_id']
    current_image_id = flask.request.args.get('current_image_id')

    # Get all actions for this project
    all_actions = Action.query.filter_by(type='segmentation').all()

    # Build image status map
    images_data = []
    for image_id in project.image_ids:
        # Get actions for this image
        image_actions = [a for a in all_actions if a.image_id == image_id]
        user_actions = [a for a in image_actions if a.user_id == user_id]

        images_data.append({
            'image_id': image_id,
            'has_user_annotation': len(user_actions) > 0,
            'has_any_annotation': len(image_actions) > 0,
            'annotation_count': len(image_actions)
        })

    return flask.jsonify({
        'images': images_data,
        'current_image_id': current_image_id
    })


@api_bp.route('/export-geotiff/<image_id>', methods=['GET'])
@requires_auth
def export_geotiff(image_id):
    """Export image with mask as GeoTIFF."""
    import tempfile

    import numpy as np
    import rasterio as rio

    try:
        user_id = flask.session['user_id']

        if image_id not in project.image_ids:
            return flask.jsonify({'error': 'Image not found'}), 404

        # Get the original image path
        image_path = project.get_image_path(image_id)

        # Handle multi-source images - prefer Sentinel2 over Sentinel1 for better RGB
        if isinstance(image_path, dict):
            # Prefer Sentinel2 (optical) over Sentinel1 (radar) for visual quality
            if 'Sentinel2' in image_path:
                image_path = image_path['Sentinel2']
            elif 'Sentinel-2' in image_path:
                image_path = image_path['Sentinel-2']
            else:
                # Fall back to first available source
                image_path = list(image_path.values())[0]

        # Load user's mask
        try:
            from iris.segmentation import read_masks
            final_mask, user_mask = read_masks(image_id, user_id)
        except FileNotFoundError:
            return flask.jsonify({
                'error': 'No mask data available',
                'message': 'Please save a mask before exporting'
            }), 404

        # Use IRIS's rendering engine to create RGB composite
        # This matches what the user sees in the interface
        try:
            # Get the default RGB view from config
            rgb_view = None
            if 'views' in project.config:
                # Look for RGB view
                if 'RGB' in project.config['views']:
                    rgb_view = project.config['views']['RGB']
                elif 'NRGB' in project.config['views']:
                    rgb_view = project.config['views']['NRGB']

            if rgb_view:
                # Render the RGB image using IRIS's rendering engine
                rendered_rgb = project.render_image(image_id, rgb_view)
            else:
                # Fallback: open original GeoTIFF
                with rio.open(image_path) as src:
                    original_data = src.read()
                    # Create simple RGB from first 3 bands
                    if original_data.shape[0] >= 3:
                        rendered_rgb = np.stack([
                            original_data[0],
                            original_data[1],
                            original_data[2]
                        ], axis=-1)
                    else:
                        # Grayscale
                        rendered_rgb = np.stack([original_data[0]]*3, axis=-1)

                    # Normalize to 0-255
                    rendered_rgb = ((rendered_rgb - rendered_rgb.min()) /
                                   (rendered_rgb.max() - rendered_rgb.min()) * 255).astype(np.uint8)
        except Exception as e:
            return flask.jsonify({
                'error': 'Failed to render image',
                'message': str(e)
            }), 500

        # Fix dimensions if needed
        correct_height, correct_width = final_mask.shape

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
        # Note: delete=False is intentional - flask.send_file will handle cleanup
        temp_file = tempfile.NamedTemporaryFile(  # noqa: SIM115
            delete=False,
            suffix='.tif',
            prefix=f'{image_id}_annotated_'
        )
        temp_path = temp_file.name
        temp_file.close()

        # Write new GeoTIFF with RGB bands + mask
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

            # Write mask as the 4th band
            dst.write(final_mask.astype(np.uint8), 4)

            # Add band descriptions
            dst.set_band_description(1, 'Red')
            dst.set_band_description(2, 'Green')
            dst.set_band_description(3, 'Blue')
            dst.set_band_description(4, 'Segmentation Mask')

        # Send file to user
        return flask.send_file(
            temp_path,
            as_attachment=True,
            download_name=f'{image_id}_annotated.tif',
            mimetype='image/tiff'
        )

    except Exception as e:
        return flask.jsonify({
            'error': 'Failed to export GeoTIFF',
            'message': str(e)
        }), 500
