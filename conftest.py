import pytest

@pytest.fixture
def app():
    from iris import app as iris_app
    return iris_app
