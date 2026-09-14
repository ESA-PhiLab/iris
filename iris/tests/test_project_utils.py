import os

import numpy as np
import pytest
from skimage.io import imsave

from iris import project
from iris.project import Project


@pytest.mark.parametrize("expr", ["max(B1)", "mean($B1) + 1"])
def test_check_band_expression_allows(expr):
    project._check_band_expression(expr)  # should not raise


@pytest.mark.parametrize(
    "bad",
    [
        "lambda x: x",
        "__import__('os')",
        "1; import os",
        "eval('1')",
        "a; b",
        "except: pass",
    ],
)
def test_check_band_expression_forbids(bad):
    with pytest.raises(Exception):  # noqa: B017
        project._check_band_expression(bad)


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


def test_load_image_npy_and_png(tmp_path):
    p = Project()
    # create npy
    arr = np.arange(12).reshape(3, 2, 2).astype(np.uint8)
    npyfile = tmp_path / "img.npy"
    np.save(str(npyfile), arr, allow_pickle=False)
    out = p.load_image(str(npyfile))
    assert "B1" in out and out["B1"].shape == (3, 2)

    # create a small PNG (single-band)
    png = tmp_path / "img.png"
    im = (np.arange(6).reshape(3, 2)).astype(np.uint8)
    imsave(str(png), im)
    out2 = p.load_image(str(png))
    assert out2["B1"].ndim == 2
