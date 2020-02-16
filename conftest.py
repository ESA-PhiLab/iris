from iris import app as iris_app

@pytest.fixture
def app():
    return iris_app
