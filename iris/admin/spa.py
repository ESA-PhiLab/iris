"""
React SPA routes for admin interface.

Handles all main admin routes that serve the React Single Page Application.
"""
import flask

from iris.models import User

spa_bp = flask.Blueprint(
    'admin_spa', __name__,
    url_prefix='/admin'
)


@spa_bp.route('/users', methods=['GET'])
@spa_bp.route('/actions/<type>', methods=['GET'])
@spa_bp.route('/images', methods=['GET'])
@spa_bp.route('/password-resets', methods=['GET'])
@spa_bp.route('/', methods=['GET'])
def admin_spa(type=None):
    """Serve React SPA for all admin routes."""
    try:
        user_id = flask.session.get('user_id', None)

        print(f"🚀 DEBUG: Admin SPA - user_id in session: {user_id}")

        if user_id is None:
            print("🚀 DEBUG: No user logged in, redirecting to segmentation login")
            return flask.redirect('/segmentation/')

        user = User.query.get(user_id)
        if user is None:
            print("🚀 DEBUG: User not found in database, redirecting to segmentation login")
            # Clear invalid session
            flask.session.pop('user_id', None)
            return flask.redirect('/segmentation/')

        if not user.admin:
            print(f"🚀 DEBUG: User {user.name} is not admin, redirecting to segmentation")
            return flask.redirect('/segmentation/')

        print(f"🚀 DEBUG: Rendering React Admin SPA for admin user: {user.name}")

        # Render the React SPA
        return flask.render_template('admin/react-app.html', user=user)

    except Exception as e:
        print(f"🚨 ERROR in admin_spa: {str(e)}")
        import traceback
        traceback.print_exc()
        return flask.make_response(f"Error: {str(e)}", 500)
