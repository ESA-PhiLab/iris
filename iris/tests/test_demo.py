import requests

from flask import Flask
from flask import url_for

@pytest.mark.usefixtures('live_server')
class TestLiveServer:
     def test_public_pages(self):
        response = requests.get(self.get_server_url())
        assert response.status_code == 200

# class DemoTest(LiveServerTestCase):
#     def create_app(self):
#         from iris import app
#         app.config['TESTING'] = True

#         # Set to 0 to have the OS pick the port.
#         app.config['LIVESERVER_PORT'] = 0

#         return app

#     def test_public_pages(self):
#         response = requests.get(self.get_server_url())
#         self.assertEqual(response.status_code, 200)

#     def test_required_authentication(self):
#         addresses = [
#             # admin
#             'admin/users', 'admin/images', 'admin/actions/segmentation',
#             'admin/actions/classification', 'admin/actions/detection',
#             # user
#             'user/get/current', 'user/show/current', 'user/config',
#             'user/save_config',
#             # segmentation
#             'segmentation/load_mask/1', 'segmentation/save_mask/1',
#             'segmentation/predict_mask/1'
#         ]
#         for address in map(lambda x: self.get_server_url()+'/'+x, addresses):
#             print("Check", address)
#             response = requests.get(address)
#             if response.status_code == 405:
#                 response = requests.post(address, {})
#             self.assertEqual(response.status_code, 403)
