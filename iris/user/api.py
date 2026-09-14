"""
JSON API endpoints for user interface.

Provides REST API endpoints that return JSON data for the React frontend.
"""

import flask
from sqlalchemy import func

from iris import db
from iris.models import Action, User
from iris.user import requires_auth

api_bp = flask.Blueprint("user_api", __name__, url_prefix="/user/api")


@api_bp.route("/current", methods=["GET"])
def get_current_user():
    """Get current logged-in user info or null if not authenticated."""
    user_id = flask.session.get("user_id", None)

    if user_id is None:
        return flask.jsonify({"user": None})

    # Use SQLAlchemy 2.0 compatible API
    user = db.session.get(User, user_id)
    if user is None:
        return flask.jsonify({"user": None})

    return flask.jsonify({"user": user.to_json()})


@api_bp.route("/profile/<user_id>", methods=["GET"])
@requires_auth
def get_profile(user_id):
    """Get user profile with segmentation stats and history."""
    current_user_id = flask.session["user_id"]

    # Handle 'current' alias
    if user_id == "current":
        user_id = current_user_id

    # Convert to int if needed
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        return flask.jsonify({"error": "Invalid user ID"}), 400

    # Use SQLAlchemy 2.0 compatible API
    user = db.session.get(User, user_id)
    if user is None:
        return flask.jsonify({"error": "User not found"}), 404

    # Get base user data
    user_data = user.to_json()

    # Calculate rank
    total_score = func.sum(Action.score).label("total_score")
    top_users = (
        db.session.query(User.name, total_score)
        .join(User.actions)
        .filter(Action.type == "segmentation")
        .group_by(User.name)
        .order_by(total_score.desc())
    ).all()

    if top_users:
        usernames, scores = zip(*top_users)
        # Check if user is in the rankings (they may have no segmentation actions yet)
        try:
            user_data["segmentation"]["rank"] = usernames.index(user.name) + 1
        except ValueError:
            # User not in rankings yet (no segmentation actions)
            user_data["segmentation"]["rank"] = None
    else:
        user_data["segmentation"]["rank"] = None

    # Get last masks (configurable limit)
    LAST_MASKS_LIMIT = 10
    last_masks = (
        Action.query.filter_by(user=user, type="segmentation")
        .order_by(Action.last_modification.desc())
        .limit(LAST_MASKS_LIMIT)
        .all()
    )

    user_data["segmentation"]["last_masks"] = [
        {
            "image_id": mask.image_id,
            "score": mask.score,
            "score_unverified": mask.unverified,
            "last_modification": mask.last_modification.strftime("%Y-%m-%d %H:%M:%S"),
            "time_spent": str(mask.time_spent).split(".")[0],  # Remove microseconds
        }
        for mask in last_masks
    ]

    # Add flag to indicate if this is the current user
    user_data["is_current_user"] = user_id == current_user_id

    return flask.jsonify(user_data)


@api_bp.route("/change-password", methods=["POST"])
@requires_auth
def change_password():
    """Allow user to change their own password."""
    import json

    current_user_id = flask.session["user_id"]
    user = db.session.get(User, current_user_id)

    if user is None:
        return flask.jsonify({"error": "User not found"}), 404

    data = json.loads(flask.request.data)
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")

    # Validate current password
    if not current_password:
        return flask.jsonify({"error": "Current password is required"}), 400

    if not user.check_password(current_password):
        return flask.jsonify({"error": "Current password is incorrect"}), 403

    # Validate new password
    if not new_password:
        return flask.jsonify({"error": "New password is required"}), 400

    if len(new_password) < 4:
        return flask.jsonify({"error": "New password must be at least 4 characters"}), 400

    if len(new_password) > 64:
        return flask.jsonify({"error": "New password is too long (max 64 characters)"}), 400

    # Validate password confirmation
    if new_password != confirm_password:
        return flask.jsonify({"error": "New passwords do not match"}), 400

    # Update password
    user.set_password(new_password)
    db.session.add(user)
    db.session.commit()

    return flask.jsonify({"message": "Password changed successfully"})
