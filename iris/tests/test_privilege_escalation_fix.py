"""
Test suite to verify the privilege escalation vulnerability is fixed.

This test ensures that regular users cannot escalate their privileges to admin
by calling the /user/set/current endpoint with {"admin": true}.
"""
import json

from iris import db
from iris.models import User


class TestPrivilegeEscalationFix:
    """Test cases for privilege escalation vulnerability fix."""

    def setup_method(self):
        """Set up test users for each test."""
        # Create a regular user
        self.regular_user = User(
            id=1,
            name="regular_user",
            admin=False
        )
        self.regular_user.set_password("password123")
        db.session.add(self.regular_user)

        # Create an admin user
        self.admin_user = User(
            id=2,
            name="admin_user",
            admin=True
        )
        self.admin_user.set_password("admin123")
        db.session.add(self.admin_user)

        db.session.commit()

    def test_regular_user_cannot_escalate_own_privileges(self, client):
        """Test that a regular user cannot make themselves admin."""
        # Login as regular user
        login_response = client.post('/user/login',
            data=json.dumps({
                'username': 'regular_user',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        assert login_response.status_code == 200

        # Attempt privilege escalation - this should fail
        escalation_response = client.post('/user/set/current',
            data=json.dumps({'admin': True}),
            content_type='application/json'
        )

        # Should be denied with 403 Forbidden
        assert escalation_response.status_code == 403
        assert b"Only administrators can modify admin privileges" in escalation_response.data

        # Verify user is still not admin in database
        user = User.query.filter_by(name='regular_user').first()
        assert user is not None
        assert user.admin is False

    def test_regular_user_cannot_escalate_other_user_privileges(self, client):
        """Test that a regular user cannot make another user admin."""
        # Login as regular user
        login_response = client.post('/user/login',
            data=json.dumps({
                'username': 'regular_user',
                'password': 'password123'
            }),
            content_type='application/json'
        )
        assert login_response.status_code == 200

        # Attempt to escalate another user's privileges - should fail
        escalation_response = client.post('/user/set/2',  # admin_user's ID
            data=json.dumps({'admin': True}),
            content_type='application/json'
        )

        # Should be denied with 403 Forbidden (can't modify other users)
        assert escalation_response.status_code == 403
        assert b"Permission denied" in escalation_response.data

    def test_admin_can_modify_admin_privileges(self, client):
        """Test that admins can still modify admin privileges (legitimate use case)."""
        # Login as admin user
        login_response = client.post('/user/login',
            data=json.dumps({
                'username': 'admin_user',
                'password': 'admin123'
            }),
            content_type='application/json'
        )
        assert login_response.status_code == 200

        # Admin should be able to modify admin privileges
        response = client.post('/user/set/1',  # regular_user's ID
            data=json.dumps({'admin': True}),
            content_type='application/json'
        )

        # Should succeed
        assert response.status_code == 200
        assert b"Saved new user info successfully" in response.data

        # Verify user is now admin in database
        user = User.query.filter_by(name='regular_user').first()
        assert user is not None
        assert user.admin is True

    def test_admin_can_revoke_admin_privileges(self, client):
        """Test that admins can revoke admin privileges."""
        # Login as admin user
        login_response = client.post('/user/login',
            data=json.dumps({
                'username': 'admin_user',
                'password': 'admin123'
            }),
            content_type='application/json'
        )
        assert login_response.status_code == 200

        # Admin should be able to revoke their own admin privileges
        response = client.post('/user/set/current',
            data=json.dumps({'admin': False}),
            content_type='application/json'
        )

        # Should succeed
        assert response.status_code == 200
        assert b"Saved new user info successfully" in response.data

        # Verify user is no longer admin in database
        user = User.query.filter_by(name='admin_user').first()
        assert user is not None
        assert user.admin is False

    def test_unauthenticated_user_cannot_escalate(self, client):
        """Test that unauthenticated users cannot access the endpoint."""
        # Don't login - attempt privilege escalation without authentication
        response = client.post('/user/set/current',
            data=json.dumps({'admin': True}),
            content_type='application/json'
        )

        # Should be denied with 403 Forbidden (not logged in)
        assert response.status_code == 403
        assert b"Not logged in" in response.data

    def test_first_user_becomes_admin_when_no_admin_exists(self, client):
        """Test the fallback mechanism that makes the first user admin if no admin exists."""
        # Clear all users to simulate fresh installation (database is already clean from fixture)
        User.query.delete()
        db.session.commit()

        # Register first user - should automatically become admin
        response = client.post('/user/register',
            data=json.dumps({
                'username': 'first_user',
                'password': 'password123',
                'email': 'first@example.com'
            }),
            content_type='application/json'
        )

        assert response.status_code == 200
        assert b"successfully created as the first administrator" in response.data

        # Verify user is admin in database
        user = User.query.filter_by(name='first_user').first()
        assert user is not None
        assert user.admin is True

    def test_second_user_is_not_admin_when_admin_exists(self, client):
        """Test that subsequent users are not automatically made admin."""
        # Clear all users and create one admin (database is already clean from fixture)
        User.query.delete()
        admin = User(name="existing_admin", admin=True, email="admin@example.com")
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.commit()

        # Register second user - should NOT become admin
        response = client.post('/user/register',
            data=json.dumps({
                'username': 'second_user',
                'password': 'password123',
                'email': 'second@example.com'
            }),
            content_type='application/json'
        )

        assert response.status_code == 200
        assert b"successfully created!" in response.data
        assert b"administrator" not in response.data

        # Verify user is NOT admin in database
        user = User.query.filter_by(name='second_user').first()
        assert user is not None
        assert user.admin is False
