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
        dirname(dirname(__file__)), "demo", "cloud-segmentation.json"
    )

    return demo_file

def parse_cmd_line():
    # Parse the command line
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "mode", type=str,
        help="Specify the mode you want to start iris, can be either *segmentation* or *demo*."
    )
    parser.add_argument(
        "project", type=str, nargs='?',
        help="Path to the project configurations file (yaml or json)."
    )
    parser.add_argument(
        "-d", "--debug", action="store_true",
        help="start the app in debug mode"
    )
    args = parser.parse_args()

    if args.mode == "demo":
        args.project = get_demo_file()
    elif args.mode == "label":
        if not args.project:
            raise Exception("Label mode require a project file!")
    else:
        raise Exception(f"Unknown mode '{mode}'!")

    return vars(args)

def run_app():
    # webbrowser.open('http://localhost:5000/segmentation')
    app.run(debug=True)

def create_app(project_file):
    project.load_from(project_file)

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

    if app.config['TESTING']:
        password = '1234'
    else:
        print('Welcome to IRIS! No admin user was detected so please enter a new admin password.')
        password_again = None
        password = getpass('New admin password: ')
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
    app.register_blueprint(main_app, url_prefix="/")
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
    args = {}
    args['project'] = get_demo_file()

app, db = create_app(args['project'])
from iris.models import Image, User, Action

db.create_all()
db.session.commit()

create_default_admin(app, db)
register_extensions(app)


if __name__ == '__main__':
    run_app()
