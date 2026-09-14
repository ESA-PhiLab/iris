from types import SimpleNamespace

import flask

from iris.user import requires_admin, requires_auth


def test_requires_auth_denies_when_no_session(app):
    @requires_auth
    def view():
        return "ok"

    with app.test_request_context("/"):
        flask.session.clear()
        resp = view()
        assert resp.status_code == 403


def test_requires_admin_checks_user(app, monkeypatch):
    fake_user = SimpleNamespace(id=1, admin=False)

    class FakeQuery:
        @staticmethod
        def get(uid):
            return fake_user

    monkeypatch.setattr("iris.user.User", SimpleNamespace(query=FakeQuery()))

    @requires_admin
    def view():
        return "ok"

    with app.test_request_context("/"):
        flask.session["user_id"] = 1
        resp = view()
        assert resp.status_code == 403
