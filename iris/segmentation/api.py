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



@api_bp.route('/file/<image_id>/<file_id>', methods=['GET'])
@requires_auth
def get_image_file(image_id, file_id):
    """
    Serve a COG file of an image.

    The browser reads the pixels and the georeference of the image from it,
    with range requests.
    """
    if image_id not in project.image_ids:
        return flask.jsonify({'error': 'Image not found'}), 404

    paths = project.get_image_path(image_id)
    if not isinstance(paths, dict):
        paths = {'pictures': paths}
    if file_id not in paths:
        return flask.jsonify({'error': 'File not found'}), 404

    return flask.send_file(paths[file_id], mimetype='image/tiff', conditional=True)


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
