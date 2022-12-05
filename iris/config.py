import os

# General settings
SECRET_KEY = os.urandom(24)
EXPLAIN_TEMPLATE_LOADING = True

# Flask-SQLAlchemy settings
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Flask-Compress settings
COMPRESS_MIMETYPES = [
        'text/html', 'text/css', 'text/xml',
        'application/json', 'application/octet-stream',
        'application/javascript'
    ]