import json

from iris.models import User, db


def test_guest_enters_without_account(client):
    response = client.post('/user/guest')
    assert response.status_code == 200

    current = client.get('/user/get/current')
    assert current.status_code == 200
    assert current.json['name'] == 'guest'
    assert current.json['admin'] is False


def test_guests_share_one_account(client, app):
    client.post('/user/guest')
    app.test_client().post('/user/guest')

    with app.app_context():
        assert User.query.filter_by(name='guest').count() == 1


def test_guest_cannot_log_in_with_a_password(client):
    client.post('/user/guest')
    client.get('/user/logout')

    response = client.post(
        '/user/login', data=json.dumps({'username': 'guest', 'password': ''}),
        content_type='application/json',
    )
    assert response.status_code == 400
    response = client.post(
        '/user/login', data=json.dumps({'username': 'guest', 'password': 'guest'}),
        content_type='application/json',
    )
    assert response.status_code == 403


def test_guest_name_is_reserved(client):
    response = client.post(
        '/user/register',
        data=json.dumps({'username': 'Guest', 'password': 'secret', 'email': 'a@b.cd'}),
        content_type='application/json',
    )
    assert response.status_code == 400
    assert b'reserved' in response.data


def test_project_can_disable_guests(client, project_snapshot):
    from iris.project import project

    project.config['allow_guest'] = False
    response = client.post('/user/guest')
    assert response.status_code == 403
    assert client.get('/user/get/current').status_code == 403


def test_guest_with_admin_rights_is_refused(client, app):
    with app.app_context():
        user = User(name='guest', admin=True)
        user.set_password('secret')
        db.session.add(user)
        db.session.commit()

    assert client.post('/user/guest').status_code == 403
