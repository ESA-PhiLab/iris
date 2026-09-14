"""
Admin module - organized into separate blueprints for different endpoint types.

Structure:
- spa.py: React SPA routes (/admin/, /admin/users, etc.)
- api.py: JSON API endpoints (/admin/api/*)
"""
import flask

from .api import api_bp
from .spa import spa_bp

# Main admin blueprint for template/static file serving
admin_app = flask.Blueprint(
    'admin', __name__,
    template_folder='templates',
    static_folder='static'
)

def register_admin_blueprints(app):
    """Register all admin blueprints with the Flask app."""
    app.register_blueprint(admin_app)
    app.register_blueprint(spa_bp)
    app.register_blueprint(api_bp)
