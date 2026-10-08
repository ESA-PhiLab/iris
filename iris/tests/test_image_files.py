from iris.project import project


def test_image_file_is_served_in_ranges(client, logged_in_user):
    image_id = project.image_ids[0]
    file_id, path = next(iter(project.get_image_path(image_id).items()))
    with open(path, 'rb') as stream:
        head = stream.read(100)

    response = client.get(
        f'/segmentation/api/file/{image_id}/{file_id}',
        headers={'Range': 'bytes=0-99'},
    )

    assert response.status_code == 206
    assert response.data == head
    assert response.headers['Accept-Ranges'] == 'bytes'


def test_unknown_image_file_is_not_found(client, logged_in_user):
    image_id = project.image_ids[0]

    assert client.get('/segmentation/api/file/unknown/Sentinel2').status_code == 404
    assert client.get(f'/segmentation/api/file/{image_id}/unknown').status_code == 404


def test_image_file_requires_login(client):
    image_id = project.image_ids[0]
    file_id = next(iter(project.get_image_path(image_id)))

    response = client.get(f'/segmentation/api/file/{image_id}/{file_id}')

    assert response.status_code in (302, 401, 403)
