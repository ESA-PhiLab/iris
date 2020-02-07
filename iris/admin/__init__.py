import flask

from iris.auth import requires_auth
from iris.models import db, Image, Mask, User
from iris.project import project

admin_app = flask.Blueprint(
    'admin', __name__,
    template_folder='templates',
    static_folder='static'
)

@admin_app.route('/', methods=['GET'])
def index():
    user_id = flask.session.get('user_id', None)

    if user_id is None:
        return flask.render_template('admin/index.html', user=None)

    user = User.query.get(user_id)
    if user is None:
        return flask.render_template('admin/index.html', user=None)

    return flask.render_template('admin/index.html', user=user.to_json())

@admin_app.route('/users', methods=['GET'])
@requires_auth
def users():
    users = User.query.all()
    users_json = [
        {**user.to_json(), 'segmentation': user.get_segmentation_details()}
        for user in users
    ]

    return flask.render_template('admin/users.html', users=users_json)

@admin_app.route('/segmentation', methods=['GET'])
@requires_auth
def masks():
    masks = Mask.query.all()
    masks_json = [
        {**mask.to_json(), 'username': mask.creator.name}
        for mask in masks
    ]

    return flask.render_template('admin/segmentation.html', masks=masks_json)

@admin_app.route('/images', methods=['GET'])
@requires_auth
def images():
    images = Image.query.all()
    images_json = [
        {**image.to_json(),
        'n_segmentation_masks': Mask.query.filter_by(image=image).count()}
        for image in images
    ]

    return flask.render_template('admin/images.html', images=images_json)
