import numpy as np
import pytest

from iris.project import Project


def setup_small_project(tmp_path, make_cog):
    p = Project()
    p.file = str(tmp_path / "pr.json")
    p.config = {
        "images": {"path": str(tmp_path / "{id}.tif"), "shape": (2, 2)},
        "views": {},
        "name": "x",
    }
    # create dummy image file as COG
    make_cog(tmp_path / "1.tif", np.arange(4).reshape(2, 2).astype(np.uint8))
    p.image_ids = ["1"]
    p.image_order = [0]
    p.set_image_seed(0)
    return p


def test_render_view_clip_and_vmin_conflict(tmp_path, make_cog):
    p = setup_small_project(tmp_path, make_cog)
    view = {"name": "x", "data": ["$B1"], "clip": 1.0, "vmin": 0.0}
    with pytest.raises(ValueError):
        p.render_image("1", view)


def test_render_single_band_cmap(tmp_path, make_cog):
    p = setup_small_project(tmp_path, make_cog)
    view = {"name": "x", "data": ["$B1"], "cmap": "viridis"}
    img = p.render_image("1", view)
    assert img.dtype == np.uint8
    assert img.shape[2] == 3
