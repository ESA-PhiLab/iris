"""
Tests for the segmentation page.

The page is the React app built by Vite; the server picks the image to open
when the address does not name one.
"""
import json

import pytest

from iris.project import project


@pytest.fixture
def built_page(tmp_path, monkeypatch):
    """A stand-in for the page Vite builds"""
    (tmp_path / 'index.html').write_text('<div id="react-segmentation-app"></div>')
    monkeypatch.setattr('iris.segmentation.spa.DIST', str(tmp_path))
    return tmp_path


def test_segmentation_spa_blueprint_registration():
    import flask

    from iris.segmentation import register_segmentation_blueprints

    app = flask.Flask(__name__)
    register_segmentation_blueprints(app)

    endpoints = [rule.endpoint for rule in app.url_map.iter_rules()]
    assert 'segmentation_spa.segmentation_spa' in endpoints
    for endpoint in ['segmentation.load_mask', 'segmentation.save_mask', 'segmentation.predict_mask']:
        assert endpoint in endpoints


def test_page_of_an_image(client, built_page):
    image_id = project.image_ids[0]

    response = client.get(f'/segmentation/?image_id={image_id}')

    assert response.status_code == 200
    assert b'react-segmentation-app' in response.data


def test_unknown_image_is_not_found(client, built_page):
    response = client.get('/segmentation/?image_id=nowhere')

    assert response.status_code == 404


def test_without_image_opens_the_start_image(client, built_page):
    response = client.get('/segmentation/')

    assert response.status_code == 302
    assert response.location.endswith(f'?image_id={project.get_start_image_id()}')


def test_without_image_opens_the_last_image_of_the_user(app, client, logged_in_user, built_page):
    from iris.models import Action, db

    last = project.image_ids[-1]
    with app.app_context():
        db.session.add(Action(user_id=logged_in_user.id, image_id=last, type='segmentation'))
        db.session.commit()

    response = client.get('/segmentation/')

    assert response.status_code == 302
    assert response.location.endswith(f'?image_id={last}')


def test_page_works_for_guests(client, built_page):
    login = client.post('/user/guest', data=json.dumps({}), content_type='application/json')
    assert login.status_code == 200

    response = client.get(f'/segmentation/?image_id={project.image_ids[0]}')

    assert response.status_code == 200
