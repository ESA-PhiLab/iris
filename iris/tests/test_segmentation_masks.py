import numpy as np
import pytest
import rasterio as rio

from iris.project import project
from iris.segmentation import (
    get_mask_filename,
    read_masks,
    read_user_masks,
    write_mask_cog,
)


def test_get_mask_filename_and_read_masks(tmp_path, project_snapshot):
    project["path"] = str(tmp_path)
    image_id = project.image_ids[0]
    filename = get_mask_filename(image_id, "u1")
    assert filename.endswith("u1_mask.tif")

    width, height = project["segmentation"]["mask_shape"]
    final = np.random.RandomState(0).randint(0, 4, (height, width)).astype(np.uint8)
    user = np.zeros((height, width), dtype=bool)
    user[:10, :10] = True
    write_mask_cog(filename, image_id, np.stack([final, user]))

    final_mask, user_mask = read_masks(image_id, "u1")
    assert np.array_equal(final_mask, final)
    assert np.array_equal(user_mask, user)


def test_mask_is_cog_aligned_with_the_mask_area(tmp_path, project_snapshot):
    project["path"] = str(tmp_path)
    image_id = project.image_ids[0]
    width, height = project["segmentation"]["mask_shape"]
    filename = get_mask_filename(image_id, "u1")
    write_mask_cog(filename, image_id, np.zeros((2, height, width), dtype=np.uint8))

    crs, transform, _, _ = project.get_georef(image_id)
    x0, y0 = project["segmentation"]["mask_area"][:2]
    with rio.open(filename) as mask:
        assert mask.crs == crs
        assert mask.transform * (0, 0) == transform * (x0, y0)
        assert mask.res == (abs(transform.a), abs(transform.e))
        assert mask.tags(ns="IMAGE_STRUCTURE")["LAYOUT"] == "COG"


def test_read_user_masks(tmp_path, project_snapshot):
    project["path"] = str(tmp_path)
    image_id = project.image_ids[0]
    width, height = project["segmentation"]["mask_shape"]

    assert read_user_masks(image_id) == ([], None)

    for user_id, value in [("1", 1), ("2", 2)]:
        bands = np.zeros((2, height, width), dtype=np.uint8)
        bands[0] = value
        write_mask_cog(get_mask_filename(image_id, user_id), image_id, bands)

    users, final_masks = read_user_masks(image_id)
    assert users == ["1", "2"]
    assert final_masks.shape == (height, width, 2)
    assert (final_masks[..., 1] == 2).all()


def test_read_masks_without_mask(tmp_path, project_snapshot):
    project["path"] = str(tmp_path)
    with pytest.raises(FileNotFoundError):
        read_masks(project.image_ids[0], "nobody")
