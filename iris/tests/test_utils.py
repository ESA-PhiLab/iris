import markupsafe
import pytest

from iris.utils import View, merge_deep_dicts


@pytest.mark.parametrize(
    "d1,d2,expected",
    [
        (  # shallow keys: d2 overrides existing and adds new
            {"a": 1, "b": 2},
            {"b": 3, "c": 4},
            {"a": 1, "b": 3, "c": 4},
        ),
        (  # nested dict merging: inner dicts are merged recursively
            {"a": {"x": 1, "y": 2}, "b": 2},
            {"a": {"y": 20, "z": 3}},
            {"a": {"x": 1, "y": 20, "z": 3}, "b": 2},
        ),
        (  # non-dict values (lists here) are replaced, not merged
            {"a": [1, 2]},
            {"a": [3]},
            {"a": [3]},
        ),
    ],
)
def test_merge_deep_dicts(d1, d2, expected):
    result = merge_deep_dicts(d1, d2)
    assert result == expected


def test_merge_deepcopy_isolation():
    # ensure merge_deep_dicts deep-copies d1 and does not mutate the input
    d1 = {"a": {"x": 1}}
    d2 = {"a": {"x": 2}}

    result = merge_deep_dicts(d1, d2)
    assert result["a"]["x"] == 2

    # modify the result deeply
    result["a"]["x"] = 99

    # original d1 must remain unchanged
    assert d1["a"]["x"] == 1


def test_merge_dict_over_non_dict_raises():
    # If d1 contains a non-dict for a key but d2 provides a dict for the
    # same key, the current implementation will attempt to operate on the
    # non-dict and raise (TypeError). Document that behaviour here.
    d1 = {"a": 1}
    d2 = {"a": {"x": 2}}

    with pytest.raises(TypeError):
        merge_deep_dicts(d1, d2)


def test_view_to_json_marks_up():
    v = View("<b>Name</b>", "<i>Desc</i>", None)
    j = v.to_json()
    assert "name" in j and "description" in j
    assert isinstance(j["name"], markupsafe.Markup)
    assert isinstance(j["description"], markupsafe.Markup)
