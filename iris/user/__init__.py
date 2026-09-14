import json
from functools import wraps

import flask

from iris import db
from iris.models import User
from iris.project import project

user_app = flask.Blueprint("user", __name__, template_folder="templates", static_folder="static")


def register_user_api(app):
    """Register user API blueprint."""
    from iris.user.api import api_bp

    app.register_blueprint(api_bp)


@user_app.route("/")
def index():
    pass


def requires_auth(func):
    @wraps(func)
    def decorated(*args, **kwargs):
        user_id = flask.session.get("user_id", None)

        if user_id is None:
            return flask.make_response("Not logged in!", 403)

        user = User.query.get(user_id)
        if user is None:
            return flask.make_response("Not logged in!", 403)
        return func(*args, **kwargs)

    return decorated


def requires_admin(func):
    @wraps(func)
    def decorated(*args, **kwargs):
        user_id = flask.session.get("user_id", None)

        if user_id is None:
            return flask.make_response("Not logged in!", 403)

        user = User.query.get(user_id)
        if user is None:
            return flask.make_response("Not logged in!", 403)

        if not user.admin:
            return flask.make_response("The user has no admin rights!", 403)
        return func(*args, **kwargs)

    return decorated


@user_app.route("/get/<user_id>", methods=["GET"])
@requires_auth
def get(user_id):
    if user_id == "current":
        user_id = flask.session["user_id"]
    user = User.query.get_or_404(user_id)

    json_user = user.to_json()

    current_user_id = flask.session["user_id"]
    if current_user_id == user_id or User.query.get(current_user_id).admin:
        # Only an admin or the user themselves can see the full data:
        json_user["config"] = project.get_user_config(user_id)
    return flask.jsonify(json_user)


@user_app.route("/set/<user_id>", methods=["POST"])
@requires_auth
def set(user_id):
    if user_id == "current":
        user_id = flask.session["user_id"]

    current_user_id = flask.session["user_id"]
    current_user = User.query.get(current_user_id)
    if current_user_id != user_id and not current_user.admin:
        return flask.make_response("Permission denied!", 403)

    user = User.query.get_or_404(user_id)

    for k, v in json.loads(flask.request.data).items():
        if k == "admin":
            # Only existing admins can modify admin privileges
            if not current_user.admin:
                return flask.make_response("Only administrators can modify admin privileges!", 403)
            user.admin = bool(v)
        else:
            return flask.make_response(f"Unknown parameter <i>{k}</i>!", 400)

    db.session.add(user)
    db.session.commit()

    return flask.make_response("Saved new user info successfully")


@user_app.route("/save_config", methods=["POST"])
@requires_auth
def save_config():
    user_config = json.loads(flask.request.data)
    project.save_user_config(flask.session["user_id"], user_config)
    return flask.make_response("Saved user config successfully!")


@user_app.route("/register", methods=["POST"])
def register():
    import re

    data = json.loads(flask.request.data)
    if len(data["username"]) > 64:
        return flask.make_response("Username is too long!", 400)
    if not data["username"]:
        return flask.make_response("Username is a required field!", 400)
    if User.query.filter(User.name == data["username"]).first() is not None:
        return flask.make_response("Username already exists!", 400)

    if not data["password"]:
        return flask.make_response("Password is a required field!", 400)
    if len(data["password"]) > 64:
        return flask.make_response("Password is too long!", 400)

    # Email validation (required for new users)
    email = data.get("email", "").strip()
    if not email:
        return flask.make_response("Email is a required field!", 400)

    # Simple email regex validation
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_pattern, email):
        return flask.make_response("Invalid email format!", 400)

    if len(email) > 256:
        return flask.make_response("Email is too long!", 400)

    # Check if this is the first user - if no admin exists, make this user an admin
    existing_admin = User.query.filter_by(admin=True).first()
    is_first_admin = existing_admin is None

    new_user = User(
        name=data["username"],
        email=email,
        admin=is_first_admin,
    )
    new_user.set_password(data["password"])
    db.session.add(new_user)
    db.session.commit()

    set_current_user(new_user)

    if is_first_admin:
        return flask.make_response(f"{new_user} successfully created as the first administrator!")
    else:
        return flask.make_response(f"{new_user} successfully created!")


@user_app.route("/login", methods=["POST"])
def login():
    data = json.loads(flask.request.data)

    if not (data.get("username", False) and data.get("password", False)):
        return flask.make_response("Username and password are required fields!", 400)

    user = User.query.filter(User.name == data["username"]).first()

    if user is None or not user.check_password(data["password"]):
        return flask.make_response("Username or password are incorrect!", 403)

    set_current_user(user)

    return flask.make_response("Successful login!")


@user_app.route("/logout")
def logout():
    # remove the username from the session if it's there
    if "user_id" in flask.session:
        flask.session.pop("user_id")

    return flask.make_response("Successful logout!")


@user_app.route("/request-password-reset", methods=["POST"])
def request_password_reset():
    """User requests a password reset by providing their username."""
    from iris.models import PasswordResetRequest

    data = json.loads(flask.request.data)
    username = data.get("username", "").strip()

    if not username:
        return flask.make_response("Username is required!", 400)

    user = User.query.filter(User.name == username).first()
    if user is None:
        return flask.make_response("User not found!", 404)

    if not user.email:
        return flask.make_response(
            "This user has no email address on file. Please contact an administrator directly.", 400
        )

    # Check if there's already a pending request
    existing_request = PasswordResetRequest.query.filter_by(user_id=user.id, resolved=False).first()

    if existing_request:
        return flask.make_response("A password reset request is already pending for this user.", 400)

    # Create new password reset request
    reset_request = PasswordResetRequest(user_id=user.id)
    db.session.add(reset_request)
    db.session.commit()

    return flask.make_response(
        "Password reset request submitted successfully! An administrator will process your request."
    )


def set_current_user(user):
    flask.session["user_id"] = user.id
