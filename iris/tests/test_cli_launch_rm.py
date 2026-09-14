import json
from unittest.mock import patch

import pytest

from iris import find_config_file, handle_launch_command, handle_rm_command


class TestLaunchCommand:
    """Test the launch command functionality."""

    def test_launch_existing_project(self, tmp_path, monkeypatch):
        """Should launch existing project with config file."""
        project_dir = tmp_path / "test-project"
        project_dir.mkdir()
        config_file = project_dir / "cloud-segmentation.json"
        config_file.write_text('{"name": "test"}')

        monkeypatch.chdir(tmp_path)
        result = handle_launch_command("test-project")
        assert result == config_file.resolve()

    def test_launch_creates_new_project(self, tmp_path, monkeypatch):
        """Should create new project from demo when folder doesn't exist."""
        demo_dir = tmp_path / "demo"
        demo_dir.mkdir()
        demo_config = demo_dir / "cloud-segmentation.json"
        demo_config.write_text('{"name": "demo"}')

        monkeypatch.chdir(tmp_path)
        result = handle_launch_command("new-project")

        new_project_dir = tmp_path / "new-project"
        expected_config = new_project_dir / "new-project.json"
        assert new_project_dir.exists()
        assert expected_config.exists()
        assert result == expected_config.resolve()
        dconfig = json.loads(expected_config.read_text(encoding="utf-8"))
        assert dconfig["name"] == "new-project"


class TestRmCommand:
    """Test the rm command functionality."""

    def test_rm_with_confirmation(self, tmp_path, monkeypatch):
        """Should remove folder when user confirms."""
        project_dir = tmp_path / "test-project"
        project_dir.mkdir()

        monkeypatch.chdir(tmp_path)
        with patch('builtins.input', return_value='y'):
            handle_rm_command("test-project")
            assert not project_dir.exists()

    def test_rm_cancelled(self, tmp_path, monkeypatch):
        """Should not remove folder when user cancels."""
        project_dir = tmp_path / "test-project"
        project_dir.mkdir()

        monkeypatch.chdir(tmp_path)
        with patch('builtins.input', return_value='n'):
            handle_rm_command("test-project")
            assert project_dir.exists()




class TestConfigFileFinding:
    """Test config file discovery logic."""

    def test_prefers_cloud_segmentation_json(self, tmp_path):
        """Should prefer cloud-segmentation.json over other files."""
        config1 = tmp_path / "cloud-segmentation.json"
        config2 = tmp_path / "other-config.json"
        config1.write_text('{"name": "cloud-seg"}')
        config2.write_text('{"name": "other"}')

        result = find_config_file(tmp_path)
        assert result == config1.resolve()

    def test_fallback_to_any_json(self, tmp_path):
        """Should use any .json file as fallback."""
        config_file = tmp_path / "my-config.json"
        config_file.write_text('{"name": "test"}')

        result = find_config_file(tmp_path)
        assert result == config_file.resolve()


class TestErrorHandling:
    """Test specific error types and edge cases."""

    def test_launch_empty_folder_name_raises_value_error(self):
        """Should raise ValueError for empty folder name."""
        with pytest.raises(ValueError, match="Launch command requires a folder name"):
            handle_launch_command("")

        with pytest.raises(ValueError, match="Launch command requires a folder name"):
            handle_launch_command(None)

    def test_launch_missing_demo_raises_file_not_found(self, tmp_path, monkeypatch):
        """Should raise FileNotFoundError when demo folder missing."""
        monkeypatch.chdir(tmp_path)
        with pytest.raises(FileNotFoundError, match="Demo folder not found"):
            handle_launch_command("new-project")

    def test_launch_no_config_raises_error(self, tmp_path, monkeypatch):
        """Should raise error when project has no config file."""
        project_dir = tmp_path / "test-project"
        project_dir.mkdir()

        monkeypatch.chdir(tmp_path)
        with pytest.raises(RuntimeError, match="No suitable config file found"):
            handle_launch_command("test-project")

    def test_rm_empty_folder_name_raises_value_error(self):
        """Should raise ValueError for empty folder name."""
        with pytest.raises(ValueError, match="Remove command requires a folder name"):
            handle_rm_command("")

        with pytest.raises(ValueError, match="Remove command requires a folder name"):
            handle_rm_command(None)

    def test_rm_demo_folder_blocked(self):
        """Should prevent deletion of demo folder."""
        with pytest.raises(ValueError, match="Cannot remove the demo folder"):
            handle_rm_command("demo")
