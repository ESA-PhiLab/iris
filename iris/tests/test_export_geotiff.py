"""
Tests for GeoTIFF export endpoint
"""

import json
from unittest.mock import patch

import numpy as np


class TestGeoTIFFExport:
    """Test GeoTIFF export functionality"""

    def test_export_geotiff_success(self, client, logged_in_user, project_snapshot, tmp_path):
        """
        Test successful GeoTIFF export with annotated mask overlay.

        The export contains the RGB view and the user's mask (4 bands), cropped
        to the mask area and georeferenced like the image.
        """
        from rasterio.io import MemoryFile

        from iris.project import project
        from iris.segmentation import get_mask_filename, write_mask_cog

        project['path'] = str(tmp_path)
        image_id = project.image_ids[0]

        width, height = project['segmentation']['mask_shape']
        final_mask = np.random.RandomState(0).randint(0, 4, (height, width)).astype(np.uint8)
        user_mask = np.ones((height, width), dtype=np.uint8)
        write_mask_cog(
            get_mask_filename(image_id, logged_in_user.id), image_id,
            np.stack([final_mask, user_mask])
        )

        response = client.get(f'/segmentation/api/export-geotiff/{image_id}')

        assert response.status_code == 200
        assert response.headers['Content-Type'] == 'image/tiff'
        assert f'{image_id}_annotated.tif' in response.headers['Content-Disposition']

        crs, transform, _, _ = project.get_georef(image_id)
        x0, y0 = project['segmentation']['mask_area'][:2]
        with MemoryFile(response.data) as memfile, memfile.open() as exported:
            assert exported.count == 4
            assert (exported.width, exported.height) == (width, height)
            assert exported.crs == crs
            assert exported.transform * (0, 0) == transform * (x0, y0)
            assert np.array_equal(exported.read(4), final_mask)
            assert exported.descriptions == ('Red', 'Green', 'Blue', 'Segmentation Mask')

    def test_export_geotiff_no_mask(self, client, logged_in_user, project_snapshot):
        """
        Test GeoTIFF export fails gracefully when user hasn't created a mask yet.

        This validates that:
        1. The endpoint checks for mask existence before processing
        2. Returns appropriate 404 error with helpful message
        3. Doesn't attempt to create GeoTIFF without mask data

        This prevents users from exporting incomplete/empty annotations.
        """
        # Use a test image ID
        image_id = 'test_image_001'

        # Mock project to return valid image_ids
        with patch('iris.segmentation.api.project') as mock_project, \
             patch('iris.segmentation.read_masks') as mock_read:

            mock_project.image_ids = [image_id]

            # Simulate missing mask file (user hasn't annotated this image yet)
            mock_read.side_effect = FileNotFoundError('Mask file not found')

            response = client.get(f'/segmentation/api/export-geotiff/{image_id}')

            # Verify appropriate error response
            assert response.status_code == 404
            response_data = json.loads(response.data)
            assert 'error' in response_data
            assert 'No mask data available' in response_data['error']
            # Verify helpful message guides user to create mask first
            assert 'save a mask' in response_data['message']

    def test_export_geotiff_no_auth(self, client, project_snapshot):
        """
        Test GeoTIFF export requires authentication.

        This validates security: users must be logged in to export their annotations.
        The endpoint uses session-based auth (not JWT) for legacy frontend compatibility.
        """
        # Use a test image ID
        image_id = 'test_image_001'

        # Mock project to have valid image_ids
        with patch('iris.segmentation.api.project') as mock_project:
            mock_project.image_ids = [image_id]

            # Attempt export without authentication (no session)
            response = client.get(f'/segmentation/api/export-geotiff/{image_id}')

            # Verify authentication is required
            # The @requires_auth decorator returns 403 Forbidden
            assert response.status_code == 403
