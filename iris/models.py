from datetime import datetime, timedelta
from random import randint

from werkzeug.security import check_password_hash, generate_password_hash

from iris import db

class JsonSerializable:
    def to_json(self):
        json = {
            c.name: getattr(self, c.name)
            for c in self.__table__.columns
        }

        for k, v in json.items():
            if isinstance(v, datetime):
                json[k] = v.isoformat()
            elif isinstance(v, timedelta):
                json[k] = str(v)

        return json

class User(JsonSerializable, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(128), index=True, nullable=True)
    password_hash = db.Column(db.String(128), default="")
    created = db.Column(
        db.DateTime, index=True, default=datetime.utcnow
    )
    # Each user should start with a different random image
    image_seed = db.Column(db.Integer, default=randint(0, 10_000_000))
    admin = db.Column(db.Boolean,
                      index=False,
                      unique=False,
                      nullable=False, default=False)
    tested = db.Column(db.Boolean,
                      index=False,
                      unique=False,
                      nullable=False, default=False)
    actions = db.relationship('Action', backref='user', lazy='dynamic')

    def __repr__(self):
        return '<User {}>'.format(self.name)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_json(self, full=False):
        data = super().to_json()
        del data['password_hash']

        masks = Action.query.filter_by(user=self, type="segmentation").all()
        data['segmentation'] = {
            'score': 0,
            'score_unverified': 0,
            'n_masks': len(masks)
        }
        for mask in masks:
            if mask.unverified:
                data['segmentation']['score_unverified'] += mask.score
            else:
                data['segmentation']['score'] += mask.score

        return data

class Action(JsonSerializable, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Can be segmentation, classification or detection:
    type = db.Column(db.String(64), index=True)
    image_id = db.Column(db.String(256), index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    last_modification = db.Column(
        db.DateTime, index=True, default=datetime.utcnow
    )
    time_spent = db.Column(db.Interval, default=timedelta())
    score = db.Column(db.Integer, default=0)
    unverified = db.Column(db.Boolean, default=True)
    complete = db.Column(db.Boolean, default=False)
    notes = db.Column(db.String(256), nullable=True)
    # Difficulty goes from 1 to 5, 3 is average
    difficulty = db.Column(db.Integer, index=True, default=3)

    def __repr__(self):
        return f'<Action user={self.user_id}, image_id={self.image_id}, score={self.score}>'
