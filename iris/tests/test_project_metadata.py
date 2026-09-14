import json

import numpy as np
import yaml
from skimage.io import imsave

from iris.project import project


def test_get_metadata_json_yaml_and_raw(tmp_path, project_snapshot):
    # prepare project config
    project.file = str(tmp_path / "proj.json")
    project.config = {"images": {}}

    # JSON metadata
    j = tmp_path / "meta.json"
    j.write_text(json.dumps({"location": [1, 2]}))
    project["images"] = {"metadata": str(j)}
    md = project.get_metadata("1")
    assert md.get("location") == [1, 2]

    # YAML metadata
    y = tmp_path / "meta.yaml"
    y.write_text(yaml.safe_dump({"foo": "bar"}))
    project["images"] = {"metadata": str(y)}
    md2 = project.get_metadata("1")
    assert md2.get("foo") == "bar"

    # Raw text fallback (unknown extension)
    r = tmp_path / "meta.txt"
    r.write_text("hello world")
    project["images"] = {"metadata": str(r)}
    md3 = project.get_metadata("1")
    assert md3.get("__body__") == "hello world"


def test_get_thumbnail_and_image_path_and_bands(tmp_path, project_snapshot, monkeypatch):
    # setup a small thumbnail
    img = (np.arange(6).reshape(3, 2)).astype(np.uint8)
    thumb = tmp_path / "thumb.png"
    imsave(str(thumb), img)

    project["images"] = {"thumbnails": str(thumb)}
    t = project.get_thumbnail("1")
    assert t.shape[0] == 3

    # image path non-dict
    project["images"] = {"path": str(tmp_path / "{id}.npy")}
    pth = project.get_image_path("X")
    assert "{id}" not in pth

    # get_image_bands: monkeypatch get_image to simulate multi-file dict
    def fake_get_image(image_id):
        return {"file": {"B1": 1, "B2": 2}, "$B1": np.ones((2, 2))}

    monkeypatch.setattr(project, "get_image", fake_get_image)
    bands = project.get_image_bands("1")
    assert any("B1" in b for b in bands)
