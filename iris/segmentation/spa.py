"""
Segmentation page.

The page is the React app built by Vite (static/dist/index.html). The server
only picks the image to open when the address does not name one.
"""
from os.path import dirname, join

import flask

from iris.project import project

spa_bp = flask.Blueprint(
    'segmentation_spa', __name__,
    url_prefix='/segmentation'
)

# Where Vite builds the pages
DIST = join(dirname(dirname(__file__)), 'static', 'dist')


def start_image_id():
    """Image the user worked on last, else the first of the project"""
    user_id = flask.session.get('user_id', None)
    if user_id:
        from iris.models import Action
        last_mask = Action.query \
            .filter_by(user_id=user_id) \
            .order_by(Action.last_modification.desc()) \
            .first()
        if last_mask is not None:
            return last_mask.image_id
    return project.get_start_image_id()


@spa_bp.route('/', methods=['GET'])
def segmentation_spa():
    """Serve the segmentation page for an image."""
    image_id = flask.request.args.get('image_id', None)

    if image_id is None:
        return flask.redirect(
            flask.url_for('segmentation_spa.segmentation_spa', image_id=start_image_id())
        )
    if image_id not in project.image_ids:
        return flask.make_response('Unknown image id!', 404)

    return flask.send_from_directory(DIST, 'index.html', max_age=0)
