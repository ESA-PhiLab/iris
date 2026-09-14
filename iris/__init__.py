import json
import os
import shutil
from getpass import getpass
from os.path import join
from pathlib import Path
from typing import Union

import flask

__version__ = "1.0.0"

from iris.extensions import compress, db
from iris.project import project


def get_demo_file(example=None):
    demo_file = join(
        os.getcwd(), "demo", "cloud-segmentation.json"
    )

    return demo_file

def find_config_file(folder_path: Union[str, Path]) -> Union[Path, None]:
    """Find a suitable config file in the given folder.

    Args:
        folder_path: Path to the folder to search in

    Returns:
        Absolute path to config file as Path object, or None if not found.
        Prefers 'cloud-segmentation.json', falls back to any .json file.
    """
    folder = Path(folder_path)

    # First try cloud-segmentation.json
    cloud_seg_path = folder / "cloud-segmentation.json"
    if cloud_seg_path.exists():
        return cloud_seg_path.resolve()

    # If not found, look for any .json file that might be a config
    json_files = list(folder.glob("*.json"))
    if json_files:
        return json_files[0].resolve()

    return None

def handle_launch_command(folder_name: str) -> Path:
    """Handle the launch command - create project if needed and launch it.

    Args:
        folder_name: Name of the project folder to launch or create

    Returns:
        Absolute path to the config file as Path object

    Raises:
        ValueError: If folder_name is empty or None
        FileNotFoundError: If demo folder is missing when creating new project
        RuntimeError: If no suitable config file found or project creation fails
    """
    if not folder_name:
        raise ValueError("Launch command requires a folder name!")

    folder_path = Path.cwd() / folder_name

    if folder_path.exists():
        # Folder exists, find config file
        config_file = find_config_file(folder_path)
        if not config_file:
            raise RuntimeError(
            f"No suitable config file found in '{folder_name}'. "
            "Expected 'cloud-segmentation.json' or another .json config file."
        )
        print(f"Launching existing project '{folder_name}' with config: {config_file.name}")
        return config_file
    else:
        # Folder doesn't exist, create it from demo
        demo_path = Path.cwd() / "demo"
        if not demo_path.exists():
            raise FileNotFoundError("Demo folder not found! Cannot create new project.")

        print(f"Creating new project '{folder_name}' from demo...")
        shutil.copytree(demo_path, folder_path, ignore=shutil.ignore_patterns("cloud-segmentation.iris"))

        config_file_from_demo = folder_path / "cloud-segmentation.json"
        config_file = folder_path / f"{folder_name}.json"
        config_file_from_demo.replace(config_file)
        if config_file_from_demo.exists():
            raise RuntimeError(f"Failed to create project: {config_file_from_demo} not replaced.")
        if not config_file.exists():
            raise RuntimeError(f"Failed to create project: {config_file} not found in copied demo.")

        try:
            dconfig = json.loads(config_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError as err:
            raise RuntimeError(f"Error: Invalid JSON in {config_file}") from err
        dconfig["name"] = folder_name
        with config_file.open("w", encoding="utf-8") as fp:
            json.dump(dconfig, fp, indent=4)

        print(f"Project '{folder_name}' created successfully!")
        return config_file.resolve()


def handle_rm_command(folder_name: str, force: bool = False) -> None:
    """Handle the rm command - remove project folder with confirmation.

    Args:
        folder_name: Name of the project folder to remove
        force: Skip confirmation prompt if True

    Raises:
        ValueError: If folder_name is empty, None, or is 'demo'
        FileNotFoundError: If folder doesn't exist
    """
    if not folder_name:
        raise ValueError("Remove command requires a folder name!")

    if folder_name == "demo":
        raise ValueError("Cannot remove the demo folder!")

    folder_path = Path.cwd() / folder_name

    if not folder_path.exists():
        raise FileNotFoundError(f"Folder '{folder_name}' does not exist.")

    # Ask for confirmation unless force flag is set
    if not force:
        response = input(
            f"Are you sure you want to delete the project folder '{folder_name}'? "
            "This cannot be undone. (y/N): "
        )
        if response.lower() not in ['y', 'yes']:
            print("Deletion cancelled.")
            return

    shutil.rmtree(folder_path)
    print(f"Project folder '{folder_name}' has been deleted.")

# Legacy argparse function removed - now using Typer CLI in iris/cli.py


def start_server(
    project_file: str,
    debug: bool = False,
    production: bool = False,
    admin_user: str = None,
    admin_password: str = None,
):
    """
    Start the IRIS server with the given configuration.

    Args:
        project_file: Path to project configuration file
        debug: Enable debug mode
        production: Use production WSGI server (gevent)
        admin_user: Admin username for non-interactive creation
        admin_password: Admin password for non-interactive creation
    """
    # Create Flask app
    flask_app = create_app(project_file, {'debug': debug})

    # Register all blueprints
    register_extensions(flask_app)

    # Ensure database tables exist for this project's DB file before
    # attempting any queries (e.g. creating default admin). Previously
    # db.create_all() ran at module import time for the demo project only,
    # which caused a race when launching a newly copied project folder:
    # the DB file for the new project didn't exist and queries failed.
    with flask_app.app_context():
        db.create_all()
        db.session.commit()

    # Ensure default admin exists
    create_default_admin(flask_app, admin_user, admin_password)

    # Start server
    if production:
        import gevent.pywsgi
        app_server = gevent.pywsgi.WSGIServer((project['host'], project['port']), flask_app)
        print(f'IRIS is being served in production mode at http://{project["host"]}:{project["port"]}')
        app_server.serve_forever()
    else:
        flask_app.run(debug=project.debug, host=project['host'], port=project['port'])


def run_app():
    """
    Legacy entry point for backward compatibility.
    Now delegates to the modern Typer CLI.
    """
    from iris.cli import main
    main()


# Legacy CLI parsing removed - now using Typer

def create_app(project_file, args):
    project.load_from(project_file)
    project.debug = args['debug']


    # Create the flask app:
    app = flask.Flask(__name__)

    app.config.from_pyfile('config.py')
    app.config['SQLALCHEMY_DATABASE_URI'] = \
        'sqlite:///' + join(project['path'], 'iris.db')

    # Register the extensions:
    db.init_app(app)
    compress.init_app(app)

    return app

def create_default_admin(app, admin_user=None, admin_password=None):
    # Add a default admin account:
    with app.app_context():
        admin = User.query.filter_by(name='admin').first()
    if admin is not None:
        return

    # Non-interactive mode (for CI/testing)
    if admin_user and admin_password:
        print(f'Creating admin user "{admin_user}" non-interactively...')
        admin = User(
            name=admin_user,
            admin=True,
        )
        admin.set_password(admin_password)
        with app.app_context():
            db.session.add(admin)
            db.session.commit()
        print(f'✅ Admin user "{admin_user}" created successfully')
        return

    # Interactive mode (original behavior)
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
    with app.app_context():
        db.session.add(admin)
        db.session.commit()

def register_extensions(app):

    from iris.main import main_app
    app.register_blueprint(main_app)
    from iris.segmentation import register_segmentation_blueprints
    register_segmentation_blueprints(app)
    from iris.admin import register_admin_blueprints
    register_admin_blueprints(app)
    from iris.user import register_user_api, user_app
    app.register_blueprint(user_app, url_prefix="/user")
    register_user_api(app)

    # Register REST API blueprint
    from iris.api import create_api_blueprint
    api_bp = create_api_blueprint()
    app.register_blueprint(api_bp)

# Decide whether to parse CLI args. If help is requested or the first token
# Module-level initialization for when IRIS is imported (not run as CLI)
# This is used by tests and when importing iris as a library
from iris.models import Action, User  # noqa: E402, F401

# Create default app for imports/tests
_default_args = {
    'debug': False,
    'production': False,
}
_default_args['project'] = get_demo_file()

app = create_app(_default_args['project'], _default_args)

with app.app_context():
    db.create_all()
    db.session.commit()

register_extensions(app)


if __name__ == '__main__':
    run_app()
