import numpy as np
import pytest

from iris.project import project
from iris.segmentation import encode_mask, get_score, image_dict_to_array


def test_encode_mask_integer_and_binary_and_unknown(tmp_path, monkeypatch):
    # set minimal classes used by encode_mask
    project.classes = [{"colour": (0, 0, 0, 0)}, {"colour": (255, 0, 0, 255)}]
    mask = np.array([[0, 1], [1, 0]], dtype=np.uint8)
    out_int = encode_mask(mask, mode="integer")
    assert out_int.dtype == np.uint8
    out_bin = encode_mask(mask, mode="binary")
    assert out_bin.dtype == bool
    with pytest.raises(ValueError):
        encode_mask(mask, mode="bogus")


def test_image_dict_to_array_and_passthrough():
    a = np.ones((2, 2), dtype=np.uint8)
    d = {"a": a, "b": a * 2}
    out = image_dict_to_array(d)
    assert out.shape[0] == 2 and out.shape[2] == 2


@pytest.mark.parametrize(
    "score,exp",
    [
        ("jaccard", 50),
        ("f1", 73),
        ("accuracy", 75),
    ],
)
def test_get_score_variants(score, exp):
    m1 = np.array([0, 1, 1, 0])
    m2 = np.array([0, 1, 0, 0])

    project["segmentation"] = {"score": score}
    ans = get_score(m1, m2)
    assert isinstance(ans, int)
    assert ans == exp
