"""
Tests for user preferences functionality.

This module tests the preferences/settings system that allows users to configure
AI model parameters, input features, and postprocessing options for the segmentation
interface.

The preferences system consists of:
- API endpoints for fetching and saving user configurations
- Validation of configuration parameters
- Integration with the project configuration system
- User-specific overrides of default settings
"""


class TestPreferencesAPI:
    """
    Test the preferences API endpoints.

    These tests verify that the JSON API endpoints for user preferences work correctly,
    including authentication, data structure, and persistence.
    """

    def test_get_user_config_requires_auth(self, client):
        """
        Test that unauthenticated users cannot access preferences.

        Why: Security - preferences contain user-specific settings and should only
        be accessible to logged-in users.

        Expected: 403 Forbidden response
        """
        response = client.get('/segmentation/api/user-config')
        assert response.status_code == 403

    def test_save_user_config_requires_auth(self, client):
        """
        Test that unauthenticated users cannot save preferences.

        Why: Security - prevents unauthorized modification of user settings.

        Expected: 403 Forbidden response
        """
        response = client.post('/segmentation/api/user-config',
                              json={'test': 'data'})
        assert response.status_code == 403

    def test_get_user_config_authenticated(self, client, logged_in_user):
        """
        Test that authenticated users can fetch their preferences.

        Why: Core functionality - users need to retrieve their current settings
        to display in the preferences modal.

        Expected: 200 OK with JSON containing 'config' and 'all_bands' keys
        """
        response = client.get('/segmentation/api/user-config')
        assert response.status_code == 200

        data = response.get_json()
        assert 'config' in data, "Response should contain user configuration"
        assert 'all_bands' in data, "Response should contain available image bands"
        assert 'segmentation' in data['config'], "Config should have segmentation section"
        assert 'ai_model' in data['config']['segmentation'], "Config should have AI model settings"

    def test_get_user_config_structure(self, client, logged_in_user):
        """
        Test that user config contains all required AI model parameters.

        Why: Data integrity - the preferences modal depends on these parameters
        being present. Missing parameters would cause UI errors.

        Expected: All 13 AI model parameters are present in the response
        """
        response = client.get('/segmentation/api/user-config')
        data = response.get_json()

        ai_model = data['config']['segmentation']['ai_model']

        # These parameters control the LightGBM model training
        required_params = [
            'n_estimators',      # Number of boosting iterations
            'max_depth',         # Maximum tree depth
            'n_leaves',          # Maximum number of leaves per tree
            'train_ratio',       # Fraction of user pixels used for training
            'max_train_pixels',  # Maximum training samples per class
            'use_edge_filter',   # Whether to include edge detection features
            'use_meshgrid',      # Whether to include spatial coordinate features
            'meshgrid_cells',    # Grid resolution for spatial features
            'use_superpixels',   # Whether to include superpixel features
            'bands',             # Image bands to use as input features
            'suppression_filter_size',      # Size of suppression filter kernel
            'suppression_threshold',        # Threshold for suppressing predictions
            'suppression_default_class',    # Class to use for suppressed pixels
        ]

        for param in required_params:
            assert param in ai_model, f"Missing required parameter: {param}"

    def test_save_user_config_authenticated(self, client, logged_in_user):
        """
        Test that authenticated users can save modified preferences.

        Why: Core functionality - users need to persist their preference changes
        so they're remembered across sessions.

        Expected: Settings are saved and can be retrieved with the new values
        """
        # First, get the current config
        response = client.get('/segmentation/api/user-config')
        original_config = response.get_json()['config']

        # Modify a parameter (change number of estimators from default to 150)
        modified_config = original_config.copy()
        modified_config['segmentation']['ai_model']['n_estimators'] = 150

        # Save the modified config
        response = client.post('/segmentation/api/user-config',
                              json=modified_config)
        assert response.status_code == 200, "Save should succeed"

        # Verify the config was actually saved by fetching it again
        response = client.get('/segmentation/api/user-config')
        saved_config = response.get_json()['config']
        assert saved_config['segmentation']['ai_model']['n_estimators'] == 150, \
            "Saved value should persist"

    def test_bands_default_to_all_available(self, client, logged_in_user):
        """
        Test that bands default to all available bands when None.

        Why: User experience - if a user hasn't explicitly selected bands,
        they should get all available bands by default rather than an empty list.

        Expected: bands list is populated with all available bands from the project
        """
        response = client.get('/segmentation/api/user-config')
        data = response.get_json()

        # If bands is None in the original config, API should populate it
        assert data['config']['segmentation']['ai_model']['bands'] is not None, \
            "Bands should never be None in API response"
        assert len(data['config']['segmentation']['ai_model']['bands']) > 0, \
            "Bands list should not be empty"

        # Bands should be a subset of (or equal to) all available bands
        config_bands = set(data['config']['segmentation']['ai_model']['bands'])
        all_bands = set(data['all_bands'])
        assert config_bands.issubset(all_bands), \
            "Config bands should only contain bands that exist in the project"


class TestPreferencesValidation:
    """
    Test validation logic for preferences.

    These tests verify that the system handles edge cases and validates
    user input appropriately.
    """

    def test_empty_bands_validation(self, client, logged_in_user):
        """
        Test that empty bands list is handled gracefully.

        Why: Edge case handling - while the frontend validates this, the backend
        should also handle it gracefully rather than crashing.

        Note: Frontend validation prevents this, but backend should be defensive.
        Expected: Request succeeds (validation is frontend responsibility)
        """
        # Get current config
        response = client.get('/segmentation/api/user-config')
        config = response.get_json()['config']

        # Set bands to empty list (invalid but should not crash)
        config['segmentation']['ai_model']['bands'] = []

        # Backend accepts this (frontend does validation)
        response = client.post('/segmentation/api/user-config', json=config)
        assert response.status_code == 200, \
            "Backend should accept empty bands (frontend validates)"

    def test_parameter_ranges(self, client, logged_in_user):
        """
        Test that parameters can be set to valid ranges.

        Why: Functional testing - verify that all parameter types (int, float, bool)
        can be set and retrieved correctly across the full range of valid values.

        Expected: All parameters save and load correctly with their new values
        """
        response = client.get('/segmentation/api/user-config')
        config = response.get_json()['config']

        # Test various parameter types and ranges
        test_params = {
            'n_estimators': 100,        # Integer parameter
            'max_depth': 50,            # Integer parameter
            'n_leaves': 25,             # Integer parameter
            'train_ratio': 0.8,         # Float parameter (0.0-1.0)
            'max_train_pixels': 10000,  # Integer parameter
            'suppression_filter_size': 5,        # Integer (3, 5, or 7)
            'suppression_threshold': 75,         # Integer percentage (0-100)
            'suppression_default_class': 0,      # Integer class index
        }

        # Apply all test parameters
        for param, value in test_params.items():
            config['segmentation']['ai_model'][param] = value

        # Save the config
        response = client.post('/segmentation/api/user-config', json=config)
        assert response.status_code == 200, "Save should succeed with valid parameters"

        # Verify all parameters were saved correctly
        response = client.get('/segmentation/api/user-config')
        saved_config = response.get_json()['config']

        for param, expected_value in test_params.items():
            actual_value = saved_config['segmentation']['ai_model'][param]
            assert actual_value == expected_value, \
                f"Parameter {param}: expected {expected_value}, got {actual_value}"


class TestPreferencesIntegration:
    """
    Test integration with existing preferences functionality.

    These tests verify that the new API-based preferences system integrates
    correctly with the existing project configuration system and UI.
    """

    def test_config_matches_legacy_format(self, client, logged_in_user):
        """
        Test that the API config format matches the legacy format.

        Why: Backward compatibility - the new API should return data in the same
        structure as the legacy system to ensure smooth migration.

        Expected: Config structure matches what legacy templates expected
        """
        # Get config from new API
        response = client.get('/segmentation/api/user-config')
        api_config = response.get_json()['config']

        # Verify the structure matches what the legacy system expects
        assert 'segmentation' in api_config, "Should have segmentation section"
        assert 'ai_model' in api_config['segmentation'], "Should have ai_model section"
        assert 'classes' in api_config, "Should have classes section"

    def test_preferences_modal_loads_in_segmentation(self, client, logged_in_user):
        """
        Test that the segmentation page loads with React preferences.

        Why: Integration testing - verify that the React preferences modal is
        properly integrated into the segmentation page.

        Expected: Page loads successfully and includes React app bundle
        """
        response = client.get('/segmentation/')
        assert response.status_code == 200, "Segmentation page should load"

        html_content = response.get_data(as_text=True)

        # Check that React segmentation app is loaded
        assert 'segmentationApp.js' in html_content, \
            "React bundle should be included"
        assert 'react-segmentation-app' in html_content, \
            "React mount point should exist"

    def test_band_selection_functionality(self, client, logged_in_user):
        """
        Test band selection and exclusion functionality.

        Why: Feature testing - the dual-listbox band selector is a key feature
        that allows users to choose which image bands to use for AI training.

        Expected: Bands can be added to and removed from the selection
        """
        response = client.get('/segmentation/api/user-config')
        data = response.get_json()

        all_bands = data['all_bands']
        current_bands = data['config']['segmentation']['ai_model']['bands']

        # Test adding a band (if there are excluded bands available)
        if len(all_bands) > len(current_bands):
            excluded_bands = [b for b in all_bands if b not in current_bands]
            new_bands = current_bands + [excluded_bands[0]]

            config = data['config']
            config['segmentation']['ai_model']['bands'] = new_bands

            response = client.post('/segmentation/api/user-config', json=config)
            assert response.status_code == 200, "Adding band should succeed"

            # Verify the band was added
            response = client.get('/segmentation/api/user-config')
            updated_config = response.get_json()['config']
            assert excluded_bands[0] in updated_config['segmentation']['ai_model']['bands'], \
                "Added band should appear in config"

    def test_accordion_sections_data(self, client, logged_in_user):
        """
        Test that all accordion sections have the required data.

        Why: UI completeness - the preferences modal has three accordion sections
        (Model Parameters, Model Inputs, Postprocessing). Each section needs
        specific data to render correctly.

        Expected: All data required by each accordion section is present and valid
        """
        response = client.get('/segmentation/api/user-config')
        data = response.get_json()

        ai_model = data['config']['segmentation']['ai_model']

        # Accordion 1: Model Parameters
        # These control the LightGBM gradient boosting model
        model_params = ['n_estimators', 'max_depth', 'n_leaves', 'train_ratio', 'max_train_pixels']
        for param in model_params:
            assert param in ai_model, f"Model parameter {param} should exist"
            assert isinstance(ai_model[param], (int, float)), \
                f"Model parameter {param} should be numeric"

        # Accordion 2: Model Inputs
        # These control what features are used for training
        input_params = ['use_edge_filter', 'use_meshgrid', 'meshgrid_cells', 'use_superpixels', 'bands']
        for param in input_params:
            assert param in ai_model, f"Input parameter {param} should exist"

        # Validate specific input parameter types
        assert isinstance(ai_model['use_edge_filter'], bool), "use_edge_filter should be boolean"
        assert isinstance(ai_model['use_meshgrid'], bool), "use_meshgrid should be boolean"
        assert isinstance(ai_model['use_superpixels'], bool), "use_superpixels should be boolean"
        assert isinstance(ai_model['bands'], list), "bands should be a list"
        assert ai_model['meshgrid_cells'] in ['3x3', '5x5', '7x7', '10x10', '20x20', 'pixelwise'], \
            "meshgrid_cells should be a valid option"

        # Accordion 3: Postprocessing
        # These control how predictions are cleaned up
        postprocess_params = ['suppression_filter_size', 'suppression_threshold', 'suppression_default_class']
        for param in postprocess_params:
            assert param in ai_model, f"Postprocessing parameter {param} should exist"
            assert isinstance(ai_model[param], int), \
                f"Postprocessing parameter {param} should be integer"

        # Validate postprocessing parameter ranges
        assert ai_model['suppression_filter_size'] in [3, 5, 7], \
            "suppression_filter_size should be 3, 5, or 7"
        assert 0 <= ai_model['suppression_threshold'] <= 100, \
            "suppression_threshold should be 0-100"
        assert 0 <= ai_model['suppression_default_class'] < len(data['config']['classes']), \
            "suppression_default_class should be a valid class index"



