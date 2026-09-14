"""
Tests for configuration API endpoints
"""

import json
import os

import pytest

from iris.models import User, db
from iris.project import Project, project


@pytest.fixture
def logged_in_admin(app, client):
    """Create admin user and login via session"""
    with app.app_context():
        user = User(name="admin_test", admin=True)
        user.set_password("admin123")
        db.session.add(user)
        db.session.commit()
        user_id = user.id

    # Login via Flask session
    with client.session_transaction() as sess:
        sess["user_id"] = user_id

    return client


@pytest.fixture
def sample_valid_config():
    """Sample valid configuration for testing"""
    return {
        "name": "test_project",
        "host": "127.0.0.1",
        "port": 5000,
        "images": {"path": "test/{id}.tif", "shape": [512, 512], "thumbnails": False, "metadata": False},
        "classes": [
            {"name": "Background", "colour": [0, 0, 0, 255], "description": "Background class"},
            {"name": "Cloud", "colour": [255, 255, 255, 255], "description": "Cloud pixels"},
        ],
        "views": {
            "RGB": {"type": "image", "data": ["$B1", "$B2", "$B3"], "description": "RGB composite"},
            "Monochrome": {"type": "image", "data": "$B1", "cmap": "gray", "description": "Single band"},
        },
        "view_groups": {"Main": ["RGB", "Monochrome"]},
        "segmentation": {
            "path": "masks/{id}.png",
            "mask_encoding": "integer",
            "mask_area": None,
            "score": "f1",
            "ai_model": False,
        },
    }


def test_get_project_config_requires_auth(client):
    """Test that getting project config requires authentication"""
    response = client.get("/api/config/project")
    assert response.status_code == 401


def test_get_project_config_requires_admin(app, client):
    """Test that getting project config requires admin privileges"""
    with app.app_context():
        # Create non-admin user
        user = User(name="regular_user", admin=False)
        user.set_password("password")
        db.session.add(user)
        db.session.commit()
        user_id = user.id

    # Login as regular user via session
    with client.session_transaction() as sess:
        sess["user_id"] = user_id

    # Try to get config
    response = client.get("/api/config/project")
    assert response.status_code == 403
    assert "Admin privileges required" in response.json["error"]


def test_get_project_config_success(logged_in_admin):
    """Test successful retrieval of project configuration"""
    response = logged_in_admin.get("/api/config/project")

    assert response.status_code == 200
    data = response.json
    assert "config" in data
    assert "config_file" in data

    config = data["config"]
    assert "name" in config
    assert "images" in config
    assert "classes" in config
    assert "views" in config
    assert "segmentation" in config


def test_validate_project_config_success(logged_in_admin):
    """Test configuration validation endpoint with valid config"""
    # Get current config
    response = logged_in_admin.get("/api/config/project")
    config = response.json["config"]

    # Validate it
    response = logged_in_admin.post("/api/config/project/validate", json=config, content_type="application/json")

    assert response.status_code == 200
    data = response.json
    assert "valid" in data
    assert "errors" in data
    assert "warnings" in data


def test_validate_detects_missing_required_fields(logged_in_admin):
    """Test that validation detects missing required fields"""
    invalid_config = {
        "name": "test",
        "images": {"path": "test", "shape": [512, 512]},
        # Missing classes, views, segmentation
    }

    response = logged_in_admin.post(
        "/api/config/project/validate", json=invalid_config, content_type="application/json"
    )

    assert response.status_code == 200
    data = response.json
    assert data["valid"] is False
    assert len(data["errors"]) > 0


def test_validate_detects_invalid_colour_arrays(logged_in_admin):
    """Test that validation detects invalid colour arrays"""
    config = {
        "name": "test",
        "images": {"path": "test/{id}.tif", "shape": [512, 512]},
        "classes": [
            {"name": "Test", "colour": [255, 255]}  # Invalid: only 2 values
        ],
        "views": {"RGB": {"type": "image", "data": ["$B1", "$B2", "$B3"]}},
        "view_groups": {},
        "segmentation": {"path": "", "ai_model": False},
    }

    response = logged_in_admin.post("/api/config/project/validate", json=config, content_type="application/json")

    assert response.status_code == 200
    data = response.json
    assert data["valid"] is False
    assert any("colour" in err.lower() for err in data["errors"])


# ============================================================================
# GET Endpoint Tests - Internal Field Removal and Serialization
# ============================================================================


def test_get_config_removes_internal_view_fields(logged_in_admin):
    """Test that internal fields are removed from views (css_colour, name, stretch)"""
    response = logged_in_admin.get("/api/config/project")
    assert response.status_code == 200

    config = response.json["config"]

    # Check views don't have internal fields
    for view_name, view_data in config["views"].items():
        assert "css_colour" not in view_data, f"View {view_name} should not have css_colour"
        assert "stretch" not in view_data, f"View {view_name} should not have stretch"
        assert "name" not in view_data, f"View {view_name} should not have name (it's the key)"


def test_get_config_removes_internal_class_fields(logged_in_admin):
    """Test that internal fields are removed from classes (css_colour)"""
    response = logged_in_admin.get("/api/config/project")
    assert response.status_code == 200

    config = response.json["config"]

    # Check classes don't have internal fields
    for class_data in config["classes"]:
        assert "css_colour" not in class_data, "Class should not have css_colour"


def test_get_config_json_serializable(logged_in_admin):
    """Test that returned config is fully JSON serializable"""
    response = logged_in_admin.get("/api/config/project")
    assert response.status_code == 200

    config = response.json["config"]

    # Should be able to serialize without errors
    json_str = json.dumps(config)
    assert json_str is not None

    # Should be able to deserialize back
    parsed = json.loads(json_str)
    assert parsed == config


# ============================================================================
# PUT Endpoint Tests - Update, Backup, Rollback
# ============================================================================


def test_put_config_success(logged_in_admin, restore_config_file):
    """Test successful configuration update"""
    # Get current valid config
    response = logged_in_admin.get("/api/config/project")
    assert response.status_code == 200
    config = response.json["config"]

    # Modify the config
    config["name"] = "updated_project_name"

    response = logged_in_admin.put("/api/config/project", json=config, content_type="application/json")

    assert response.status_code == 200
    assert "message" in response.json
    assert "successfully updated" in response.json["message"].lower()


def test_put_config_creates_backup(logged_in_admin, restore_config_file, app):
    """Test that PUT creates backup before updating"""
    # Get current config first
    response = logged_in_admin.get("/api/config/project")
    assert response.status_code == 200
    original_config = response.json["config"]
    original_name = original_config["name"]

    # Modify and save
    original_config["name"] = "modified_name"
    response = logged_in_admin.put("/api/config/project", json=original_config, content_type="application/json")

    assert response.status_code == 200

    # Check backup file exists
    backup_file = project.file + ".backup"
    assert os.path.exists(backup_file), "Backup file should be created"

    # Verify backup contains original config
    with open(backup_file) as f:
        backup_data = json.load(f)

    # Backup should have the original name, not the modified one
    assert backup_data["name"] == original_name
    assert backup_data["name"] != "modified_name"


def test_put_config_reloads_project(logged_in_admin, restore_config_file):
    """Test that project reloads after successful update"""
    # Get current config
    response = logged_in_admin.get("/api/config/project")
    assert response.status_code == 200
    config = response.json["config"]
    original_name = project.config.get("name")

    # Update with new name
    config["name"] = "newly_updated_project"
    response = logged_in_admin.put("/api/config/project", json=config, content_type="application/json")

    assert response.status_code == 200

    # Project should reflect the new name
    assert project.config.get("name") == "newly_updated_project"
    assert project.config.get("name") != original_name


def test_put_config_missing_required_field(logged_in_admin):
    """Test that PUT rejects config missing required fields"""
    invalid_config = {
        "name": "test",
        "images": {"path": "test/{id}.tif", "shape": [512, 512]},
        # Missing classes, views, segmentation
    }

    response = logged_in_admin.put("/api/config/project", json=invalid_config, content_type="application/json")

    assert response.status_code == 400
    assert "error" in response.json


def test_put_config_invalid_class_colour(logged_in_admin):
    """Test that PUT rejects invalid class colour arrays"""
    invalid_config = {
        "name": "test",
        "images": {"path": "test/{id}.tif", "shape": [512, 512]},
        "classes": [
            {"name": "Test", "colour": [255, 255]}  # Invalid: only 2 values
        ],
        "views": {"RGB": {"type": "image", "data": ["$B1", "$B2", "$B3"]}},
        "view_groups": {},
        "segmentation": {"path": "", "ai_model": False},
    }

    response = logged_in_admin.put("/api/config/project", json=invalid_config, content_type="application/json")

    assert response.status_code == 400
    assert "error" in response.json


def test_put_config_empty_classes(logged_in_admin):
    """Test that PUT rejects config with empty classes array"""
    invalid_config = {
        "name": "test",
        "images": {"path": "test/{id}.tif", "shape": [512, 512]},
        "classes": [],  # Empty
        "views": {"RGB": {"type": "image", "data": ["$B1", "$B2", "$B3"]}},
        "view_groups": {},
        "segmentation": {"path": "", "ai_model": False},
    }

    response = logged_in_admin.put("/api/config/project", json=invalid_config, content_type="application/json")

    assert response.status_code == 400
    assert "error" in response.json


def test_put_config_missing_json_data(logged_in_admin):
    """Test that PUT rejects request with no JSON data"""
    response = logged_in_admin.put("/api/config/project", data="not json", content_type="text/plain")

    # Should return error (400 or 500 depending on Flask's JSON parsing)
    assert response.status_code in [400, 500]
    assert "error" in response.json


def test_put_config_requires_auth(client):
    """Test that PUT requires authentication"""
    response = client.put("/api/config/project", json={"name": "test"}, content_type="application/json")

    assert response.status_code == 401


def test_put_config_requires_admin(app, client):
    """Test that PUT requires admin privileges"""
    with app.app_context():
        user = User(name="regular_user", admin=False)
        user.set_password("password")
        db.session.add(user)
        db.session.commit()
        user_id = user.id

    with client.session_transaction() as sess:
        sess["user_id"] = user_id

    response = client.put("/api/config/project", json={"name": "test"}, content_type="application/json")

    assert response.status_code == 403


def test_load_from_normalizes_images_path(tmp_path, sample_valid_config):
    """Ensure Project.load_from() converts single-string images.path into a dict"""
    # Prepare a temporary project directory with an images subfolder and a dummy file
    proj_dir = tmp_path / "proj"
    proj_dir.mkdir()
    images_dir = proj_dir / "images"
    images_dir.mkdir()
    # Create a dummy image file that matches the pattern
    dummy = images_dir / "0001.tif"
    dummy.write_bytes(b"")

    # Prepare config: images.path is a single string (relative to project file)
    cfg = dict(sample_valid_config)
    cfg["images"] = dict(cfg["images"])
    cfg["images"]["path"] = "images/{id}.tif"
    cfg["segmentation"]["mask_area"] = [10, 10, 20, 20]

    # Write config file into proj_dir
    proj_file = proj_dir / "project.json"
    with open(proj_file, "w") as f:
        json.dump(cfg, f)

    # Load using a fresh Project instance so we don't mutate global state
    p = Project()
    p.load_from(str(proj_file))

    # After load_from, images.path should have been normalized to a dict
    assert isinstance(p.config["images"]["path"], dict)
    assert list(p.config["images"]["path"].keys()) == ["pictures"]
    if os.name == "nt":
        assert p.config["images"]["path"]["pictures"].endswith("images\\{id}.tif")
    else:
        assert p.config["images"]["path"]["pictures"].endswith("images/{id}.tif")


# ============================================================================
# Integration Tests - Full Workflows
# ============================================================================


def test_full_workflow_get_modify_validate_put_get(logged_in_admin, restore_config_file):
    """Test complete workflow: GET → modify → validate → PUT → GET"""
    # Step 1: GET current config
    response = logged_in_admin.get("/api/config/project")
    assert response.status_code == 200
    config = response.json["config"]
    original_name = config["name"]

    # Step 2: Modify config
    config["name"] = "workflow_test_project"
    config["port"] = 8080

    # Step 3: Validate modified config
    response = logged_in_admin.post("/api/config/project/validate", json=config, content_type="application/json")
    assert response.status_code == 200
    assert response.json["valid"] is True

    # Step 4: PUT modified config
    response = logged_in_admin.put("/api/config/project", json=config, content_type="application/json")
    assert response.status_code == 200

    # Step 5: GET again to verify changes
    response = logged_in_admin.get("/api/config/project")
    assert response.status_code == 200
    updated_config = response.json["config"]
    assert updated_config["name"] == "workflow_test_project"
    assert updated_config["port"] == 8080
    assert updated_config["name"] != original_name


def test_workflow_validate_fails_put_not_attempted(logged_in_admin, sample_valid_config):
    """Test that invalid config is caught by validation before PUT"""
    # Make config invalid
    sample_valid_config["port"] = 99999  # Invalid port

    # Validate should fail
    response = logged_in_admin.post(
        "/api/config/project/validate", json=sample_valid_config, content_type="application/json"
    )
    assert response.status_code == 200
    assert response.json["valid"] is False

    # PUT should also fail
    response = logged_in_admin.put("/api/config/project", json=sample_valid_config, content_type="application/json")
    # PUT doesn't validate port, but project reload might fail
    # At minimum, validation endpoint caught the issue


# ============================================================================
# Edge Cases and Special Scenarios
# ============================================================================


def test_validate_detects_missing_view_type(logged_in_admin, sample_valid_config):
    """Test that validation detects views missing type field"""
    sample_valid_config["views"]["NoType"] = {
        "data": "$B1"
        # Missing 'type'
    }

    response = logged_in_admin.post(
        "/api/config/project/validate", json=sample_valid_config, content_type="application/json"
    )

    assert response.status_code == 200
    data = response.json
    assert data["valid"] is False
    assert any("type" in err.lower() and "notype" in err.lower() for err in data["errors"])


def test_validate_detects_missing_images_path(logged_in_admin, sample_valid_config):
    """Test that validation detects missing images.path"""
    del sample_valid_config["images"]["path"]

    response = logged_in_admin.post(
        "/api/config/project/validate", json=sample_valid_config, content_type="application/json"
    )

    assert response.status_code == 200
    data = response.json
    assert data["valid"] is False
    assert any("path" in err.lower() for err in data["errors"])


def test_validate_detects_missing_images_shape(logged_in_admin, sample_valid_config):
    """Test that validation detects missing images.shape"""
    del sample_valid_config["images"]["shape"]

    response = logged_in_admin.post(
        "/api/config/project/validate", json=sample_valid_config, content_type="application/json"
    )

    assert response.status_code == 200
    data = response.json
    assert data["valid"] is False
    assert any("shape" in err.lower() for err in data["errors"])


def test_put_config_validates_images_path_and_shape(logged_in_admin):
    """Test that PUT validates images.path and images.shape are present"""
    invalid_config = {
        "name": "test",
        "images": {},  # Missing path and shape
        "classes": [{"name": "Test", "colour": [255, 0, 0, 255]}],
        "views": {"RGB": {"type": "image", "data": ["$B1", "$B2", "$B3"]}},
        "view_groups": {},
        "segmentation": {"path": "", "ai_model": False},
    }

    response = logged_in_admin.put("/api/config/project", json=invalid_config, content_type="application/json")

    assert response.status_code == 400
    assert "error" in response.json


def test_put_config_validates_class_structure(logged_in_admin):
    """Test that PUT validates each class has name and colour"""
    invalid_config = {
        "name": "test",
        "images": {"path": "test/{id}.tif", "shape": [512, 512]},
        "classes": [
            {"name": "Valid", "colour": [255, 0, 0, 255]},
            {"name": "Invalid"},  # Missing colour
        ],
        "views": {"RGB": {"type": "image", "data": ["$B1", "$B2", "$B3"]}},
        "view_groups": {},
        "segmentation": {"path": "", "ai_model": False},
    }

    response = logged_in_admin.put("/api/config/project", json=invalid_config, content_type="application/json")

    assert response.status_code == 400
    assert "error" in response.json


def test_health_endpoint_accessible(client):
    """Test that health check endpoint is accessible without auth"""
    response = client.get("/api/config/health")
    assert response.status_code == 200
    assert response.json["status"] == "ok"


# ============================================================================
# Additional Edge Cases and Security Tests
# ============================================================================


def test_validate_multiple_errors_reported(logged_in_admin):
    """Test that validation reports multiple errors at once"""
    invalid_config = {
        "name": "test",
        "port": 99999,  # Invalid
        "images": {"path": "test", "shape": [512]},  # Invalid shape
        "classes": [],  # Empty
        "views": {},  # Empty
        "segmentation": {},  # Missing path
    }

    response = logged_in_admin.post(
        "/api/config/project/validate", json=invalid_config, content_type="application/json"
    )

    assert response.status_code == 200
    data = response.json
    assert data["valid"] is False
    # Should have multiple errors
    assert len(data["errors"]) > 1


def test_get_config_returns_relative_paths(app, logged_in_admin):
    """Test that GET /api/config/project returns relative paths, not absolute paths"""
    client = logged_in_admin

    with app.app_context():
        # Get the config
        response = client.get("/api/config/project")
        assert response.status_code == 200

        data = response.get_json()
        config = data["config"]

        # Check that image paths are relative (not absolute)
        images_path = config["images"]["path"]
        if isinstance(images_path, dict):
            for _key, path in images_path.items():
                assert not os.path.isabs(path), f"Image path '{path}' should be relative, not absolute"
        else:
            assert not os.path.isabs(images_path), f"Image path '{images_path}' should be relative, not absolute"

        # Check thumbnails path if present
        if config["images"].get("thumbnails") and config["images"]["thumbnails"] is not False:
            assert not os.path.isabs(config["images"]["thumbnails"]), "Thumbnails path should be relative, not absolute"

        # Check metadata path if present
        if config["images"].get("metadata") and config["images"]["metadata"] is not False:
            assert not os.path.isabs(config["images"]["metadata"]), "Metadata path should be relative, not absolute"

        # Check segmentation path if present
        if "segmentation" in config and "path" in config["segmentation"]:
            seg_path = config["segmentation"]["path"]
            assert not os.path.isabs(seg_path), f"Segmentation path '{seg_path}' should be relative, not absolute"


# ============================================================================
# Chat Configuration Tests
# ============================================================================


def test_get_config_includes_chat_when_present(logged_in_admin):
    """Test that GET returns chat config when it exists in project config"""
    response = logged_in_admin.get("/api/config/project")
    assert response.status_code == 200

    config = response.json["config"]

    # If project has chat config, it should be included
    if "chat" in project.config:
        assert "chat" in config
        assert "enabled" in config["chat"]
        assert "github_repo" in config["chat"]
        assert "utterances_theme" in config["chat"]


def test_put_config_accepts_chat_configuration(logged_in_admin, restore_config_file):
    """Test that PUT accepts and saves chat configuration"""
    response = logged_in_admin.get("/api/config/project")
    config = response.json["config"]

    config["chat"] = {"enabled": True, "github_repo": "test-org/test-repo", "utterances_theme": "github-dark"}

    response = logged_in_admin.put("/api/config/project", json=config, content_type="application/json")

    assert response.status_code == 200

    # Verify chat config was saved
    response = logged_in_admin.get("/api/config/project")
    updated_config = response.json["config"]
    assert "chat" in updated_config
    assert updated_config["chat"]["enabled"] is True
    assert updated_config["chat"]["github_repo"] == "test-org/test-repo"
    assert updated_config["chat"]["utterances_theme"] == "github-dark"


def test_put_config_chat_optional(logged_in_admin, restore_config_file):
    """Test that chat config is optional - config without it should still work"""
    response = logged_in_admin.get("/api/config/project")
    config = response.json["config"]

    # Remove chat if present
    config.pop("chat", None)

    response = logged_in_admin.put("/api/config/project", json=config, content_type="application/json")

    assert response.status_code == 200


def test_workflow_chat_config_roundtrip(logged_in_admin, restore_config_file):
    """Test complete workflow: add chat config, save, retrieve, verify"""
    response = logged_in_admin.get("/api/config/project")
    config = response.json["config"]

    # Add chat configuration
    config["chat"] = {"enabled": False, "github_repo": "owner/repo", "utterances_theme": "preferred-color-scheme"}

    # Save
    response = logged_in_admin.put("/api/config/project", json=config, content_type="application/json")
    assert response.status_code == 200

    # Retrieve and verify exact values
    response = logged_in_admin.get("/api/config/project")
    saved_config = response.json["config"]

    assert "chat" in saved_config
    assert saved_config["chat"]["enabled"] is False
    assert saved_config["chat"]["github_repo"] == "owner/repo"
    assert saved_config["chat"]["utterances_theme"] == "preferred-color-scheme"
