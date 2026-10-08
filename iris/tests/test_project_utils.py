import os

import numpy as np
import pytest
import rasterio as rio

from iris import project
from iris.project import Project


def test_make_absolute_varieties(tmp_path, monkeypatch):
    # simulate a project.file location
    fake_cfg = tmp_path / "cfg.json"
    fake_cfg.write_text("{}")
    monkeypatch.setattr(project, "file", str(fake_cfg))
    # relative path
    rel = "images/img.tif"
    abs_expected = os.path.normpath(os.path.join(os.path.dirname(str(fake_cfg)), rel))
    assert project.make_absolute(rel) == abs_expected
    # nested structures
    assert project.make_absolute({"a": rel}) == {"a": abs_expected}

    # Use an absolute path that's valid on the current platform
    #   in particular, Win w/py313+ needs "//already/abs" while others "/already/abs"
    already_abs = os.path.abspath(os.path.join(os.sep, "already", "abs"))

    assert project.make_absolute([rel, already_abs]) == [abs_expected, already_abs]


def test_make_absolute_dict_and_list(tmp_path):
    p = Project()
    p.file = str(tmp_path / "project.json")

    rel = "images/{id}.png"
    res = p.make_absolute(rel)
    assert os.path.isabs(res)

    d = {"a": "foo/{id}.png", "b": "bar/{id}.png"}
    out = p.make_absolute(d)
    assert isinstance(out, dict) and "a" in out and os.path.isabs(out["a"])

    lst = ["one/{id}", "two/{id}"]
    out2 = p.make_absolute(lst)
    assert isinstance(out2, list)


def test_set_image_seed_reproducible(project_snapshot):
    project.image_ids = ["1", "2", "3", "4", "5"]
    project.set_image_seed(123)
    first = list(project.image_order)
    # reset and repeat
    project.set_image_seed(123)
    second = list(project.image_order)
    assert first == second
    project.set_image_seed(124)
    assert list(project.image_order) != first


@pytest.mark.parametrize(
    "fake_img,ans",
    [
        (
            {"file1": {"B1": 1, "B2": 2}, "file2": {"R": 1}},
            ["$file1.B1", "$file1.B2", "$file2.R"],
        ),
        ({"c3": 1}, ["c3"]),
        ({"file1": {"B1": 1, "B2": 2}, "C3": 3}, ["$file1.B1", "$file1.B2", "C3"]),
    ],
)
def test_get_image_bands_monkeypatched(monkeypatch, fake_img, ans):
    monkeypatch.setattr(project, "get_image", lambda image_id: fake_img)
    bands = project.get_image_bands("any")
    print(bands)
    assert bands == ans


def test_load_image_cog(tmp_path, make_cog):
    p = Project()
    arr = np.arange(12).reshape(3, 2, 2).astype(np.uint8)
    cog = make_cog(tmp_path / "img.tif", arr)

    out = p.load_image(cog)
    assert list(out) == ["B1", "B2"]
    assert np.array_equal(out["B2"], arr[..., 1])

    out = p.load_image(cog, bands=["$B2"])
    assert list(out) == ["B2"]


def test_load_image_rejects_non_cogs(tmp_path):
    p = Project()
    arr = np.arange(6).reshape(3, 2).astype(np.uint8)

    npyfile = tmp_path / "img.npy"
    np.save(str(npyfile), arr, allow_pickle=False)
    # Any file that is not a TIFF, e.g. a PNG
    png = tmp_path / "img.png"
    png.write_bytes(b"\x89PNG\r\n\x1a\n")
    # A GeoTIFF without tiles and without CRS
    striped = tmp_path / "striped.tif"
    with rio.open(
        str(striped), "w", driver="GTiff", width=2, height=3, count=1, dtype="uint8"
    ) as file:
        file.write(arr[np.newaxis])

    for filename in [npyfile, png, striped]:
        with pytest.raises(ValueError, match="not a COG"):
            p.load_image(str(filename))
