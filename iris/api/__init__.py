"""
IRIS API Module

This module provides REST API endpoints for the IRIS application,
enabling React frontend communication through JSON responses.
"""

import flask

from iris.api.routes.config import config_bp

__all__ = ['create_api_blueprint', 'register_api_error_handlers']

def create_api_blueprint():
    """Create and configure the main API blueprint"""
    api_bp = flask.Blueprint('api', __name__, url_prefix='/api')

    # Health check endpoint
    @api_bp.route('/health')
    def health_check():
        """Health check endpoint for monitoring and load balancers"""
        try:
            # Basic health checks
            from iris.extensions import db

            # Check database connection
            db.session.execute('SELECT 1')

            # Check if React build exists (in production)
            import os
            react_build_exists = True
            if flask.current_app.config.get('SERVE_REACT_FRONTEND'):
                build_dir = flask.current_app.config.get('REACT_BUILD_DIR')
                if build_dir:
                    react_build_exists = os.path.exists(os.path.join(build_dir, 'index.html'))

            return flask.jsonify({
                'status': 'healthy',
                'timestamp': flask.g.get('request_start_time', 0),
                'version': '1.0.0',
                'database': 'connected',
                'frontend': 'available' if react_build_exists else 'not_built',
                'environment': flask.current_app.config.get('FLASK_ENV', 'unknown')
            }), 200

        except Exception as e:
            flask.current_app.logger.error(f"Health check failed: {e}")
            return flask.jsonify({
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': flask.g.get('request_start_time', 0)
            }), 503

    # Register sub-blueprints
    api_bp.register_blueprint(config_bp, url_prefix='/config')

    return api_bp

# API error handlers
def register_api_error_handlers(app):
    """Register API-specific error handlers"""

    @app.errorhandler(400)
    def bad_request(error):
        return flask.jsonify({
            'error': 'Bad Request',
            'message': str(error.description) if hasattr(error, 'description') else str(error),
            'status': 400
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return flask.jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication required',
            'status': 401
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        return flask.jsonify({
            'error': 'Forbidden',
            'message': 'Insufficient permissions',
            'status': 403
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        return flask.jsonify({
            'error': 'Not Found',
            'message': 'Resource not found',
            'status': 404
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return flask.jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status': 500
        }), 500
