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
    #
    # def from_json(self, data):
    #     for k, v in data.items():
    #         setattr(self, k, v)

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
    masks = db.relationship('Mask', backref='creator', lazy='dynamic')

    def __repr__(self):
        return '<User {}>'.format(self.name)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_segmentation_details(self,):
        masks = Mask.query.filter_by(creator=self).all()
        details = {
            'score': 0,
            'score_pending': 0,
            'n_masks': len(masks)
        }
        for mask in masks:
            if mask.score_pending:
                details['score_pending'] += mask.score
            else:
                details['score'] += mask.score

        return details

    def to_json(self):
        data = super().to_json()
        del data['password_hash']
        return data

class Image(JsonSerializable, db.Model):
    id = db.Column(db.String(256), primary_key=True)
    segmentation_agreement = db.Column(db.Float, default=0)
    segmentation_masks = db.relationship(
        'Mask', backref='image', lazy='dynamic'
    )
    classification_agreement = db.Column(db.Float, default=0)

class Mask(JsonSerializable, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    image_id = db.Column(db.String(256), db.ForeignKey('image.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    last_modification = db.Column(
        db.DateTime, index=True, default=datetime.utcnow
    )
    time_spent = db.Column(db.Interval, default=timedelta())

    # How do we evaluate the score of a mask?
    # a_score: Agreement with 1 other user
    score = db.Column(db.Integer, default=0)
    score_pending = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f'<Mask creator={self.user_id}, image={self.image_id}, score={self.score}>'
