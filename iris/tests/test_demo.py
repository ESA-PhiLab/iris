from flask import url_for
import pytest
import requests

@pytest.mark.usefixtures('live_server')
class DemoTest(LiveServerTestCase):
    def test_public_pages(self):
        response = requests.get(url_for('main.index', _external=True))
        assert response.status_code == 200

    def test_required_authentication(self):
        addresses = [
            # admin
            'admin.users', 'admin.images', 'admin.actions.segmentation',
            'admin.actions.classification', 'admin.actions.detection',
            # user
            'user.get/current', 'user.show/current', 'user.config',
            'user.save_config',
            # segmentation
            'segmentation.load_mask/1', 'segmentation.save_mask/1',
            'segmentation.predict_mask/1'
        ]
        for address in map(lambda x: url_for(x, _external=True), addresses):
            print("Check", address)
            response = requests.get(address)
            if response.status_code == 405:
                response = requests.post(address, {})
            assert response.status_code == 403
