import argparse
import json
from getpass import getpass
from os.path import basename, dirname, exists, isabs, join
import os
import sys
import webbrowser

import flask
from flask_sqlalchemy import SQLAlchemy
import numpy as np
import yaml

import iris.extensions
from iris.project import project

def get_demo_file(example=None):
    demo_file = join(
        os.getcwd(), "demo", "cloud-segmentation.json"
    )

    return demo_file

def parse_cmd_line():
    # Parse the command line
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "mode", type=str,
        help="Specify the mode you want to start iris, can be either *label* or *demo*."
    )
    parser.add_argument(
        "project", type=str, nargs='?',
        help="Path to the project configurations file (yaml or json)."
    )
    parser.add_argument(
        "-d", "--debug", action="store_true",
        help="start the app in debug mode"
    )
    parser.add_argument(
        "-p","--production", action="store_true"
        help="Use production WSGI server")
    args = parser.parse_args()

    if args.mode == "demo":
        args.project = get_demo_file()
    elif args.mode == "label":
        if not args.project:
            raise Exception("Label mode require a project file!")
    else:
        raise Exception(f"Unknown mode '{args.mode}'!")

    return vars(args)

def run_app():
    create_default_admin(app, db)
    if args['production']:
        import gevent.pywsgi
        app_server = gevent.pywsgi.WSGIServer((project['host'], project['port']), app)
        print('IRIS is being served in production mode at http://{}:{}'.format(project['host'], project['port']))
        app_server.serve_forever()
    else:
        app.run(debug=project.debug, host=project['host'], port=project['port'])

def create_app(project_file, args):
    project.load_from(project_file)
    project.debug = args['debug']

    # Create the flask app:
    app = flask.Flask(__name__)
    # app.config['TESTING'] = True
    app.config['EXPLAIN_TEMPLATE_LOADING'] = True

    # We need this secret key to encrypt cookies
    app.secret_key = os.urandom(16)

    # Database stuff:
    app.config['SQLALCHEMY_DATABASE_URI'] = \
        'sqlite:///' + join(project['path'], 'iris.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = True
    db = SQLAlchemy(app)

    return app, db

def create_default_admin(app, db):
    # Add a default admin account:
    admin = User.query.filter_by(name='admin').first()
    if admin is not None:
        return

    print('Welcome to IRIS! No admin user was detected so please enter a new admin password.')
    password_again = None
    password_valid = False
    while not password_valid:
        password = getpass('New admin password: ')
        if password=='' or ' ' in password:
            print('Password cannot be blank, and must not contain a space.')
        else:
            password_valid = True

    while password != password_again:
        password_again = getpass('Retype admin password: ')

    admin = User(
        name='admin',
        admin=True,
    )
    admin.set_password(password)
    db.session.add(admin)
    db.session.commit()

def register_extensions(app):
    # Reduce the amount of transferred data by compressing it:
    iris.extensions.Compress(app)
    app.config['COMPRESS_MIMETYPES'] = [
        'text/html', 'text/css', 'text/xml',
        'application/json', 'application/octet-stream',
        'application/javascript'
    ]

    from iris.main import main_app
    app.register_blueprint(main_app)
    from iris.segmentation import segmentation_app
    app.register_blueprint(segmentation_app, url_prefix="/segmentation")
    from iris.admin import admin_app
    app.register_blueprint(admin_app, url_prefix="/admin")
    from iris.help import help_app
    app.register_blueprint(help_app, url_prefix="/help")
    from iris.user import user_app
    app.register_blueprint(user_app, url_prefix="/user")

if len(sys.argv) > 1:
    args = parse_cmd_line()
else:
    args['project'] = get_demo_file()

app, db = create_app(args['project'], args)
from iris.models import User, Action

db.create_all()
db.session.commit()

register_extensions(app)


if __name__ == '__main__':
    run_app()
