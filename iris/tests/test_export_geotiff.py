"""
Tests for GeoTIFF export endpoint
"""

import json
from unittest.mock import MagicMock, patch

import flask
import numpy as np


class TestGeoTIFFExport:
    """Test GeoTIFF export functionality"""

    def test_export_geotiff_success(self, client, logged_in_user, project_snapshot):
        """
        Test successful GeoTIFF export with annotated mask overlay.

        This test validates the complete export workflow:
        1. User authentication via session (not JWT - legacy compatibility)
        2. Loading user's segmentation mask from storage
        3. Rendering RGB composite using IRIS rendering engine
        4. Creating 4-band GeoTIFF (RGB + mask as 4th band)
        5. Proper HTTP headers for file download

        The export uses session-based auth to maintain compatibility with
        the legacy Flask frontend that doesn't use JWT tokens.
        """
        # Use a test image ID
        image_id = 'test_image_001'

        # Mock the mask reading to simulate existing user annotations
        # Note: rasterio is imported inside the function
        with patch('iris.segmentation.read_masks') as mock_read, \
             patch('iris.segmentation.api.project') as mock_project, \
             patch('rasterio.open') as mock_rio_open, \
             patch('tempfile.NamedTemporaryFile') as mock_temp:

            # Create realistic mask data (2x2 for simplicity)
            # final_mask: segmentation classes (0=background, 1=class1, 2=class2)
            # user_mask: boolean array indicating which pixels user has annotated
            final_mask = np.array([[0, 1], [2, 1]], dtype=np.uint8)
            user_mask = np.array([[True, True], [True, False]], dtype=bool)
            mock_read.return_value = (final_mask, user_mask)

            # Mock project configuration - set image_ids as a list attribute
            mock_project.image_ids = [image_id]
            mock_project.get_image_path.return_value = '/path/to/image.tif'
            mock_project.config = {
                'views': {
                    'RGB': {
                        'type': 'image',
                        'data': ['$Sentinel2.B4', '$Sentinel2.B3', '$Sentinel2.B2']
                    }
                }
            }

            # Mock IRIS rendering engine output (RGB composite as user sees it)
            mock_project.render_image.return_value = np.random.randint(
                0, 255, (2, 2, 3), dtype=np.uint8
            )

            # Mock temporary file for GeoTIFF output
            mock_temp_file = MagicMock()
            mock_temp_file.name = '/tmp/test_export.tif'
            mock_temp.return_value = mock_temp_file

            # Mock rasterio write operations
            mock_dst = MagicMock()
            mock_rio_open.return_value.__enter__ = MagicMock(return_value=mock_dst)
            mock_rio_open.return_value.__exit__ = MagicMock(return_value=False)

            # Mock flask.send_file to avoid actual file operations
            with patch('iris.segmentation.api.flask.send_file') as mock_send:
                mock_send.return_value = flask.Response(
                    b'mock_geotiff_data',
                    mimetype='image/tiff',
                    headers={
                        'Content-Disposition': f'attachment; filename={image_id}_annotated.tif'
                    }
                )

                # Execute the export request
                response = client.get(f'/segmentation/api/export-geotiff/{image_id}')

                # Verify successful export
                assert response.status_code == 200
                assert response.headers['Content-Type'] == 'image/tiff'
                assert 'Content-Disposition' in response.headers
                assert f'{image_id}_annotated.tif' in response.headers['Content-Disposition']

                # Verify the rendering engine was called with correct view
                mock_project.render_image.assert_called_once()

                # Verify rasterio was used to write 4-band GeoTIFF
                mock_dst.write.assert_called()
                # Should write 4 bands: R, G, B, and mask
                assert mock_dst.write.call_count == 4

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
