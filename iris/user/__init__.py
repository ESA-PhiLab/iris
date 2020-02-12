from functools import wraps
import json
import random

import flask
from sqlalchemy import func
from validate_email import validate_email

from iris import db
from iris.models import Action, User
from iris.project import project

user_app = flask.Blueprint(
    'user', __name__,
    template_folder='templates',
    static_folder='static'
)

@user_app.route('/')
def index():
    pass

def requires_auth(func):
    @wraps(func)
    def decorated(*args, **kwargs):
        user_id = flask.session.get('user_id', None)

        if user_id is None:
            return flask.make_response('Not logged in!', 403)

        user = User.query.get(user_id)
        if user is None:
            return flask.make_response('Not logged in!', 403)
        return func(*args, **kwargs)
    return decorated

def requires_admin(func):
    @wraps(func)
    def decorated(*args, **kwargs):
        user_id = flask.session.get('user_id', None)

        if user_id is None:
            return flask.make_response('Not logged in!', 403)

        user = User.query.get(user_id)
        if user is None:
            return flask.make_response('Not logged in!', 403)

        if not user.admin:
            return flask.make_response('The user has no admin rights!', 403)
        return func(*args, **kwargs)
    return decorated

@user_app.route('/get/<user_id>', methods=['GET'])
@requires_auth
def get(user_id):
    if user_id == 'current':
        user_id = flask.session['user_id']

    user = User.query.get(user_id)
    if user is None:
        flask.make_response('Unknown user!', 404)

    json_user = user.to_json()

    current_user_id = flask.session['user_id']
    if current_user_id == user_id or User.query.get(current_user_id).admin:
        # Only an admin or the user themselves can see other's user data:
        return json_user
    else:
        del json_user['email']
        return json_user

@user_app.route('/show/<user_id>', methods=['GET'])
@requires_auth
def show(user_id):
    if user_id == 'current':
        user_id = flask.session['user_id']

    user = User.query.get(user_id)
    if user is None:
        return flask.make_response('Unknown user id!', 404)
    user_json = user.to_json()

    total_score = func.sum(Action.score).label("total_score")
    top_users = (db.session.query(User.name, total_score)
        .join(User.actions)
        .filter(Action.type=="segmentation")
        .group_by(User.name)
        .order_by(total_score.desc())
    ).all()

    usernames, scores = zip(*top_users)

    user_json['segmentation']['rank'] = usernames.index(user.name) + 1

    current_user_id = flask.session['user_id']
    if current_user_id == user_id:
        return flask.render_template(
            'user/show.html', user=user_json,
            current_user=user_json
        )
    else:
        current_user = User.query.get(current_user_id)

        return flask.render_template(
            'user/show.html', user=user_json,
            current_user=current_user.to_json()
        )

@user_app.route('/register', methods=['POST'])
def register():
    data = json.loads(flask.request.data)
    if len(data['username']) > 64:
        return flask.make_response('Username is too long!', 400)
    if not data['username']:
        return flask.make_response('Username is a required field!', 400)
    if User.query.filter(User.name == data['username']).first() is not None:
        return flask.make_response('Username already exists!', 400)
    if data.get("email", False):
        if len(data['email']) > 128:
            return flask.make_response('E-mail address is too long!', 400)
        if User.query.filter(User.email == data['email']).first() is not None:
            return flask.make_response('E-mail already exists!', 400)
    if not data['password']:
        return flask.make_response('Password is a required field!', 400)
    if len(data['password']) > 64:
        return flask.make_response('Password is too long!', 400)

    new_user = User(
        name=data['username'],
        email=data['email'],
        admin=False,
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()

    set_current_user(new_user)

    return flask.make_response(f"{new_user} successfully created!")

@user_app.route('/login', methods=['POST'])
def login():
    data = json.loads(flask.request.data)

    if not (data.get('username', False) and data.get('password', False)):
        return flask.make_response('Username and password are required fields!', 400)

    user = User.query.filter(User.name == data['username']).first()

    if user is None or not user.check_password(data['password']):
        return flask.make_response("Username or password are incorrect!", 403)

    set_current_user(user)

    return flask.make_response("Successful login!")

@user_app.route('/logout')
def logout():
    # remove the username from the session if it's there
    if 'user_id' in flask.session:
        flask.session.pop('user_id')
    project.set_user_id(None)

    return flask.make_response("Successful logout!")

def set_current_user(user):
    flask.session['user_id'] = user.id

    project.set_user_id(user.id)

    # Each user gets their personal random image selection:
    project.set_image_seed(user.image_seed)
