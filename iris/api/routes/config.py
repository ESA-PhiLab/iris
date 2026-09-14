"""
Project Configuration API Endpoints

Provides REST API endpoints for managing IRIS project configuration files.
Admin-only access with support for both JWT (React frontend) and Flask session (legacy UI) authentication.

Endpoints:
- GET /api/config/project - Retrieve current project configuration
- PUT /api/config/project - Update project configuration (with backup/rollback)
- POST /api/config/project/validate - Validate configuration without saving
"""

import json
import os
from copy import deepcopy

import flask

from iris.models import User
from iris.project import project

config_bp = flask.Blueprint('config', __name__)

@config_bp.route('/health', methods=['GET'])
def config_health():
    """Health check for config API"""
    return flask.jsonify({'status': 'ok', 'message': 'Config API is accessible'}), 200

def require_admin():
    """
    Check if current user has admin privileges via Flask session.

    Returns:
        User object if admin, or tuple (error_response, status_code) if not authorized
    """
    if 'user_id' not in flask.session:
        return flask.jsonify({'error': 'Not authenticated'}), 401

    current_user_id = flask.session['user_id']
    user = User.query.get(current_user_id)

    if not user:
        return flask.jsonify({'error': 'User not found'}), 401

    if not user.admin:
        return flask.jsonify({'error': 'Admin privileges required'}), 403

    return user

def make_relative(path, base_dir):
    """Convert absolute path to relative path from base directory"""
    if isinstance(path, dict):
        return {k: make_relative(v, base_dir) for k, v in path.items()}
    elif isinstance(path, list):
        return [make_relative(p, base_dir) for p in path]
    elif not path or path is False:
        return path
    elif isinstance(path, str):
        # Only convert if it's an absolute path
        if os.path.isabs(path):
            try:
                return os.path.relpath(path, base_dir)
            except ValueError:
                # On Windows, relpath fails if paths are on different drives
                return path
        return path
    return path

@config_bp.route('/project', methods=['GET'])
def get_project_config():
    """
    GET /api/config/project

    Retrieve the current project configuration for editing.
    Cleans internal fields added by the system (css_colour, name, stretch, etc.)
    and ensures all data is JSON-serializable.
    Converts absolute paths back to relative paths for editing.

    Returns:
        200: {config: {...}, config_file: "path/to/config.json"}
        401/403: Authentication/authorization error
        500: Server error
    """
    try:
        flask.current_app.logger.info("Config endpoint called")

        # Check admin privileges
        admin_check = require_admin()
        if isinstance(admin_check, tuple):  # Error response
            flask.current_app.logger.warning(f"Admin check failed: {admin_check}")
            return admin_check

        flask.current_app.logger.info(f"Admin check passed for user: {admin_check.name}")

        # Get base directory for relative path conversion
        base_dir = os.path.dirname(project.file)

        # Build clean config data structure
        # Use deepcopy to avoid modifying the original project.config object
        config_data = {
            'name': project.config.get('name'),
            'host': project.config.get('host', '127.0.0.1'),
            'port': project.config.get('port', 5000),
            'images': {
                'path': make_relative(deepcopy(project.config['images']['path']), base_dir),
                'shape': deepcopy(project.config['images']['shape']),
                'thumbnails': make_relative(project.config['images'].get('thumbnails', False), base_dir),
                'metadata': make_relative(project.config['images'].get('metadata', False), base_dir),
            },
            'classes': deepcopy(project.config.get('classes', [])),
            'views': deepcopy(project.config.get('views', {})),
            'view_groups': deepcopy(project.config.get('view_groups', {})),
            'segmentation': deepcopy(project.config.get('segmentation', {})),
            'chat': deepcopy(project.config.get('chat', None)),
        }

        # Clean up views - remove internal fields added during project initialization
        if 'views' in config_data and config_data['views']:
            for _view_name, view_data in config_data['views'].items():
                if isinstance(view_data, dict):
                    # Remove system-added fields that shouldn't be in the config file
                    view_data.pop('name', None)  # View name is the key, not a field
                    view_data.pop('css_colour', None)  # Computed from colour
                    view_data.pop('stretch', None)  # Internal rendering hint

                    # Convert Jinja2 Markup objects back to plain strings
                    if 'description' in view_data:
                        desc = view_data['description']
                        if hasattr(desc, '__html__'):  # Is a Markup object
                            view_data['description'] = str(desc)
                        else:
                            view_data['description'] = str(desc)

                    # Ensure data field is properly formatted (string for monochrome, array for RGB)
                    if 'data' in view_data:
                        data = view_data['data']
                        if isinstance(data, list):
                            view_data['data'] = [str(d) for d in data]
                        else:
                            view_data['data'] = str(data)

        # Clean up classes - remove internal fields
        if 'classes' in config_data and config_data['classes']:
            for class_data in config_data['classes']:
                if isinstance(class_data, dict):
                    class_data.pop('css_colour', None)
                    # Convert Markup descriptions to strings
                    if 'description' in class_data:
                        desc = class_data['description']
                        if hasattr(desc, '__html__'):
                            class_data['description'] = str(desc)

        # Clean up segmentation - ensure it's JSON serializable and convert paths to relative
        if 'segmentation' in config_data and config_data['segmentation']:
            seg = config_data['segmentation']
            # Remove computed fields
            seg.pop('mask_shape', None)
            # Convert segmentation path to relative
            if 'path' in seg:
                seg['path'] = make_relative(seg['path'], base_dir)

        # Test JSON serialization before returning
        try:
            json.dumps(config_data)
        except (TypeError, ValueError) as e:
            flask.current_app.logger.error(f"Config not JSON serializable: {e}")
            # Try to identify the problematic field
            for key, value in config_data.items():
                try:
                    json.dumps({key: value})
                except (TypeError, ValueError):
                    flask.current_app.logger.error(f"Problem with field: {key}")
            raise

        return flask.jsonify({
            'config': config_data,
            'config_file': project.file
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()  # Print full traceback to console for debugging
        return flask.jsonify({
            'error': 'Failed to get project config',
            'message': str(e)
        }), 500

@config_bp.route('/project', methods=['PUT'])
def update_project_config():
    """
    PUT /api/config/project

    Update the project configuration file.

    Process:
    1. Validate required fields and structure
    2. Create backup of current config
    3. Write new config to file
    4. Reload project to validate it works
    5. If reload fails, restore backup and return error

    Returns:
        200: {message: "...", config_file: "..."}
        400: Validation error
        401/403: Authentication/authorization error
        500: Server error
    """
    try:
        # Check admin privileges
        admin_check = require_admin()
        if isinstance(admin_check, tuple):  # Error response
            return admin_check

        new_config = flask.request.get_json()
        if not new_config:
            return flask.jsonify({
                'error': 'Missing data',
                'message': 'Configuration data is required'
            }), 400

        # Validate required fields
        required_fields = ['name', 'images', 'classes', 'views', 'segmentation']
        for field in required_fields:
            if field not in new_config:
                return flask.jsonify({
                    'error': 'Invalid configuration',
                    'message': f'Missing required field: {field}'
                }), 400

        # Validate images configuration
        if 'path' not in new_config['images'] or 'shape' not in new_config['images']:
            return flask.jsonify({
                'error': 'Invalid configuration',
                'message': 'images.path and images.shape are required'
            }), 400

        # Validate classes
        if not isinstance(new_config['classes'], list) or len(new_config['classes']) == 0:
            return flask.jsonify({
                'error': 'Invalid configuration',
                'message': 'At least one class is required'
            }), 400

        for class_item in new_config['classes']:
            if 'name' not in class_item or 'colour' not in class_item:
                return flask.jsonify({
                    'error': 'Invalid configuration',
                    'message': 'Each class must have name and colour fields'
                }), 400
            if not isinstance(class_item['colour'], list) or len(class_item['colour']) != 4:
                return flask.jsonify({
                    'error': 'Invalid configuration',
                    'message': 'Class colour must be an array of 4 integers (RGBA)'
                }), 400

        # Validate views
        if not isinstance(new_config['views'], dict) or len(new_config['views']) == 0:
            return flask.jsonify({
                'error': 'Invalid configuration',
                'message': 'At least one view is required'
            }), 400

        # Save configuration with backup/rollback safety
        config_file = project.file

        # Step 1: Create backup of existing config (safety net)
        backup_file = config_file + '.backup'
        if os.path.exists(config_file):
            with open(config_file) as f:
                backup_content = f.read()
            with open(backup_file, 'w') as f:
                f.write(backup_content)

        # Step 2: Write new configuration to file
        with open(config_file, 'w') as f:
            json.dump(new_config, f, indent=2)

        # Step 3: Try to reload project with new config (validates it works)
        try:
            project.load_from(config_file)
        except Exception as e:
            # Step 4: If reload fails, restore backup and re-raise error
            if os.path.exists(backup_file):
                with open(backup_file) as f:
                    backup_content = f.read()
                with open(config_file, 'w') as f:
                    f.write(backup_content)
                project.load_from(config_file)

            return flask.jsonify({
                'error': 'Invalid configuration',
                'message': f'Configuration validation failed: {str(e)}'
            }), 400

        return flask.jsonify({
            'message': 'Project configuration successfully updated',
            'config_file': config_file
        }), 200

    except Exception as e:
        return flask.jsonify({
            'error': 'Failed to update project config',
            'message': str(e)
        }), 500

@config_bp.route('/project/validate', methods=['POST'])
def validate_project_config():
    """
    POST /api/config/project/validate

    Validate a project configuration without saving it.
    Checks required fields, data types, and referential integrity.

    Returns:
        200: {valid: bool, errors: [...], warnings: [...]}
        400: Missing data
        401/403: Authentication/authorization error
        500: Server error
    """
    try:
        # Check admin privileges
        admin_check = require_admin()
        if isinstance(admin_check, tuple):  # Error response
            return admin_check

        config_data = flask.request.get_json()
        if not config_data:
            return flask.jsonify({
                'error': 'Missing data',
                'message': 'Configuration data is required'
            }), 400

        errors = []
        warnings = []

        # Validate required root fields
        required_fields = ['name', 'images', 'classes', 'views', 'segmentation']
        for field in required_fields:
            if field not in config_data:
                errors.append(f'Missing required field: {field}')

        # Validate images
        if 'images' in config_data:
            if 'path' not in config_data['images']:
                errors.append('images.path is required')
            elif isinstance(config_data['images']['path'], str):
                path_str = config_data['images']['path']
                if '{id}' not in path_str and path_str != '':
                    warnings.append('images.path should contain {id} placeholder')

            if 'shape' not in config_data['images']:
                errors.append('images.shape is required')
            elif not isinstance(config_data['images']['shape'], list) or len(config_data['images']['shape']) != 2:
                errors.append('images.shape must be an array of 2 integers [width, height]')

        # Validate classes
        if 'classes' in config_data:
            if not isinstance(config_data['classes'], list):
                errors.append('classes must be an array')
            elif len(config_data['classes']) == 0:
                errors.append('At least one class is required')
            else:
                for i, class_item in enumerate(config_data['classes']):
                    if 'name' not in class_item:
                        errors.append(f'Class {i}: name is required')
                    if 'colour' not in class_item:
                        errors.append(f'Class {i}: colour is required')
                    elif not isinstance(class_item['colour'], list) or len(class_item['colour']) != 4:
                        errors.append(f'Class {i}: colour must be an array of 4 integers (RGBA)')
                    else:
                        for j, val in enumerate(class_item['colour']):
                            if not isinstance(val, int) or val < 0 or val > 255:
                                errors.append(f'Class {i}: colour[{j}] must be an integer between 0 and 255')

                    if 'user_colour' in class_item:
                        user_colour = class_item['user_colour']
                        if not isinstance(user_colour, list) or len(user_colour) != 4:
                            errors.append(f'Class {i}: user_colour must be an array of 4 integers (RGBA)')

        # Validate views
        if 'views' in config_data:
            if not isinstance(config_data['views'], dict):
                errors.append('views must be an object')
            elif len(config_data['views']) == 0:
                errors.append('At least one view is required')
            else:
                for view_name, view_data in config_data['views'].items():
                    if 'type' not in view_data:
                        errors.append(f'View {view_name}: type is required')
                    elif view_data['type'] not in ['image', 'bingmap']:
                        errors.append(f'View {view_name}: type must be "image" or "bingmap"')

                    if view_data.get('type') == 'image' and 'data' not in view_data:
                        errors.append(f'View {view_name}: data is required for image views')

                    if view_data.get('type') == 'bingmap' and 'data' in view_data:
                        warnings.append(f'View {view_name}: data field is not used for bingmap views')

        # Validate view_groups
        if 'view_groups' in config_data:
            if not isinstance(config_data['view_groups'], dict):
                errors.append('view_groups must be an object')
            else:
                available_views = list(config_data.get('views', {}).keys())
                for group_name, view_list in config_data['view_groups'].items():
                    if not isinstance(view_list, list):
                        errors.append(f'View group {group_name}: must be an array of view names')
                    else:
                        for view_ref in view_list:
                            if view_ref not in available_views:
                                errors.append(f'View group {group_name}: references non-existent view "{view_ref}"')

        # Validate segmentation
        if 'segmentation' in config_data:
            seg = config_data['segmentation']

            if 'path' not in seg:
                errors.append('segmentation.path is required')

            if 'mask_area' in seg and seg['mask_area'] is not None:
                mask_area = seg['mask_area']
                if not isinstance(mask_area, list) or len(mask_area) != 4:
                    errors.append('segmentation.mask_area must be an array of 4 integers or null')

            if 'ai_model' in seg and seg['ai_model'] is not False and not isinstance(seg['ai_model'], dict):
                errors.append('segmentation.ai_model must be an object or false')

        # Validate port
        if 'port' in config_data:
            port = config_data['port']
            if not isinstance(port, int) or port < 0 or port > 65535:
                errors.append('port must be an integer between 0 and 65535')

        is_valid = len(errors) == 0

        return flask.jsonify({
            'valid': is_valid,
            'errors': errors,
            'warnings': warnings
        }), 200

    except Exception as e:
        return flask.jsonify({
            'error': 'Validation failed',
            'message': str(e)
        }), 500
