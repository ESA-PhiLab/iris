import io
import json

import flask
import numpy as np
from PIL import Image as PILImage
from skimage.transform import resize

from iris.models import db, Action
from iris.project import project
from iris.user import requires_auth

main_app = flask.Blueprint(
    'main', __name__,
    template_folder='templates',
    static_folder='static'
)

@main_app.route('/')
def index():
    return flask.redirect(
        flask.url_for('segmentation.index')
    )

@main_app.route('/image/<image_id>/<view>')
def image(image_id, view):
    image = project.render_image(image_id, project['views'][view])
    return array_to_png(image)

@main_app.route('/image_info/<image_id>')
@requires_auth
def image_info(image_id):
    user_id = flask.session['user_id']

    actions = Action.query.filter_by(image_id=image_id).all()
    # Sort actions by type:
    actions = {
        type: list(filter(lambda a: a.type == type, actions))
        for type in ['segmentation', 'classification', 'detection']
    }

    data = {}
    for type, t_actions in actions.items():
        data[type] = {
            'count': len(t_actions),
            'current_user_score': None
        }
        for t_action in t_actions:
            if t_action.user_id == user_id:
                data[type]['current_user_score'] = t_action.score
                data[type]['current_user_score_unverified'] = t_action.unverified
                break

    data['id'] = image_id
    return flask.jsonify(data)

@main_app.route('/get_action_info/<image_id>/<action_type>')
@requires_auth
def get_action_info(image_id, action_type):
    user_id = flask.session['user_id'];

    action = Action.query.filter_by(image_id=image_id, user_id=user_id, type=action_type).first_or_404()

    return flask.jsonify(action.to_json())

@main_app.route('/set_action_info/<action_id>', methods=['POST'])
@requires_auth
def set_action_info(action_id):
    action = Action.query.get_or_404(action_id);

    for k, v in json.loads(flask.request.data).items():
        if k == "difficulty":
            action.difficulty = int(v)
        elif k == "notes":
            action.notes = v
        elif k == "complete":
            action.complete = bool(v)
        else:
            return flask.make_response(f"Unknown parameter <i>{k}</i>!", 400)

    db.session.add(action)
    db.session.commit()

    return flask.make_response("Saved new action info successfully")

@main_app.route('/metadata/<image_id>', methods=['GET'])
def metadata(image_id):
    metadata = project.get_metadata(image_id)

    if not metadata:
        return flask.make_response("No metadata found!", 404)

    if flask.request.args.get('safe_html', False):
        metadata = {
            k: flask.Markup(str(v))
            for k, v in metadata.items()
        }

    return flask.jsonify(metadata)

@main_app.route('/thumbnail/<image_id>', methods=['GET'])
def thumbnail(image_id):
    size = flask.request.args.get("size", None)
    array = project.get_thumbnail(image_id)

    if size is not None:
        print(size, tuple(size.split("x")))
        size = map(int, size.split("x"))
        array = resize(array, size)

    return array_to_png(array)

def array_to_png(array):
    if issubclass(array.dtype.type, np.floating):
        array = np.clip(array * 255., 0, 255).astype('uint8')

    img = PILImage.fromarray(array) # convert arr to image
    file_object = io.BytesIO()   # create file in memory
    img.save(file_object, 'PNG') # save PNG in file in memory
    file_object.seek(0)          # move to beginning of file
    return flask.send_file(file_object,  mimetype='image/png')
