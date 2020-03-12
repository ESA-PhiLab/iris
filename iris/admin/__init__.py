from collections import defaultdict
from datetime import timedelta

import flask
from sqlalchemy import func

from iris.user import requires_admin, requires_auth
from iris.models import db, Action, User
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

    return flask.redirect(flask.url_for('admin.users'))

@admin_app.route('/users', methods=['GET'])
@requires_auth
def users():
    user = User.query.get(flask.session.get('user_id'))

    order_by = flask.request.args.get('order_by', 'id')
    ascending = flask.request.args.get('ascending', 'true')
    ascending = True if ascending == 'true' else False

    users = User.query
    if ascending:
        users = users.order_by(getattr(User, order_by)).all()
    else:
        users = users.order_by(getattr(User, order_by).desc()).all()

    users_json = [user.to_json() for user in users]

    html = flask.render_template('admin/users.html', users=users_json, order_by=order_by, ascending=ascending)
    return flask.render_template('admin/index.html', user=user, page=flask.Markup(html))

@admin_app.route('/actions/<type>', methods=['GET'])
@requires_auth
def actions(type):
    user = User.query.get(flask.session.get('user_id'))

    order_by = flask.request.args.get('order_by', 'user_id')
    ascending = flask.request.args.get('ascending', 'true')
    ascending = True if ascending == 'true' else False

    actions = Action.query.filter_by(type=type)
    if ascending:
        actions = actions.order_by(getattr(Action, order_by)).all()
    else:
        actions = actions.order_by(getattr(Action, order_by).desc()).all()

    actions_json = [
        {**action.to_json(), 'username': action.user.name}
        for action in actions
    ]
    image_stats = {
        "processed": len(set(action.image_id for action in actions)),
        "total": len(project.image_ids)
    }

    html = flask.render_template(
        'admin/actions.html', action_type=type, actions=actions_json,
        image_stats=image_stats, order_by=order_by, ascending=ascending
    )
    return flask.render_template('admin/index.html', user=user, page=flask.Markup(html))

@admin_app.route('/images', methods=['GET'])
@requires_auth
def images():
    user = User.query.get(flask.session.get('user_id'))

    order_by = flask.request.args.get('order_by', 'user_id')
    ascending = flask.request.args.get('ascending', 'true')
    ascending = True if ascending == 'true' else False

    # TODO: make this more performant by using less database calls
    images = defaultdict(dict)
    actions = Action.query.all();
    default_stats = {
        'score': 0,
        'count': 0,
        'difficulty': 0,
        'time_spent': timedelta(),
    }
    for image_id in project.image_ids:
        for action in actions:
            if action.image_id != image_id:
                continue

            if action.type not in images[image_id]:
                images[image_id][action.type] = default_stats.copy()

            images[image_id][action.type]['count'] += 1
            images[image_id][action.type]['score'] += action.score
            images[image_id][action.type]['difficulty'] += action.difficulty
            images[image_id][action.type]['time_spent'] += action.time_spent

        # Calculate the average values:
        for stats in images[image_id].values():
            stats['score'] /= stats['count']
            stats['difficulty'] /= stats['count']
            stats['time_spent'] /= stats['count']
            stats['time_spent'] = stats['time_spent'].total_seconds() / 3600.

    html = flask.render_template(
        'admin/images.html', images=images, order_by=order_by, ascending=ascending
    )
    return flask.render_template('admin/index.html', user=user, page=flask.Markup(html))
