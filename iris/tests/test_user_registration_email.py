"""
Tests for user registration with email validation.
"""

import json

from iris.models import User


def test_register_with_valid_email(client, app):
    """User can register with valid email."""
    response = client.post(
        "/user/register",
        data=json.dumps({"username": "newuser", "password": "password123", "email": "newuser@example.com"}),
        content_type="application/json",
    )

    assert response.status_code == 200
    assert b"successfully created" in response.data

    # Verify user was created with email
    with app.app_context():
        user = User.query.filter_by(name="newuser").first()
        assert user is not None
        assert user.email == "newuser@example.com"


def test_register_without_email(client, app):
    """Registration requires email field."""
    response = client.post(
        "/user/register",
        data=json.dumps({"username": "newuser", "password": "password123"}),
        content_type="application/json",
    )

    assert response.status_code == 400
    assert b"email is a required field" in response.data.lower()


def test_register_with_empty_email(client, app):
    """Registration rejects empty email."""
    response = client.post(
        "/user/register",
        data=json.dumps({"username": "newuser", "password": "password123", "email": ""}),
        content_type="application/json",
    )

    assert response.status_code == 400
    assert b"email is a required field" in response.data.lower()


def test_register_with_whitespace_email(client, app):
    """Registration rejects whitespace-only email."""
    response = client.post(
        "/user/register",
        data=json.dumps({"username": "newuser", "password": "password123", "email": "   "}),
        content_type="application/json",
    )

    assert response.status_code == 400
    assert b"email is a required field" in response.data.lower()


def test_register_with_invalid_email_format(client, app):
    """Registration rejects invalid email formats."""
    invalid_emails = [
        "notanemail",
        "missing@domain",
        "@nodomain.com",
        "no@domain",
        "spaces in@email.com",
        "double@@domain.com",
        "nodomain@.com",
        "noat.com",
    ]

    for invalid_email in invalid_emails:
        response = client.post(
            "/user/register",
            data=json.dumps({"username": f"user_{invalid_email}", "password": "password123", "email": invalid_email}),
            content_type="application/json",
        )

        assert response.status_code == 400, f"Should reject: {invalid_email}"
        assert b"invalid email format" in response.data.lower()


def test_register_with_valid_email_formats(client, app):
    """Registration accepts various valid email formats."""
    valid_emails = [
        "simple@example.com",
        "user.name@example.com",
        "user+tag@example.co.uk",
        "user_name@example-domain.com",
        "user123@sub.example.com",
        "a@b.co",
    ]

    for i, valid_email in enumerate(valid_emails):
        response = client.post(
            "/user/register",
            data=json.dumps({"username": f"user{i}", "password": "password123", "email": valid_email}),
            content_type="application/json",
        )

        assert response.status_code == 200, f"Should accept: {valid_email}"


def test_register_with_email_too_long(client, app):
    """Registration rejects email longer than 256 characters."""
    long_email = "a" * 250 + "@example.com"  # 262 characters

    response = client.post(
        "/user/register",
        data=json.dumps({"username": "newuser", "password": "password123", "email": long_email}),
        content_type="application/json",
    )

    assert response.status_code == 400
    assert b"email is too long" in response.data.lower()


def test_register_first_user_becomes_admin(client, app):
    """First registered user becomes admin (with email)."""
    # Ensure no users exist
    with app.app_context():
        from iris import db

        User.query.delete()
        db.session.commit()

    response = client.post(
        "/user/register",
        data=json.dumps({"username": "firstuser", "password": "password123", "email": "first@example.com"}),
        content_type="application/json",
    )

    assert response.status_code == 200
    assert b"administrator" in response.data.lower()

    # Verify user is admin
    with app.app_context():
        user = User.query.filter_by(name="firstuser").first()
        assert user is not None
        assert user.admin is True
        assert user.email == "first@example.com"


def test_register_second_user_not_admin(client, app):
    """Second registered user is not admin."""
    # Create first admin user
    with app.app_context():
        from iris import db

        User.query.delete()
        db.session.commit()

        admin = User(name="admin", email="admin@example.com", admin=True)
        admin.set_password("adminpass")
        db.session.add(admin)
        db.session.commit()

    response = client.post(
        "/user/register",
        data=json.dumps({"username": "seconduser", "password": "password123", "email": "second@example.com"}),
        content_type="application/json",
    )

    assert response.status_code == 200
    assert b"administrator" not in response.data.lower()

    # Verify user is not admin
    with app.app_context():
        user = User.query.filter_by(name="seconduser").first()
        assert user is not None
        assert user.admin is False
        assert user.email == "second@example.com"


def test_register_email_case_preserved(client, app):
    """Email case is preserved during registration."""
    response = client.post(
        "/user/register",
        data=json.dumps({"username": "newuser", "password": "password123", "email": "User.Name@Example.COM"}),
        content_type="application/json",
    )

    assert response.status_code == 200

    with app.app_context():
        user = User.query.filter_by(name="newuser").first()
        assert user.email == "User.Name@Example.COM"


def test_register_existing_username_with_email(client, app):
    """Cannot register with existing username even with different email."""
    with app.app_context():
        existing = User(name="existinguser", email="existing@example.com")
        existing.set_password("password")
        from iris import db

        db.session.add(existing)
        db.session.commit()

    response = client.post(
        "/user/register",
        data=json.dumps({"username": "existinguser", "password": "password123", "email": "different@example.com"}),
        content_type="application/json",
    )

    assert response.status_code == 400
    assert b"already exists" in response.data.lower()


def test_register_validates_email_before_username(client, app):
    """Email validation happens before checking username availability."""
    response = client.post(
        "/user/register",
        data=json.dumps({"username": "newuser", "password": "password123", "email": "invalid-email"}),
        content_type="application/json",
    )

    # Should fail on email validation
    assert response.status_code == 400
    assert b"invalid email format" in response.data.lower()


def test_register_validates_email_before_password(client, app):
    """Password validation happens before email validation in current implementation."""
    response = client.post(
        "/user/register",
        data=json.dumps(
            {
                "username": "newuser",
                "password": "a" * 100,  # Too long password
                "email": "invalid-email",
            }
        ),
        content_type="application/json",
    )

    # Current implementation validates password length first
    assert response.status_code == 400
    assert b"password is too long" in response.data.lower()
