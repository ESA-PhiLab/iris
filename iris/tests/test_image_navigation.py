"""
Tests for image navigation functionality.

This module tests the centralized image navigation system that provides
a single source of truth for image lists and navigation state in the
React segmentation interface.

The image navigation system consists of:
- API endpoint for fetching image lists with annotation status
- Tracking of user-specific and global annotation progress
- Support for multi-user collaboration workflows
"""
from iris import db
from iris.models import Action, User
from iris.project import project


class TestImageNavigationAPI:
    """
    Test the image navigation API endpoints.

    These tests verify that the centralized image navigation system works correctly,
    providing a single source of truth for image lists and navigation state.
    """

    def test_list_images_requires_auth(self, client):
        """
        Test that unauthenticated users cannot access image list.

        Why: Security - image lists may contain sensitive project information.

        Expected: 403 Forbidden response
        """
        response = client.get('/segmentation/api/images/list')
        assert response.status_code == 403

    def test_list_images_returns_all_project_images(self, client, logged_in_user):
        """
        Test that all project images are returned.

        Why: Completeness - the navigation store needs the complete list to provide
        accurate prev/next navigation and show total image count.

        Expected: Number of images matches project.image_ids length
        """
        response = client.get('/segmentation/api/images/list?current_image_id=image_001')
        data = response.get_json()

        # Should return all images from the project
        assert len(data['images']) == len(project.image_ids), \
            "Should return all project images"

        # All project images should be in the response
        returned_ids = {img['image_id'] for img in data['images']}
        project_ids = set(project.image_ids)
        assert returned_ids == project_ids, \
            "Returned image IDs should match project image IDs"

    def test_annotation_status_tracking(self, client, logged_in_user, app):
        """
        Test that annotation status is correctly tracked per image.

        Why: Feature correctness - the navigation dropdown shows different icons
        for images with user annotations vs other users' annotations vs no annotations.
        This is a key feature for tracking progress.

        Expected: Annotation flags are accurate based on actual Action records
        """
        # Get the first image ID
        first_image_id = project.image_ids[0]

        # Initially, no annotations should exist
        response = client.get(f'/segmentation/api/images/list?current_image_id={first_image_id}')
        data = response.get_json()

        first_image = next(img for img in data['images'] if img['image_id'] == first_image_id)
        assert not first_image['has_user_annotation'], "Should have no user annotation initially"
        assert not first_image['has_any_annotation'], "Should have no annotations initially"
        assert first_image['annotation_count'] == 0, "Should have zero annotations initially"

        # Create an annotation for the current user
        with app.app_context():
            action = Action(
                type='segmentation',
                image_id=first_image_id,
                user_id=logged_in_user.id,
                score=85
            )
            db.session.add(action)
            db.session.commit()

        # Now the image should show user annotation
        response = client.get(f'/segmentation/api/images/list?current_image_id={first_image_id}')
        data = response.get_json()

        first_image = next(img for img in data['images'] if img['image_id'] == first_image_id)
        assert first_image['has_user_annotation'], "Should have user annotation now"
        assert first_image['has_any_annotation'], "Should have any annotation now"
        assert first_image['annotation_count'] == 1, "Should have one annotation"

    def test_multi_user_annotation_tracking(self, client, logged_in_user, app):
        """
        Test that annotations from multiple users are tracked correctly.

        Why: Collaboration feature - when multiple users annotate the same image,
        the system should distinguish between "current user annotated" vs
        "other users annotated" for proper UI indicators.

        Expected: has_user_annotation only true for current user's annotations,
        but annotation_count includes all users
        """
        # Get the second image ID
        second_image_id = project.image_ids[1] if len(project.image_ids) > 1 else project.image_ids[0]

        # Create another user
        with app.app_context():
            other_user = User(name='other_annotator')
            other_user.set_password('password')
            db.session.add(other_user)
            db.session.commit()
            other_user_id = other_user.id

        # Other user annotates the image
        with app.app_context():
            action = Action(
                type='segmentation',
                image_id=second_image_id,
                user_id=other_user_id,
                score=90
            )
            db.session.add(action)
            db.session.commit()

        # Current user checks the list
        response = client.get(f'/segmentation/api/images/list?current_image_id={second_image_id}')
        data = response.get_json()

        second_image = next(img for img in data['images'] if img['image_id'] == second_image_id)
        assert not second_image['has_user_annotation'], "Current user hasn't annotated"
        assert second_image['has_any_annotation'], "Other user has annotated"
        assert second_image['annotation_count'] == 1, "Should count other user's annotation"

        # Now current user also annotates
        with app.app_context():
            action = Action(
                type='segmentation',
                image_id=second_image_id,
                user_id=logged_in_user.id,
                score=88
            )
            db.session.add(action)
            db.session.commit()

        # Check again
        response = client.get(f'/segmentation/api/images/list?current_image_id={second_image_id}')
        data = response.get_json()

        second_image = next(img for img in data['images'] if img['image_id'] == second_image_id)
        assert second_image['has_user_annotation'], "Current user has now annotated"
        assert second_image['has_any_annotation'], "Still has annotations"
        assert second_image['annotation_count'] == 2, "Should count both users' annotations"
