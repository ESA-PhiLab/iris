import os
import tempfile

import pytest

from iris.models import db


@pytest.fixture(scope='session')
def app():
    """Create a test Flask app with isolated database.

    IMPORTANT: This fixture cannot prevent the module-level code in iris/__init__.py
    from creating the demo database. That happens at import time, before any fixtures run.

    To work around this, we:
    1. Accept that the demo database will be created/modified
    2. Ensure tests use a separate test database
    3. Document that users should restart the IRIS server after running pytest
    """
    from iris import app as iris_app
    from iris.project import project

    # Create a temporary project directory for testing
    test_project_dir = tempfile.mkdtemp(suffix='.iris')
    test_project_db = os.path.join(test_project_dir, 'iris.db')

    # Create user_config subdirectory (needed for user preferences tests)
    os.makedirs(os.path.join(test_project_dir, 'user_config'), exist_ok=True)

    # Configure app for testing with isolated database
    iris_app.config['TESTING'] = True
    iris_app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{test_project_db}'

    # Update the project singleton to use test directory
    # This prevents tests from modifying the demo project files
    original_project_path = project.config.get('path')
    project.config['path'] = test_project_dir

    # push application context for tests that require it
    ctx = iris_app.app_context()
    ctx.push()

    try:
        # Create all tables in the test database
        db.create_all()
        yield iris_app
    finally:
        # Clean up
        db.drop_all()
        ctx.pop()

        # Restore original project path
        if original_project_path:
            project.config['path'] = original_project_path

        # Clean up test project directory
        import shutil
        if os.path.exists(test_project_dir):
            shutil.rmtree(test_project_dir)


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def clean_db(app):
    """Clean database before each test to ensure isolation."""
    with app.app_context():
        # Clear all data before each test
        db.session.remove()
        db.drop_all()
        db.create_all()

        # Ensure user_config directory exists in the project path
        # This is needed for user preferences tests
        from iris.project import project
        user_config_dir = os.path.join(project.config['path'], 'user_config')
        os.makedirs(user_config_dir, exist_ok=True)

        yield
        # Clean up after test
        db.session.remove()


@pytest.fixture
def logged_in_user(app, client):
    """Create a logged-in user for testing authenticated endpoints."""
    import json

    from iris.models import User, db

    with app.app_context():
        # Create a test user
        user = User(id=1, name="test_user", admin=False)
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        # Login the user
        login_response = client.post('/user/login',
            data=json.dumps({'username': 'test_user', 'password': 'password123'}),
            content_type='application/json'
        )
        assert login_response.status_code == 200

        return user


@pytest.fixture
def project_snapshot():
    """Snapshot and restore the global `project` singleton from iris.project.

    Yields a dict containing the saved state. Tests may modify `project` and
    the fixture will restore the original values after the test completes.
    """
    from copy import deepcopy

    from iris.project import project

    # Keys we care about and want to snapshot/restore
    keys = [
        'image_ids', 'image_order', 'file', 'random_state',
        'config', 'debug'
    ]

    saved = {}
    for k in keys:
        saved[k] = deepcopy(getattr(project, k, None))

    try:
        yield saved
    finally:
        # restore
        for k, v in saved.items():
            setattr(project, k, deepcopy(v))


@pytest.fixture
def restore_config_file():
    """Snapshot and restore the project config file on disk.

    This fixture saves the config file content before the test and restores it
    after, ensuring tests that modify the config file don't affect other tests.
    Also cleans up any backup files created during testing.
    """

    from iris.project import project

    config_file = project.file
    backup_file = config_file + '.backup'

    # Save original config content
    with open(config_file) as f:
        original_content = f.read()

    try:
        yield config_file
    finally:
        # Restore original config file
        with open(config_file, 'w') as f:
            f.write(original_content)

        # Clean up backup file if it was created
        if os.path.exists(backup_file):
            os.remove(backup_file)

        # Reload project to ensure consistency
        project.load_from(config_file)
