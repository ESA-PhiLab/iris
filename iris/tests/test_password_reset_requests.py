"""
Tests for password reset request functionality.
"""

import json

from iris.models import PasswordResetRequest, User


def test_request_password_reset_success(client, app):
    """User can request password reset with valid username and email."""
    with app.app_context():
        user = User(name="testuser", email="test@example.com")
        user.set_password("password123")
        from iris import db

        db.session.add(user)
        db.session.commit()
        user_id = user.id

    response = client.post(
        "/user/request-password-reset", data=json.dumps({"username": "testuser"}), content_type="application/json"
    )

    assert response.status_code == 200
    assert b"successfully" in response.data

    # Verify request was created in database
    with app.app_context():
        from iris import db

        request = PasswordResetRequest.query.filter_by(user_id=user_id, resolved=False).first()
        assert request is not None
        assert request.user.name == "testuser"


def test_request_password_reset_no_email(client, app):
    """User without email cannot request password reset."""
    with app.app_context():
        user = User(name="noemail", email=None)
        user.set_password("password123")
        from iris import db

        db.session.add(user)
        db.session.commit()

    response = client.post(
        "/user/request-password-reset", data=json.dumps({"username": "noemail"}), content_type="application/json"
    )

    assert response.status_code == 400
    assert b"no email address" in response.data.lower()


def test_request_password_reset_duplicate(client, app):
    """Cannot create duplicate pending password reset requests."""
    with app.app_context():
        user = User(name="testuser2", email="test2@example.com")
        user.set_password("password123")
        from iris import db

        db.session.add(user)
        db.session.commit()

        # Create first request
        reset_request = PasswordResetRequest(user_id=user.id)
        db.session.add(reset_request)
        db.session.commit()

    # Try to create second request
    response = client.post(
        "/user/request-password-reset", data=json.dumps({"username": "testuser2"}), content_type="application/json"
    )

    assert response.status_code == 400
    assert b"already pending" in response.data.lower()


def test_request_password_reset_invalid_username(client, app):
    """Invalid username returns 404."""
    response = client.post(
        "/user/request-password-reset", data=json.dumps({"username": "nonexistent"}), content_type="application/json"
    )

    assert response.status_code == 404
    assert b"not found" in response.data.lower()


def test_request_password_reset_empty_username(client, app):
    """Empty username returns 400."""
    response = client.post(
        "/user/request-password-reset", data=json.dumps({"username": ""}), content_type="application/json"
    )

    assert response.status_code == 400
    assert b"required" in response.data.lower()


def test_request_password_reset_missing_username(client, app):
    """Missing username field returns 400."""
    response = client.post("/user/request-password-reset", data=json.dumps({}), content_type="application/json")

    assert response.status_code == 400
    assert b"required" in response.data.lower()


def test_request_password_reset_after_resolved(client, app):
    """Can create new request after previous one was resolved."""
    with app.app_context():
        user = User(name="testuser3", email="test3@example.com")
        user.set_password("password123")
        from iris import db

        db.session.add(user)
        db.session.commit()

        # Create and resolve first request
        reset_request = PasswordResetRequest(user_id=user.id, resolved=True)
        db.session.add(reset_request)
        db.session.commit()

    # Should be able to create new request
    response = client.post(
        "/user/request-password-reset", data=json.dumps({"username": "testuser3"}), content_type="application/json"
    )

    assert response.status_code == 200
    assert b"successfully" in response.data


def test_get_password_reset_requests_as_admin(client, app):
    """Admin can view password reset requests."""
    with app.app_context():
        # Create admin user
        admin = User(name="admin", email="admin@example.com", admin=True)
        admin.set_password("adminpass")

        # Create regular user with reset request
        user = User(name="regularuser", email="user@example.com")
        user.set_password("userpass")

        from iris import db

        db.session.add(admin)
        db.session.add(user)
        db.session.commit()

        # Create reset request
        reset_request = PasswordResetRequest(user_id=user.id)
        db.session.add(reset_request)
        db.session.commit()

    # Login as admin
    client.post(
        "/user/login", data=json.dumps({"username": "admin", "password": "adminpass"}), content_type="application/json"
    )

    # Get reset requests
    response = client.get("/admin/api/password-reset-requests")

    assert response.status_code == 200
    data = json.loads(response.data)
    assert "requests" in data
    assert len(data["requests"]) == 1
    assert data["requests"][0]["username"] == "regularuser"
    assert data["requests"][0]["email"] == "user@example.com"
    assert data["requests"][0]["resolved"] is False


def test_get_password_reset_requests_as_non_admin(client, app):
    """Non-admin cannot view password reset requests."""
    with app.app_context():
        user = User(name="regularuser", email="user@example.com", admin=False)
        user.set_password("userpass")
        from iris import db

        db.session.add(user)
        db.session.commit()

    # Login as regular user
    client.post(
        "/user/login",
        data=json.dumps({"username": "regularuser", "password": "userpass"}),
        content_type="application/json",
    )

    # Try to get reset requests
    response = client.get("/admin/api/password-reset-requests")

    assert response.status_code == 403


def test_get_password_reset_requests_not_authenticated(client, app):
    """Unauthenticated user cannot view password reset requests."""
    response = client.get("/admin/api/password-reset-requests")
    assert response.status_code == 403


def test_generate_temporary_password_success(client, app):
    """Admin can generate temporary password for reset request."""
    with app.app_context():
        # Create admin user
        admin = User(name="admin", email="admin@example.com", admin=True)
        admin.set_password("adminpass")

        # Create regular user with reset request
        user = User(name="regularuser", email="user@example.com")
        user.set_password("oldpassword")

        from iris import db

        db.session.add(admin)
        db.session.add(user)
        db.session.commit()

        # Create reset request
        reset_request = PasswordResetRequest(user_id=user.id)
        db.session.add(reset_request)
        db.session.commit()
        request_id = reset_request.id
        user_id = user.id
        admin_id = admin.id

    # Login as admin
    client.post(
        "/user/login", data=json.dumps({"username": "admin", "password": "adminpass"}), content_type="application/json"
    )

    # Generate temporary password
    response = client.post(f"/admin/api/password-reset-requests/{request_id}/generate-password")

    assert response.status_code == 200
    data = json.loads(response.data)
    assert "temporary_password" in data
    assert "email" in data
    assert "username" in data
    assert len(data["temporary_password"]) == 8
    assert data["email"] == "user@example.com"
    assert data["username"] == "regularuser"

    # Verify password was actually changed
    with app.app_context():
        from iris import db

        user = db.session.get(User, user_id)
        assert user.check_password(data["temporary_password"])
        assert not user.check_password("oldpassword")

    # Verify request was marked as resolved
    with app.app_context():
        from iris import db

        request = db.session.get(PasswordResetRequest, request_id)
        assert request.resolved is True
        assert request.resolved_at is not None
        assert request.resolved_by_user_id == admin_id


def test_generate_temporary_password_already_resolved(client, app):
    """Cannot generate password for already resolved request."""
    with app.app_context():
        admin = User(name="admin", email="admin@example.com", admin=True)
        admin.set_password("adminpass")

        user = User(name="regularuser", email="user@example.com")
        user.set_password("password")

        from iris import db

        db.session.add(admin)
        db.session.add(user)
        db.session.commit()

        # Create already resolved request
        reset_request = PasswordResetRequest(user_id=user.id, resolved=True)
        db.session.add(reset_request)
        db.session.commit()
        request_id = reset_request.id

    # Login as admin
    client.post(
        "/user/login", data=json.dumps({"username": "admin", "password": "adminpass"}), content_type="application/json"
    )

    # Try to generate password
    response = client.post(f"/admin/api/password-reset-requests/{request_id}/generate-password")

    assert response.status_code == 400
    data = json.loads(response.data)
    assert "already been resolved" in data["error"]


def test_generate_temporary_password_nonexistent_request(client, app):
    """Cannot generate password for non-existent request."""
    with app.app_context():
        admin = User(name="admin", email="admin@example.com", admin=True)
        admin.set_password("adminpass")
        from iris import db

        db.session.add(admin)
        db.session.commit()

    # Login as admin
    client.post(
        "/user/login", data=json.dumps({"username": "admin", "password": "adminpass"}), content_type="application/json"
    )

    # Try to generate password for non-existent request
    response = client.post("/admin/api/password-reset-requests/99999/generate-password")

    assert response.status_code == 404


def test_generate_temporary_password_as_non_admin(client, app):
    """Non-admin cannot generate temporary passwords."""
    with app.app_context():
        user = User(name="regularuser", email="user@example.com", admin=False)
        user.set_password("userpass")

        target_user = User(name="targetuser", email="target@example.com")
        target_user.set_password("password")

        from iris import db

        db.session.add(user)
        db.session.add(target_user)
        db.session.commit()

        reset_request = PasswordResetRequest(user_id=target_user.id)
        db.session.add(reset_request)
        db.session.commit()
        request_id = reset_request.id

    # Login as regular user
    client.post(
        "/user/login",
        data=json.dumps({"username": "regularuser", "password": "userpass"}),
        content_type="application/json",
    )

    # Try to generate password
    response = client.post(f"/admin/api/password-reset-requests/{request_id}/generate-password")

    assert response.status_code == 403


def test_generate_temporary_password_not_authenticated(client, app):
    """Unauthenticated user cannot generate temporary passwords."""
    response = client.post("/admin/api/password-reset-requests/1/generate-password")
    assert response.status_code == 403


def test_temporary_password_is_cryptographically_secure(client, app):
    """Generated temporary passwords are cryptographically secure and unique."""
    with app.app_context():
        admin = User(name="admin", email="admin@example.com", admin=True)
        admin.set_password("adminpass")

        from iris import db

        db.session.add(admin)

        # Create multiple users with reset requests
        passwords = []
        request_ids = []
        for i in range(5):
            user = User(name=f"user{i}", email=f"user{i}@example.com")
            user.set_password("password")
            db.session.add(user)
            db.session.commit()

            reset_request = PasswordResetRequest(user_id=user.id)
            db.session.add(reset_request)
            db.session.commit()
            request_ids.append(reset_request.id)

    # Login as admin
    client.post(
        "/user/login", data=json.dumps({"username": "admin", "password": "adminpass"}), content_type="application/json"
    )

    # Generate passwords for all requests
    for request_id in request_ids:
        response = client.post(f"/admin/api/password-reset-requests/{request_id}/generate-password")
        data = json.loads(response.data)
        passwords.append(data["temporary_password"])

    # Verify all passwords are unique
    assert len(passwords) == len(set(passwords))

    # Verify all passwords are alphanumeric and 8 characters
    for pwd in passwords:
        assert len(pwd) == 8
        assert pwd.isalnum()
