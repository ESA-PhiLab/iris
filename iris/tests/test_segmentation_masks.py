from os import makedirs
from os.path import dirname

import numpy as np

from iris.project import project
from iris.segmentation import get_mask_filenames, read_masks


def test_get_mask_filenames_and_read_masks(tmp_path, project_snapshot):
    project["path"] = str(tmp_path)
    final, user = get_mask_filenames("IMG", "u1")
    assert "u1_final" in final and "u1_user" in user

    # create dummy saved masks
    fm = np.zeros((2, 2, 2), dtype=np.uint8)
    um = np.ones((2, 2), dtype=np.uint8)
    # ensure parent directories exist
    makedirs(dirname(final), exist_ok=True)
    makedirs(dirname(user), exist_ok=True)
    # save final as one-hot (3rd dim)
    np.save(final, fm, allow_pickle=False)
    np.save(user, um, allow_pickle=False)

    final_mask, user_mask = read_masks("IMG", "u1")
    assert final_mask.ndim == 2
    assert user_mask.ndim == 2
