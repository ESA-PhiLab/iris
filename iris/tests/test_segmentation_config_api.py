"""
Tests for segmentation config API endpoint.
"""


class TestSegmentationConfigAPI:
    """Test the /segmentation/api/config endpoint."""

    def test_config_endpoint_requires_auth(self, client):
        """Test that config endpoint requires authentication."""
        response = client.get("/segmentation/api/config")
        assert response.status_code == 403

    def test_config_endpoint_returns_project_config(self, client, logged_in_user):
        """Test that config endpoint returns the project configuration."""
        response = client.get("/segmentation/api/config")
        assert response.status_code == 200

        config = response.get_json()

        # Should return the project config directly (not wrapped)
        assert "classes" in config
        assert "views" in config
        assert "segmentation" in config
        assert "images" in config

        # Should have the expected structure
        assert isinstance(config["classes"], list)
        assert len(config["classes"]) > 0
        assert "name" in config["classes"][0]
        assert "colour" in config["classes"][0]

    def test_config_endpoint_json_serializable(self, client, logged_in_user):
        """Test that config endpoint returns JSON-serializable data."""
        response = client.get("/segmentation/api/config")
        assert response.status_code == 200

        # Should be able to parse as JSON without errors
        config = response.get_json()
        assert config is not None

        # Check that we can serialize it back to JSON
        import json

        json_str = json.dumps(config)
        assert json_str is not None

        # And deserialize it again
        parsed_config = json.loads(json_str)
        assert parsed_config == config
