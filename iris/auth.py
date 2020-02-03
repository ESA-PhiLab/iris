import json
import random

import flask
from validate_email import validate_email

from iris import db
from iris.models import User, Mask
from iris.project import project

auth_app = flask.Blueprint('auth', __name__)

@auth_app.route('/')
def index():
    pass

@auth_app.route('/current_user')
def current_user():
    user_id = flask.session.get('user_id', None)

    if user_id is None:
        return flask.make_response('Not logged in!', 403)

    user = User.query.get(user_id)
    if user is None:
        return flask.make_response('Not logged in!', 403)

    json_user = user.to_json()
    del json_user['password_hash']

    if project.segmentation:
        json_user['segmentation'] = {
            'score': 0,
            'score_pending': 0,
        }
        masks = Mask.query.filter_by(creator=user).all()
        json_user['segmentation']['n_masks'] = len(masks)
        for mask in masks:
            if mask.score_pending:
                json_user['segmentation']['score_pending'] += mask.score
            else:
                json_user['segmentation']['score'] += mask.score

    return flask.jsonify(json_user)

@auth_app.route('/register', methods=['POST'])
def register():
    if flask.request.method != 'POST':
        return flask.make_response('Invalid request!', 400)

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


@auth_app.route('/login', methods=['GET', 'POST'])
def login():
    if flask.request.method != 'POST':
        return flask.render_template('login.html');

    data = json.loads(flask.request.data)

    if not (data.get('username', False) and data.get('password', False)):
        return flask.make_response('Username and password are required fields!', 400)

    user = User.query.filter(User.name == data['username']).first()

    if user is None or not user.check_password(data['password']):
        return flask.make_response("Username or password are incorrect!", 403)

    set_current_user(user)

    return flask.make_response("Successful login!")

@auth_app.route('/logout')
def logout():
    # remove the username from the session if it's there
    flask.session.pop('user_id')

    return flask.make_response("Successful logout!")

def set_current_user(user):
    flask.session['user_id'] = user.id

    project.set_user_id(user.id)

    # Each user gets their personal random image selection:
    project.set_image_seed(user.image_seed)
