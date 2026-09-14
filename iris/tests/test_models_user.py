import types

from iris.models import Action, User


def test_user_password_roundtrip():
    u = User()
    u.set_password("secret123")
    assert u.password_hash != ""
    assert u.check_password("secret123")
    assert not u.check_password("wrong")


def test_user_to_json_counts_masks(monkeypatch, app):
    u = User()
    u.id = 1
    # fake masks
    class FakeQuery:
        def __init__(self, masks):
            self._masks = masks
        def all(self):
            return self._masks

    fake_masks = [types.SimpleNamespace(unverified=False, score=5),
                  types.SimpleNamespace(unverified=True, score=2)]
    monkeypatch.setattr(Action, "query", types.SimpleNamespace(filter_by=lambda **kw: FakeQuery(fake_masks)))
    data = u.to_json()
    assert 'password_hash' not in data
    assert data['segmentation']['n_masks'] == 2
    assert data['segmentation']['score'] == 5
    assert data['segmentation']['score_unverified'] == 2
