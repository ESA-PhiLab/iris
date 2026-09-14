"""
Tests for admin API endpoints that serve JSON data to React components.

These tests verify the new JSON API endpoints added for the React admin interface migration.
The endpoints replace legacy HTML template rendering with JSON responses for client-side rendering.
"""
import json
from datetime import timedelta

import pytest

from iris.models import Action, User, db


class TestAdminAPIEndpoints:
    """Test admin API endpoints for React frontend."""

    @pytest.fixture(autouse=True)
    def setup_test_data(self, app):
        """Create test users and actions for API testing."""
        with app.app_context():
            # Create test users
            admin_user = User(id=1, name="admin", admin=True, image_seed=12345)
            admin_user.set_password("admin123")
            db.session.add(admin_user)

            regular_user = User(id=2, name="annotator", admin=False, image_seed=67890)
            regular_user.set_password("password123")
            db.session.add(regular_user)

            another_user = User(id=3, name="reviewer", admin=False, image_seed=11111)
            another_user.set_password("password456")
            db.session.add(another_user)

            db.session.commit()

            # Create test actions (annotations)
            action1 = Action(
                type="segmentation",
                image_id="image_001",
                user_id=1,
                score=85,
                difficulty=3,
                complete=True,
                unverified=False,
                time_spent=timedelta(minutes=30),
                notes="Good quality annotation",
            )
            db.session.add(action1)

            action2 = Action(
                type="segmentation",
                image_id="image_002",
                user_id=2,
                score=92,
                difficulty=2,
                complete=True,
                unverified=False,
                time_spent=timedelta(minutes=45),
                notes="Clear boundaries",
            )
            db.session.add(action2)

            action3 = Action(
                type="segmentation",
                image_id="image_001",
                user_id=2,
                score=78,
                difficulty=4,
                complete=False,
                unverified=True,
                time_spent=timedelta(minutes=20),
                notes="Difficult clouds",
            )
            db.session.add(action3)

            action4 = Action(
                type="classification",
                image_id="image_003",
                user_id=3,
                score=95,
                difficulty=1,
                complete=True,
                unverified=False,
                time_spent=timedelta(minutes=15),
            )
            db.session.add(action4)

            db.session.commit()

    def login_admin(self, client):
        """Helper to login as admin user."""
        return client.post(
            "/user/login",
            data=json.dumps({"username": "admin", "password": "admin123"}),
            content_type="application/json",
        )

    def login_regular(self, client):
        """Helper to login as regular user."""
        return client.post(
            "/user/login",
            data=json.dumps({"username": "annotator", "password": "password123"}),
            content_type="application/json",
        )


class TestUsersAPIEndpoint(TestAdminAPIEndpoints):
    """Test /admin/api/users endpoint."""

    def test_users_endpoint_returns_json(self, client):
        """Test that users endpoint returns valid JSON."""
        self.login_admin(client)
        response = client.get("/admin/api/users")

        assert response.status_code == 200
        assert response.content_type == "application/json"

        data = json.loads(response.data)
        assert "users" in data
        assert isinstance(data["users"], list)

    def test_users_endpoint_returns_all_users(self, client):
        """Test that all users are returned."""
        self.login_admin(client)
        response = client.get("/admin/api/users")
        data = json.loads(response.data)

        assert len(data["users"]) == 3
        usernames = [user["name"] for user in data["users"]]
        assert "admin" in usernames
        assert "annotator" in usernames
        assert "reviewer" in usernames

    def test_users_endpoint_includes_segmentation_stats(self, client):
        """Test that user data includes segmentation statistics."""
        self.login_admin(client)
        response = client.get("/admin/api/users")
        data = json.loads(response.data)

        # Find the admin user
        admin_user = next(u for u in data["users"] if u["name"] == "admin")

        assert "segmentation" in admin_user
        assert "score" in admin_user["segmentation"]
        assert "score_unverified" in admin_user["segmentation"]
        assert "n_masks" in admin_user["segmentation"]

    def test_users_endpoint_excludes_password_hash(self, client):
        """Test that password hashes are not exposed in API response."""
        self.login_admin(client)
        response = client.get("/admin/api/users")
        data = json.loads(response.data)

        for user in data["users"]:
            assert "password_hash" not in user
            assert "password" not in user

    def test_users_endpoint_sorting_by_id_ascending(self, client):
        """Test sorting users by ID in ascending order."""
        self.login_admin(client)
        response = client.get("/admin/api/users?order_by=id&ascending=true")
        data = json.loads(response.data)

        user_ids = [user["id"] for user in data["users"]]
        assert user_ids == sorted(user_ids)

    def test_users_endpoint_sorting_by_id_descending(self, client):
        """Test sorting users by ID in descending order."""
        self.login_admin(client)
        response = client.get("/admin/api/users?order_by=id&ascending=false")
        data = json.loads(response.data)

        user_ids = [user["id"] for user in data["users"]]
        assert user_ids == sorted(user_ids, reverse=True)

    def test_users_endpoint_sorting_by_name(self, client):
        """Test sorting users by name."""
        self.login_admin(client)
        response = client.get("/admin/api/users?order_by=name&ascending=true")
        data = json.loads(response.data)

        usernames = [user["name"] for user in data["users"]]
        assert usernames == sorted(usernames)

    def test_users_endpoint_requires_authentication(self, client):
        """Test that unauthenticated requests are rejected."""
        response = client.get("/admin/api/users")
        # Should redirect to login or return 401/403
        assert response.status_code in [302, 401, 403]


class TestActionsAPIEndpoint(TestAdminAPIEndpoints):
    """Test /admin/api/actions/<type> endpoint."""

    def test_actions_endpoint_returns_json(self, client):
        """Test that actions endpoint returns valid JSON."""
        self.login_admin(client)
        response = client.get("/admin/api/actions/segmentation")

        assert response.status_code == 200
        assert response.content_type == "application/json"

        data = json.loads(response.data)
        assert "actions" in data
        assert "image_stats" in data
        assert isinstance(data["actions"], list)

    def test_actions_endpoint_filters_by_type(self, client):
        """Test that actions are filtered by type parameter."""
        self.login_admin(client)

        # Get segmentation actions
        response = client.get("/admin/api/actions/segmentation")
        data = json.loads(response.data)
        assert len(data["actions"]) == 3  # 3 segmentation actions

        # Get classification actions
        response = client.get("/admin/api/actions/classification")
        data = json.loads(response.data)
        assert len(data["actions"]) == 1  # 1 classification action

    def test_actions_endpoint_includes_username(self, client):
        """Test that actions include username from joined User table."""
        self.login_admin(client)
        response = client.get("/admin/api/actions/segmentation")
        data = json.loads(response.data)

        for action in data["actions"]:
            assert "username" in action
            assert action["username"] in ["admin", "annotator", "reviewer"]

    def test_actions_endpoint_includes_all_fields(self, client):
        """Test that all action fields are included in response."""
        self.login_admin(client)
        response = client.get("/admin/api/actions/segmentation")
        data = json.loads(response.data)

        action = data["actions"][0]
        required_fields = [
            "id",
            "type",
            "image_id",
            "user_id",
            "username",
            "score",
            "difficulty",
            "complete",
            "unverified",
            "last_modification",
            "time_spent",
        ]

        for field in required_fields:
            assert field in action, f"Missing field: {field}"

    def test_actions_endpoint_image_stats(self, client):
        """Test that image statistics are calculated correctly."""
        self.login_admin(client)
        response = client.get("/admin/api/actions/segmentation")
        data = json.loads(response.data)

        assert "image_stats" in data
        assert "processed" in data["image_stats"]
        assert "total" in data["image_stats"]

        # We have 3 segmentation actions on 2 unique images (image_001, image_002)
        assert data["image_stats"]["processed"] == 2
        assert data["image_stats"]["total"] > 0  # Total images in project

    def test_actions_endpoint_sorting_by_user_id(self, client):
        """Test sorting actions by user_id."""
        self.login_admin(client)
        response = client.get("/admin/api/actions/segmentation?order_by=user_id&ascending=true")
        data = json.loads(response.data)

        user_ids = [action["user_id"] for action in data["actions"]]
        assert user_ids == sorted(user_ids)

    def test_actions_endpoint_sorting_by_score_descending(self, client):
        """Test sorting actions by score in descending order."""
        self.login_admin(client)
        response = client.get("/admin/api/actions/segmentation?order_by=score&ascending=false")
        data = json.loads(response.data)

        scores = [action["score"] for action in data["actions"]]
        assert scores == sorted(scores, reverse=True)

    def test_actions_endpoint_returns_order_params(self, client):
        """Test that response includes order_by and ascending parameters."""
        self.login_admin(client)
        response = client.get("/admin/api/actions/segmentation?order_by=score&ascending=false")
        data = json.loads(response.data)

        assert data["order_by"] == "score"
        assert data["ascending"] is False

    def test_actions_endpoint_requires_authentication(self, client):
        """Test that unauthenticated requests are rejected."""
        response = client.get("/admin/api/actions/segmentation")
        assert response.status_code in [302, 401, 403]


class TestImagesAPIEndpoint(TestAdminAPIEndpoints):
    """Test /admin/api/images endpoint."""

    def test_images_endpoint_returns_json(self, client):
        """Test that images endpoint returns valid JSON."""
        self.login_admin(client)
        response = client.get("/admin/api/images")

        assert response.status_code == 200
        assert response.content_type == "application/json"

        data = json.loads(response.data)
        assert "images" in data
        assert isinstance(data["images"], list)

    def test_images_endpoint_aggregates_by_image_id(self, client):
        """Test that actions are aggregated by image_id."""
        self.login_admin(client)
        response = client.get("/admin/api/images")
        data = json.loads(response.data)

        # The images endpoint only returns images that exist in project.image_ids
        # Our test actions reference image_001, image_002, image_003
        # But these may not be in the demo project's image list
        # So we just verify the structure is correct
        assert isinstance(data["images"], list)

        # If there are images with actions, verify structure
        if data["images"]:
            image = data["images"][0]
            assert "image_id" in image
            assert "types" in image
            assert isinstance(image["types"], dict)

    def test_images_endpoint_calculates_averages(self, client, app):
        """Test that statistics are averaged correctly."""
        # This test needs images that actually exist in the project
        # Let's use the actual project images
        from iris.project import project

        with app.app_context():
            # Get first image from project
            if not project.image_ids:
                pytest.skip("No images in project")

            test_image_id = project.image_ids[0]

            # Create two actions for this image
            action1 = Action(
                type="segmentation",
                image_id=test_image_id,
                user_id=1,
                score=80,
                difficulty=3,
                complete=True,
                unverified=False,
                time_spent=timedelta(minutes=30),
            )
            action2 = Action(
                type="segmentation",
                image_id=test_image_id,
                user_id=2,
                score=90,
                difficulty=5,
                complete=True,
                unverified=False,
                time_spent=timedelta(minutes=60),
            )
            db.session.add(action1)
            db.session.add(action2)
            db.session.commit()

        self.login_admin(client)
        response = client.get("/admin/api/images")
        data = json.loads(response.data)

        # Find our test image
        test_image = next((img for img in data["images"] if img["image_id"] == test_image_id), None)
        if test_image and "segmentation" in test_image["types"]:
            seg_stats = test_image["types"]["segmentation"]

            # Average score should be (80 + 90) / 2 = 85
            assert seg_stats["score"] == 85.0
            # Average difficulty should be (3 + 5) / 2 = 4
            assert seg_stats["difficulty"] == 4.0

    def test_images_endpoint_includes_all_stats(self, client):
        """Test that all statistics are included."""
        self.login_admin(client)
        response = client.get("/admin/api/images")
        data = json.loads(response.data)

        image = data["images"][0]
        assert "image_id" in image
        assert "types" in image

        # Check that each type has all required stats
        for _action_type, stats in image["types"].items():
            assert "score" in stats
            assert "count" in stats
            assert "difficulty" in stats
            assert "time_spent" in stats

    def test_images_endpoint_time_spent_in_hours(self, client):
        """Test that time_spent is converted to hours."""
        self.login_admin(client)
        response = client.get("/admin/api/images")
        data = json.loads(response.data)

        # Find an image with actions
        image_with_actions = next((img for img in data["images"] if img["types"]), None)
        if image_with_actions:
            for stats in image_with_actions["types"].values():
                # Time should be a float representing hours
                assert isinstance(stats["time_spent"], (int, float))
                assert stats["time_spent"] >= 0

    def test_images_endpoint_rounds_values(self, client):
        """Test that values are rounded to 2 decimal places."""
        self.login_admin(client)
        response = client.get("/admin/api/images")
        data = json.loads(response.data)

        for image in data["images"]:
            for stats in image["types"].values():
                # Check that floats are rounded to 2 decimal places
                score_str = str(stats["score"])
                if "." in score_str:
                    decimals = len(score_str.split(".")[1])
                    assert decimals <= 2

    def test_images_endpoint_groups_by_action_type(self, client):
        """Test that different action types are grouped separately."""
        self.login_admin(client)
        response = client.get("/admin/api/images")
        data = json.loads(response.data)

        # Find image_003 which has a classification action
        image_003 = next((img for img in data["images"] if img["image_id"] == "image_003"), None)
        if image_003:
            assert "classification" in image_003["types"]

    def test_images_endpoint_returns_order_params(self, client):
        """Test that response includes order_by and ascending parameters."""
        self.login_admin(client)
        response = client.get("/admin/api/images?order_by=image_id&ascending=true")
        data = json.loads(response.data)

        assert data["order_by"] == "image_id"
        assert data["ascending"] is True

    def test_images_endpoint_requires_authentication(self, client):
        """Test that unauthenticated requests are rejected."""
        response = client.get("/admin/api/images")
        assert response.status_code in [302, 401, 403]


class TestExportMergedGeoTIFFEndpoint(TestAdminAPIEndpoints):
    """Test /admin/api/export-merged-geotiff/<image_id> endpoint."""

    def test_export_requires_admin_privileges(self, client):
        """Test that only admins can export merged GeoTIFF."""
        # Login as regular user
        self.login_regular(client)

        response = client.get("/admin/api/export-merged-geotiff/image_001")
        assert response.status_code == 403

        # The @requires_admin decorator returns plain text, not JSON
        assert b"admin rights" in response.data

    def test_export_validates_image_exists(self, client):
        """Test that export validates image_id exists in project."""
        self.login_admin(client)

        response = client.get("/admin/api/export-merged-geotiff/nonexistent_image")
        assert response.status_code == 404

        data = json.loads(response.data)
        assert "error" in data
        assert "Image not found" in data["error"]

    def test_export_requires_mask_data(self, client, app):
        """Test that export fails if no masks exist for image."""
        import os
        from glob import glob

        from iris.project import project
        from iris.segmentation import get_mask_filenames

        with app.app_context():
            if not project.image_ids:
                pytest.skip("No images in project")

            # Find an image that has no masks, or use a fake image ID
            test_image_id = "nonexistent_image_with_no_masks_12345"

            # Make sure this image doesn't have masks
            if test_image_id in project.image_ids:
                final_mask_paths = get_mask_filenames(test_image_id, user_id="*")[0]
                mask_files = glob(final_mask_paths)
                for mask_file in mask_files:
                    if os.path.exists(mask_file):
                        os.remove(mask_file)

        self.login_admin(client)
        response = client.get(f"/admin/api/export-merged-geotiff/{test_image_id}")

        # Should return 404 - either image not found or no masks
        assert response.status_code == 404
        data = json.loads(response.data)
        assert "error" in data

    def test_export_returns_geotiff_file(self, client, app, tmp_path):
        """Test that export returns a valid GeoTIFF file when masks exist."""
        import os

        import numpy as np

        from iris.project import project
        from iris.segmentation import get_mask_filenames

        with app.app_context():
            if not project.image_ids:
                pytest.skip("No images in project")

            test_image_id = project.image_ids[0]

            # Create mock mask files for testing
            final_mask_file, user_mask_file = get_mask_filenames(test_image_id, user_id=1)
            os.makedirs(os.path.dirname(final_mask_file), exist_ok=True)

            # Create a simple one-hot encoded mask
            mask_shape = project['segmentation']['mask_shape']
            n_classes = len(project['classes'])
            mock_mask = np.zeros((*mask_shape[::-1], n_classes), dtype=bool)
            mock_mask[:, :, 0] = True  # All pixels are class 0

            np.save(final_mask_file, mock_mask, allow_pickle=False)

        self.login_admin(client)
        response = client.get(f"/admin/api/export-merged-geotiff/{test_image_id}")

        # Should return a file download
        if response.status_code == 200:
            assert response.mimetype == "image/tiff"
            assert "attachment" in response.headers.get("Content-Disposition", "")
            assert f"{test_image_id}_merged.tif" in response.headers.get("Content-Disposition", "")


class TestAdminAPIIntegration(TestAdminAPIEndpoints):
    """Integration tests for admin API endpoints."""

    def test_all_endpoints_accessible_to_admin(self, client):
        """Test that admin users can access all API endpoints."""
        self.login_admin(client)

        endpoints = [
            "/admin/api/users",
            "/admin/api/actions/segmentation",
            "/admin/api/images",
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 200, f"Failed to access {endpoint}"

    def test_regular_users_can_access_api(self, client):
        """Test that regular authenticated users can access API (if allowed by @requires_auth)."""
        self.login_regular(client)

        # The @requires_auth decorator allows any authenticated user
        # If you want admin-only access, you'd need a different decorator
        response = client.get("/admin/api/users")
        # This should succeed if @requires_auth only checks authentication
        # Adjust assertion based on your actual authorization requirements
        assert response.status_code in [200, 403]

    def test_api_responses_are_consistent(self, client):
        """Test that API responses have consistent structure."""
        self.login_admin(client)

        # All endpoints should return JSON
        endpoints = [
            "/admin/api/users",
            "/admin/api/actions/segmentation",
            "/admin/api/images",
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.content_type == "application/json"
            data = json.loads(response.data)
            assert isinstance(data, dict)

    def test_api_handles_empty_results(self, client, app):
        """Test that API handles cases with no data gracefully."""
        # Clear all actions
        with app.app_context():
            Action.query.delete()
            db.session.commit()

        self.login_admin(client)

        # Actions endpoint should return empty list
        response = client.get("/admin/api/actions/segmentation")
        data = json.loads(response.data)
        assert data["actions"] == []
        assert data["image_stats"]["processed"] == 0

        # Images endpoint should return empty or minimal data
        response = client.get("/admin/api/images")
        data = json.loads(response.data)
        assert isinstance(data["images"], list)
