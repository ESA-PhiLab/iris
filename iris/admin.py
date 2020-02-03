import flask

admin_app = flask.Blueprint('admin', __name__)

@admin_app.route('/')
def index():
    pass
