"""
Tests for user password change functionality.
"""

import json

from iris.models import User


def test_change_password_success(client, app):
    """Test successful password change."""
    with app.app_context():
        # Create a test user
        user = User(name="testuser", email="test@example.com")
        user.set_password("oldpassword123")
        from iris import db

        db.session.add(user)
        db.session.commit()

    # Login
    response = client.post(
        "/user/login",
        data=json.dumps({"username": "testuser", "password": "oldpassword123"}),
        content_type="application/json",
    )
    assert response.status_code == 200

    # Change password
    response = client.post(
        "/user/api/change-password",
        data=json.dumps(
            {
                "current_password": "oldpassword123",
                "new_password": "newpassword456",
                "confirm_password": "newpassword456",
            }
        ),
        content_type="application/json",
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["message"] == "Password changed successfully"

    # Logout
    client.get("/user/logout")

    # Try logging in with old password (should fail)
    response = client.post(
        "/user/login",
        data=json.dumps({"username": "testuser", "password": "oldpassword123"}),
        content_type="application/json",
    )
    assert response.status_code == 403

    # Try logging in with new password (should succeed)
    response = client.post(
        "/user/login",
        data=json.dumps({"username": "testuser", "password": "newpassword456"}),
        content_type="application/json",
    )
    assert response.status_code == 200


def test_change_password_wrong_current_password(client, app):
    """Test password change with incorrect current password."""
    with app.app_context():
        user = User(name="testuser2", email="test2@example.com")
        user.set_password("correctpassword")
        from iris import db

        db.session.add(user)
        db.session.commit()

    # Login
    client.post(
        "/user/login",
        data=json.dumps({"username": "testuser2", "password": "correctpassword"}),
        content_type="application/json",
    )

    # Try to change password with wrong current password
    response = client.post(
        "/user/api/change-password",
        data=json.dumps(
            {
                "current_password": "wrongpassword",
                "new_password": "newpassword456",
                "confirm_password": "newpassword456",
            }
        ),
        content_type="application/json",
    )

    assert response.status_code == 403
    data = json.loads(response.data)
    assert "incorrect" in data["error"].lower()


def test_change_password_mismatch(client, app):
    """Test password change when new passwords don't match."""
    with app.app_context():
        user = User(name="testuser3", email="test3@example.com")
        user.set_password("password123")
        from iris import db

        db.session.add(user)
        db.session.commit()

    # Login
    client.post(
        "/user/login",
        data=json.dumps({"username": "testuser3", "password": "password123"}),
        content_type="application/json",
    )

    # Try to change password with mismatched new passwords
    response = client.post(
        "/user/api/change-password",
        data=json.dumps(
            {
                "current_password": "password123",
                "new_password": "newpassword456",
                "confirm_password": "differentpassword",
            }
        ),
        content_type="application/json",
    )

    assert response.status_code == 400
    data = json.loads(response.data)
    assert "do not match" in data["error"].lower()


def test_change_password_too_short(client, app):
    """Test password change with password that's too short."""
    with app.app_context():
        user = User(name="testuser4", email="test4@example.com")
        user.set_password("password123")
        from iris import db

        db.session.add(user)
        db.session.commit()

    # Login
    client.post(
        "/user/login",
        data=json.dumps({"username": "testuser4", "password": "password123"}),
        content_type="application/json",
    )

    # Try to change password with too short password (less than 4 chars)
    response = client.post(
        "/user/api/change-password",
        data=json.dumps({"current_password": "password123", "new_password": "123", "confirm_password": "123"}),
        content_type="application/json",
    )

    assert response.status_code == 400
    data = json.loads(response.data)
    assert "at least 4 characters" in data["error"].lower()


def test_change_password_too_long(client, app):
    """Test password change with password that's too long."""
    with app.app_context():
        user = User(name="testuser5", email="test5@example.com")
        user.set_password("password123")
        from iris import db

        db.session.add(user)
        db.session.commit()

    # Login
    client.post(
        "/user/login",
        data=json.dumps({"username": "testuser5", "password": "password123"}),
        content_type="application/json",
    )

    # Try to change password with too long password (>64 chars)
    long_password = "a" * 65
    response = client.post(
        "/user/api/change-password",
        data=json.dumps(
            {"current_password": "password123", "new_password": long_password, "confirm_password": long_password}
        ),
        content_type="application/json",
    )

    assert response.status_code == 400
    data = json.loads(response.data)
    assert "too long" in data["error"].lower()


def test_change_password_not_authenticated(client, app):
    """Test password change without being logged in."""
    response = client.post(
        "/user/api/change-password",
        data=json.dumps(
            {"current_password": "password123", "new_password": "newpassword456", "confirm_password": "newpassword456"}
        ),
        content_type="application/json",
    )

    assert response.status_code == 403


def test_change_password_missing_fields(client, app):
    """Test password change with missing required fields."""
    with app.app_context():
        user = User(name="testuser6", email="test6@example.com")
        user.set_password("password123")
        from iris import db

        db.session.add(user)
        db.session.commit()

    # Login
    client.post(
        "/user/login",
        data=json.dumps({"username": "testuser6", "password": "password123"}),
        content_type="application/json",
    )

    # Missing current password
    response = client.post(
        "/user/api/change-password",
        data=json.dumps({"new_password": "newpassword456", "confirm_password": "newpassword456"}),
        content_type="application/json",
    )
    assert response.status_code == 400

    # Missing new password
    response = client.post(
        "/user/api/change-password",
        data=json.dumps({"current_password": "password123", "confirm_password": "newpassword456"}),
        content_type="application/json",
    )
    assert response.status_code == 400
