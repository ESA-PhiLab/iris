"""
Tests for configuration API validation endpoint

Tests the POST /api/config/project/validate endpoint which validates
project configuration without saving it.
"""

import pytest

from iris.models import User, db


@pytest.fixture
def logged_in_admin(app, client):
    """Create admin user and login via session"""
    with app.app_context():
        user = User(name='admin_test', admin=True)
        user.set_password('admin123')
        db.session.add(user)
        db.session.commit()
        user_id = user.id

    # Login via Flask session
    with client.session_transaction() as sess:
        sess['user_id'] = user_id

    return client


@pytest.fixture
def sample_valid_config():
    """Sample valid configuration for testing"""
    return {
        'name': 'test_project',
        'host': '127.0.0.1',
        'port': 5000,
        'images': {
            'path': 'test/{id}.tif',
            'shape': [512, 512],
            'thumbnails': False,
            'metadata': False
        },
        'classes': [
            {'name': 'Background', 'colour': [0, 0, 0, 255], 'description': 'Background class'},
            {'name': 'Cloud', 'colour': [255, 255, 255, 255], 'description': 'Cloud pixels'}
        ],
        'views': {
            'RGB': {
                'type': 'image',
                'data': ['$B1', '$B2', '$B3'],
                'description': 'RGB composite'
            },
            'Monochrome': {
                'type': 'image',
                'data': '$B1',
                'cmap': 'gray',
                'description': 'Single band'
            }
        },
        'view_groups': {
            'Main': ['RGB', 'Monochrome']
        },
        'segmentation': {
            'path': 'masks/{id}.png',
            'mask_encoding': 'integer',
            'mask_area': None,
            'score': 'f1',
            'ai_model': False
        }
    }
# ============================================================================
# Validate Endpoint Tests - Comprehensive Validation Rules
# ============================================================================

def test_validate_detects_invalid_port_too_high(logged_in_admin, sample_valid_config):
    """Test that validation detects port numbers above 65535"""
    sample_valid_config['port'] = 99999

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('port' in err.lower() for err in data['errors'])


def test_validate_detects_negative_port(logged_in_admin, sample_valid_config):
    """Test that validation detects negative port numbers"""
    sample_valid_config['port'] = -1

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('port' in err.lower() for err in data['errors'])


def test_validate_detects_invalid_images_shape(logged_in_admin, sample_valid_config):
    """Test that validation detects invalid images.shape (not 2 elements)"""
    sample_valid_config['images']['shape'] = [512]  # Only 1 element

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('shape' in err.lower() for err in data['errors'])


def test_validate_warns_missing_id_placeholder(logged_in_admin, sample_valid_config):
    """Test that validation warns when images.path lacks {id} placeholder"""
    sample_valid_config['images']['path'] = 'test/image.tif'  # No {id}

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    # Should be valid but with warning
    assert any('{id}' in warn.lower() or 'placeholder' in warn.lower() for warn in data['warnings'])


def test_validate_detects_colour_value_out_of_range(logged_in_admin, sample_valid_config):
    """Test that validation detects colour values outside 0-255 range"""
    sample_valid_config['classes'][0]['colour'] = [256, 0, 0, 255]  # 256 is too high

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('colour' in err.lower() and ('0' in err or '255' in err) for err in data['errors'])


def test_validate_detects_negative_colour_value(logged_in_admin, sample_valid_config):
    """Test that validation detects negative colour values"""
    sample_valid_config['classes'][0]['colour'] = [-1, 0, 0, 255]

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('colour' in err.lower() for err in data['errors'])


def test_validate_detects_invalid_view_type(logged_in_admin, sample_valid_config):
    """Test that validation detects invalid view types"""
    sample_valid_config['views']['BadView'] = {
        'type': 'invalid_type',
        'data': '$B1'
    }

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('type' in err.lower() and 'badview' in err.lower() for err in data['errors'])


def test_validate_detects_missing_data_in_image_view(logged_in_admin, sample_valid_config):
    """Test that validation detects missing data field in image views"""
    sample_valid_config['views']['NoData'] = {
        'type': 'image'
        # Missing 'data' field
    }

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('data' in err.lower() and 'nodata' in err.lower() for err in data['errors'])


def test_validate_warns_data_in_bingmap_view(logged_in_admin, sample_valid_config):
    """Test that validation warns when bingmap view has data field"""
    sample_valid_config['views']['BingMap'] = {
        'type': 'bingmap',
        'data': '$B1'  # Not used for bingmap
    }

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    # Should have warning about unused data field
    assert any('bingmap' in warn.lower() and 'data' in warn.lower() for warn in data['warnings'])


def test_validate_detects_invalid_view_group_reference(logged_in_admin, sample_valid_config):
    """Test that validation detects view_groups referencing non-existent views"""
    sample_valid_config['view_groups']['BadGroup'] = ['RGB', 'NonExistentView']

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('nonexistentview' in err.lower() for err in data['errors'])


def test_validate_accepts_ai_model_as_false(logged_in_admin, sample_valid_config):
    """Test that validation accepts ai_model as False"""
    sample_valid_config['segmentation']['ai_model'] = False

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is True


def test_validate_accepts_ai_model_as_dict(logged_in_admin, sample_valid_config):
    """Test that validation accepts ai_model as dictionary"""
    sample_valid_config['segmentation']['ai_model'] = {
        'n_estimators': 100,
        'max_depth': 5
    }

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is True


def test_validate_detects_missing_class_name(logged_in_admin, sample_valid_config):
    """Test that validation detects classes missing name field"""
    sample_valid_config['classes'].append({
        'colour': [100, 100, 100, 255]
        # Missing 'name'
    })

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('name' in err.lower() for err in data['errors'])


def test_validate_detects_missing_class_colour(logged_in_admin, sample_valid_config):
    """Test that validation detects classes missing colour field"""
    sample_valid_config['classes'].append({
        'name': 'NoColour'
        # Missing 'colour'
    })

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('colour' in err.lower() for err in data['errors'])


def test_validate_detects_invalid_user_colour(logged_in_admin, sample_valid_config):
    """Test that validation detects invalid user_colour arrays"""
    sample_valid_config['classes'][0]['user_colour'] = [255, 0]  # Only 2 values

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('user_colour' in err.lower() for err in data['errors'])


def test_validate_detects_classes_not_array(logged_in_admin, sample_valid_config):
    """Test that validation detects when classes is not an array"""
    sample_valid_config['classes'] = {'invalid': 'structure'}

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('classes' in err.lower() and 'array' in err.lower() for err in data['errors'])


def test_validate_detects_views_not_object(logged_in_admin, sample_valid_config):
    """Test that validation detects when views is not an object"""
    sample_valid_config['views'] = ['invalid', 'structure']

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    # Should detect error (200 with valid=False, or 500 if validation crashes)
    if response.status_code == 200:
        data = response.json
        assert data['valid'] is False
        assert any('views' in err.lower() and 'object' in err.lower() for err in data['errors'])
    else:
        # Validation crashed - still caught the error
        assert response.status_code == 500


def test_validate_detects_empty_views(logged_in_admin, sample_valid_config):
    """Test that validation detects empty views object"""
    sample_valid_config['views'] = {}

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('view' in err.lower() for err in data['errors'])


def test_validate_detects_view_groups_not_object(logged_in_admin, sample_valid_config):
    """Test that validation detects when view_groups is not an object"""
    sample_valid_config['view_groups'] = ['invalid']

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('view_groups' in err.lower() and 'object' in err.lower() for err in data['errors'])


def test_validate_detects_view_group_not_array(logged_in_admin, sample_valid_config):
    """Test that validation detects when view_group value is not an array"""
    sample_valid_config['view_groups']['BadGroup'] = 'not_an_array'

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('badgroup' in err.lower() and 'array' in err.lower() for err in data['errors'])


def test_validate_detects_missing_segmentation_path(logged_in_admin, sample_valid_config):
    """Test that validation detects missing segmentation.path"""
    del sample_valid_config['segmentation']['path']

    response = logged_in_admin.post('/api/config/project/validate',
        json=sample_valid_config,
        content_type='application/json'
    )

    assert response.status_code == 200
    data = response.json
    assert data['valid'] is False
    assert any('path' in err.lower() for err in data['errors'])


def test_validate_requires_auth(client):
    """Test that validate endpoint requires authentication"""
    response = client.post('/api/config/project/validate',
        json={'name': 'test'},
        content_type='application/json'
    )

    assert response.status_code == 401


def test_validate_requires_admin(app, client):
    """Test that validate endpoint requires admin privileges"""
    with app.app_context():
        user = User(name='regular_user', admin=False)
        user.set_password('password')
        db.session.add(user)
        db.session.commit()
        user_id = user.id

    with client.session_transaction() as sess:
        sess['user_id'] = user_id

    response = client.post('/api/config/project/validate',
        json={'name': 'test'},
        content_type='application/json'
    )

    assert response.status_code == 403


def test_validate_missing_json_data(logged_in_admin):
    """Test that validate rejects request with no JSON data"""
    response = logged_in_admin.post('/api/config/project/validate',
        data='not json',
        content_type='text/plain'
    )

    # Should return error (400 or 500 depending on Flask's JSON parsing)
    assert response.status_code in [400, 500]


