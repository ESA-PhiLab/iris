import json

import flask

from iris.project import project

help_app = flask.Blueprint(
    'help', __name__,
    template_folder='templates',
    static_folder='static'
)

@help_app.route('/', methods=['POST'])
def index():
    data = json.loads(flask.request.data)

    return flask.render_template(
        'help.html',
        hotkeys=data.get('hotkeys', False),
        page=data.get('page', False),
        page_content=flask.Markup(flask.render_template(data['page_content']))
    )
