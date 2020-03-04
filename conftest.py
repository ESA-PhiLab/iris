import pytest

@pytest.fixture(scope="function")
def app():
    from iris import app as iris_app
    return iris_app
