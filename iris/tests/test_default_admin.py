from iris import create_default_admin
from iris.models import User


def test_default_admin_is_created_once(app):
    create_default_admin(app, 'boss', 'secret')
    # A second start of the same project must not create it again
    create_default_admin(app, 'boss', 'secret')

    with app.app_context():
        admins = User.query.filter_by(admin=True).all()
        assert [admin.name for admin in admins] == ['boss']
        assert admins[0].check_password('secret')


def test_existing_admin_is_kept(app):
    with app.app_context():
        from iris.models import db
        user = User(name='someone', admin=True)
        user.set_password('first')
        db.session.add(user)
        db.session.commit()

    create_default_admin(app, 'boss', 'secret')

    with app.app_context():
        assert [admin.name for admin in User.query.filter_by(admin=True)] == ['someone']
