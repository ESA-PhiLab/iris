"""Tests for user API endpoints."""
import json

from iris.models import Action, User


def test_get_current_user_not_authenticated(client):
    """Test getting current user when not authenticated."""
    response = client.get('/user/api/current')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['user'] is None


def test_get_current_user_authenticated(client, app):
    """Test getting current user when authenticated."""
    with app.app_context():
        # Create a test user
        user = User(name='testuser', admin=False)
        user.set_password('password')
        from iris import db
        db.session.add(user)
        db.session.commit()

    # Login
    client.post('/user/login', data=json.dumps({
        'username': 'testuser',
        'password': 'password'
    }), content_type='application/json')

    # Get current user
    response = client.get('/user/api/current')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['user'] is not None
    assert data['user']['name'] == 'testuser'
    assert data['user']['admin'] is False


def test_get_profile_requires_auth(client):
    """Test that profile endpoint requires authentication."""
    response = client.get('/user/api/profile/1')
    assert response.status_code == 403


def test_get_profile_current(client, app):
    """Test getting current user profile."""
    with app.app_context():
        # Create a test user
        user = User(name='testuser', admin=False)
        user.set_password('password')
        from iris import db
        db.session.add(user)
        db.session.commit()
        user_id = user.id

        # Create some actions
        action1 = Action(
            type='segmentation',
            image_id='test_img_1',
            user_id=user_id,
            score=95,
            unverified=False
        )
        action2 = Action(
            type='segmentation',
            image_id='test_img_2',
            user_id=user_id,
            score=87,
            unverified=True
        )
        db.session.add(action1)
        db.session.add(action2)
        db.session.commit()

    # Login
    client.post('/user/login', data=json.dumps({
        'username': 'testuser',
        'password': 'password'
    }), content_type='application/json')

    # Get profile
    response = client.get('/user/api/profile/current')
    assert response.status_code == 200
    data = json.loads(response.data)

    assert data['name'] == 'testuser'
    assert data['admin'] is False
    assert data['is_current_user'] is True
    assert 'segmentation' in data
    assert data['segmentation']['n_masks'] == 2
    assert data['segmentation']['score'] == 95
    assert data['segmentation']['score_unverified'] == 87
    assert 'rank' in data['segmentation']
    assert 'last_masks' in data['segmentation']
    assert len(data['segmentation']['last_masks']) == 2


def test_get_profile_by_id(client, app):
    """Test getting user profile by ID."""
    with app.app_context():
        # Create test users
        user1 = User(name='user1', admin=False)
        user1.set_password('password')
        user2 = User(name='user2', admin=False)
        user2.set_password('password')
        from iris import db
        db.session.add(user1)
        db.session.add(user2)
        db.session.commit()
        user2_id = user2.id

    # Login as user1
    client.post('/user/login', data=json.dumps({
        'username': 'user1',
        'password': 'password'
    }), content_type='application/json')

    # Get user2's profile
    response = client.get(f'/user/api/profile/{user2_id}')
    assert response.status_code == 200
    data = json.loads(response.data)

    assert data['name'] == 'user2'
    assert data['is_current_user'] is False


def test_get_profile_invalid_id(client, app):
    """Test getting profile with invalid user ID."""
    with app.app_context():
        user = User(name='testuser', admin=False)
        user.set_password('password')
        from iris import db
        db.session.add(user)
        db.session.commit()

    # Login
    client.post('/user/login', data=json.dumps({
        'username': 'testuser',
        'password': 'password'
    }), content_type='application/json')

    # Try to get non-existent user
    response = client.get('/user/api/profile/99999')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'error' in data


def test_profile_rank_calculation(client, app):
    """Test that user rank is calculated correctly."""
    with app.app_context():
        from iris import db

        # Create multiple users with different scores
        user1 = User(name='user1', admin=False)
        user1.set_password('password')
        user2 = User(name='user2', admin=False)
        user2.set_password('password')
        user3 = User(name='user3', admin=False)
        user3.set_password('password')

        db.session.add_all([user1, user2, user3])
        db.session.commit()

        # User1: 200 points (rank 1)
        action1 = Action(type='segmentation', image_id='img1', user_id=user1.id, score=100)
        action2 = Action(type='segmentation', image_id='img2', user_id=user1.id, score=100)

        # User2: 150 points (rank 2)
        action3 = Action(type='segmentation', image_id='img3', user_id=user2.id, score=150)

        # User3: 50 points (rank 3)
        action4 = Action(type='segmentation', image_id='img4', user_id=user3.id, score=50)

        db.session.add_all([action1, action2, action3, action4])
        db.session.commit()

    # Login as user3 (lowest rank)
    client.post('/user/login', data=json.dumps({
        'username': 'user3',
        'password': 'password'
    }), content_type='application/json')

    response = client.get('/user/api/profile/current')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['segmentation']['rank'] == 3


def test_profile_rank_for_new_user(client, app):
    """Test that a new user with no actions has rank None."""
    with app.app_context():
        from iris import db

        # Create a user with no actions
        new_user = User(name='newuser', admin=False)
        new_user.set_password('password')
        db.session.add(new_user)
        db.session.commit()

    # Login as new user
    client.post('/user/login', data=json.dumps({
        'username': 'newuser',
        'password': 'password'
    }), content_type='application/json')

    response = client.get('/user/api/profile/current')
    assert response.status_code == 200
    data = json.loads(response.data)
    # New user with no actions should have rank None
    assert data['segmentation']['rank'] is None
