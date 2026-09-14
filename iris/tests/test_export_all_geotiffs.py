"""
Tests for bulk GeoTIFF export functionality.

This module tests the export-all feature for both the API endpoint
and CLI command.
"""


class TestExportAllGeoTIFFsAPI:
    """Test /admin/api/export-all-geotiffs endpoint."""

    def test_export_all_requires_admin(self, client, logged_in_user):
        """Test that only admins can export all GeoTIFFs."""
        response = client.post(
            "/admin/api/export-all-geotiffs", json={"output_dir": "exports"}, content_type="application/json"
        )
        assert response.status_code == 403

    def test_export_all_with_admin(self, client, app, logged_in_user, tmp_path):
        """Test that admin can access the export endpoint."""
        from iris.models import User, db

        # Make the logged_in_user an admin
        with app.app_context():
            user = User.query.get(logged_in_user.id)
            user.admin = True
            db.session.commit()

        # Create temporary output directory
        output_dir = str(tmp_path / "test_exports")

        # The endpoint should at least be accessible (may fail due to missing project data)
        response = client.post(
            "/admin/api/export-all-geotiffs", json={"output_dir": output_dir}, content_type="application/json"
        )

        # Should either succeed (200) or fail gracefully (500), but not 403
        assert response.status_code in [200, 500]


class TestExportAllCLI:
    """Test CLI export-all command."""

    def test_cli_export_all_help(self):
        """Test that CLI help works for export-all command."""
        import subprocess
        import sys

        proc = subprocess.run(
            [sys.executable, "-m", "iris.cli", "export-all", "--help"], capture_output=True, text=True
        )

        output = (proc.stdout or "") + (proc.stderr or "")
        assert proc.returncode == 0
        assert "export" in output.lower()

    def test_cli_export_all_missing_project(self):
        """Test that CLI fails gracefully when project file doesn't exist."""
        import subprocess
        import sys

        proc = subprocess.run(
            [sys.executable, "-m", "iris.cli", "export-all", "nonexistent.json"], capture_output=True, text=True
        )

        output = (proc.stdout or "") + (proc.stderr or "")
        assert proc.returncode == 1
        assert "not found" in output.lower() or "error" in output.lower()
