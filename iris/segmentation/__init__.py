import os
import time
from datetime import datetime
from glob import glob
from os.path import basename, dirname, join

import flask
import numpy as np
import rasterio as rio
from rasterio.transform import Affine
from sklearn.metrics import accuracy_score, f1_score, jaccard_score

from iris.models import Action, User, db
from iris.project import project
from iris.user import requires_auth

segmentation_app = flask.Blueprint(
    'segmentation', __name__,
    template_folder='templates',
    static_folder='static'
)

# Import SPA and API blueprints
from .api import api_bp  # noqa: E402
from .spa import spa_bp  # noqa: E402


def register_segmentation_blueprints(app):
    """
    Register all segmentation blueprints with the Flask app.

    IMPORTANT: Registration order matters!
    1. segmentation_app: Handles API routes (/segmentation/next_image, /load_mask, etc.)
    2. api_bp: Handles JSON API routes (/segmentation/api/*)
    3. spa_bp: Handles main SPA route (/segmentation/) - registered last to take precedence

    Both blueprints use /segmentation prefix but handle different route patterns.
    The SPA blueprint's / route overrides the removed segmentation_app.index route.
    """
    # Register original blueprint for API routes (/segmentation/next_image, /segmentation/load_mask, etc.)
    app.register_blueprint(segmentation_app, url_prefix="/segmentation")
    # Register JSON API blueprint for React frontend (/segmentation/api/*)
    app.register_blueprint(api_bp)
    # Register SPA blueprint for main route (/segmentation/) - must be last for route precedence
    app.register_blueprint(spa_bp)

# Original index route removed - now handled by SPA blueprint
# The SPA blueprint (spa.py) handles the main /segmentation/ route

@segmentation_app.route('/next_image', methods=['GET'])
@requires_auth
def next_image():
    user = User.query.get(flask.session['user_id'])
    project.set_image_seed(user.image_seed)

    image_id = project.get_next_image(
        flask.request.args.get('image_id', project.get_start_image_id()),
        user
    )

    return flask.redirect(
        flask.url_for('segmentation_spa.segmentation_spa', image_id=image_id)
    )

@segmentation_app.route('/previous_image', methods=['GET'])
@requires_auth
def previous_image():
    user = User.query.get(flask.session['user_id'])
    project.set_image_seed(user.image_seed)

    image_id = project.get_previous_image(
        flask.request.args.get('image_id', project.get_start_image_id())
    )

    return flask.redirect(
        flask.url_for('segmentation_spa.segmentation_spa', image_id=image_id)
    )

def get_mask_filename(image_id, user_id):
    """Get the filename of a user's mask

    The mask is a COG with two bands: the class of each pixel and whether the
    user drew the pixel himself (1) or the AI classified it (0).
    """
    return join(
        project['path'], 'segmentation', image_id,
        f'{user_id}_mask.tif'
    )

def read_masks(image_id, user_id):
    """Read the final and user mask"""
    filename = get_mask_filename(image_id, user_id)
    if not os.path.exists(filename):
        raise FileNotFoundError(filename)

    with rio.open(filename) as file:
        final_mask, user_mask = file.read()
    return final_mask, user_mask.astype(bool)

def read_user_masks(image_id):
    """Read the final masks of all users who annotated the image

    Returns:
        A list with the user ids and a HxWxN array with their final masks.
    """
    paths = sorted(glob(get_mask_filename(image_id, user_id="*")))
    users = [basename(path).split('_')[0] for path in paths]
    final_masks = []
    for path in paths:
        with rio.open(path) as file:
            final_masks.append(file.read(1))
    return users, np.dstack(final_masks) if final_masks else None

def write_mask_cog(filename, image_id, bands, descriptions=None):
    """Write mask bands (CxHxW) as COG with the georeference of the mask area"""
    crs, transform, _, _ = project.get_georef(image_id)
    x0, y0 = project['segmentation']['mask_area'][:2]

    os.makedirs(dirname(filename), exist_ok=True)
    with rio.open(
        filename, 'w', driver='COG', compress='deflate',
        width=bands.shape[2], height=bands.shape[1], count=bands.shape[0],
        dtype='uint8', crs=crs, transform=transform * Affine.translation(x0, y0),
    ) as file:
        file.write(bands.astype(np.uint8))
        for i, description in enumerate(descriptions or []):
            file.set_band_description(i+1, description)

def compute_merged_mask(final_masks):
    """
    Compute merged mask from multiple user masks using voting system.

    Args:
        final_masks: 3D numpy array of shape (height, width, n_users) containing
                    class indices for each user's mask

    Returns:
        2D numpy array of shape (height, width) with merged class indices
    """
    # Unfortunately, there is no fast standard solution for mode in numpy or
    # scipy (scipy.stats.mode is not optimised for our case):
    classes = dict(enumerate(np.unique(final_masks)))
    class_votes = np.zeros((*final_masks.shape[:-1], len(classes)))

    for u in range(final_masks.shape[-1]):
        for i, klass in classes.items():
            # We collect the votes for each class for each pixel.
            # Instead of increasing by 1, we could also use the user's rank or
            # etc. to weight their mask
            class_votes[final_masks[..., u] == klass, i] += 1

    # Create the final mask out of the elements occuring the most often:
    winner_indices = np.argmax(class_votes, axis=-1)

    # Retranslate to original classes (we initialised class_votes not with the
    # original class indices):
    merged_mask = np.vectorize(classes.__getitem__, otypes=[np.uint8])(winner_indices)

    return merged_mask


def merge_masks(image_id):
    """Combine the masks of all users to a resulting mask"""
    users, final_masks = read_user_masks(image_id)

    # Compute merged mask using voting system
    merged_mask = compute_merged_mask(final_masks)

    # Update the database for all users
    for u, user_id in enumerate(users):
        user = User.query.get(user_id)
        if user is None:
            continue

        action = Action.query.filter_by(
                user=user, image_id=image_id, type="segmentation"
            ).first()
        if not action:
            action = Action(user=user, image_id=image_id, type="segmentation")

        if len(users) == 2:
            # Just check how much the user agrees with the other one:
            other_user = 0 if u else 1
            action.score = get_score(final_masks[..., other_user].ravel(), final_masks[..., u].ravel())
        else:
            action.score = get_score(merged_mask.ravel(), final_masks[..., u].ravel())

        action.unverified = len(users) <= project['segmentation']['unverified_threshold']

    db.session.commit()

    merged_mask = encode_mask(
        merged_mask, mode=project['segmentation']['mask_encoding']
    )
    if merged_mask.ndim == 2:
        merged_mask = merged_mask[..., np.newaxis]
    write_mask_cog(
        project['segmentation']['path'].format(id=image_id),
        image_id, np.moveaxis(merged_mask, -1, 0)
    )

def get_score(mask1, mask2):
    if project['segmentation']['score'] == 'jaccard':
        return round(100 * jaccard_score(mask1, mask2))
    elif project['segmentation']['score'] == 'f1':
        return round(100 * f1_score(mask1, mask2, average='macro'))
    elif project['segmentation']['score'] == 'accuracy':
        return round(100 * accuracy_score(mask1, mask2))

def encode_mask(mask, mode='binary'):
    """Encode the mask to save it on disk

    Args:
        mask: 2D integer numpy array.
        mode: Defines how to encode the mask.
            * integer: Each class will be represented by an integer (does not
                change the mask).
            * binary: Each class gets its own boolean layer.
            * rgb: Each class will be saved with its original RGB colour.
            * rgba: Each class will be saved with its original RGBA colour.

    Returns:
        Encoded numpy array.
    """
    if mode == 'integer':
        return mask.astype(np.uint8)
    elif mode == 'binary':
        n_last_dimension = len(project['classes'])
    elif mode == 'rgb':
        n_last_dimension = 3
    elif mode == 'rgba':
        n_last_dimension = 4
    else:
        raise ValueError("Unknown encoding mode:", mode)

    encoded_mask = np.empty((*mask.shape, n_last_dimension))
    for c, klass in enumerate(project['classes']):
        if mode == 'binary':
            encoded_mask[..., c] = mask == c
        elif mode == 'rgb':
            encoded_mask[mask == c] = klass['colour'][:3]
        elif mode == 'rgba':
            encoded_mask[mask == c] = klass['colour']

    if mode == 'binary':
        return encoded_mask.astype(bool)

    return encoded_mask.astype(np.uint8)

@segmentation_app.route('/load_mask/<image_id>')
@requires_auth
def load_mask(image_id):
    user_id = flask.session.get('user_id')

    try:
        final_mask, user_mask = read_masks(image_id, user_id)

        data = np.concatenate([final_mask.ravel(), user_mask.ravel()])
        data = np.pad(data, 1, constant_values=(254, 254))

        response = flask.make_response(
            data.astype(np.uint8).tobytes()
        )
        response.headers.set('Content-Type', 'application/octet-stream')
        # Prevent browser caching to ensure fresh mask data on each load
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        return response
    except Exception:
        return flask.make_response("No user mask available!", 404)

@segmentation_app.route('/save_mask/<image_id>', methods=['POST'])
@requires_auth
def save_mask(image_id):
    user_id = flask.session.get('user_id')

    print('SAVING BY', user_id)

    t = time.time()
    data = np.frombuffer(flask.request.data, dtype=np.uint8)
    print(f'transfer time: {time.time()-t:.2f}s')

    # We will get an octet stream (uint8) from the website. It contains:
    # 0 to 1: magic start byte 254
    # 1 to mask_length: mask
    # mask_length to 2*mask_length: user mask
    # 2*mask_length + 1: magic end byte 254
    mask_length = \
        project['segmentation']['mask_shape'][0] \
        * project['segmentation']['mask_shape'][1]

    if len(data) != 2*mask_length + 2:
        print('Error: Octet-stream does not have the expected length!')
        print(f'Expected length: {2*mask_length + 2}, received length: {len(data)}')
        return flask.make_response("Mask does not have correct format!", 400)
    elif data[0] != 254 and data[-1] != 254:
        print('Error: Magic numbers are not correct!')
        print(f'Start number: {data[0]}, end number: {data[-1]}')
        return flask.make_response("Transferred data is not correct!", 400)

    # We get the mask in the form HxW where each element is a class id
    final_mask = data[1:mask_length+1]
    final_mask = final_mask.reshape(project['segmentation']['mask_shape'][::-1])

    # The user mask denotes who classified the pixels in the mask:
    #   if true: the user classified the pixel
    #   if false: the AI classified the pixel
    user_mask = data[1+mask_length:-1].astype(bool)
    user_mask = user_mask.reshape(project['segmentation']['mask_shape'][::-1])

    write_mask_cog(
        get_mask_filename(image_id, user_id), image_id,
        np.stack([final_mask, user_mask]),
        descriptions=['Class', 'Drawn by user']
    )

    # Update the database:
    user = User.query.get(user_id)
    action = Action.query\
        .filter_by(user=user, image_id=image_id, type="segmentation")\
        .first()
    if not action:
        action = Action(user=user, image_id=image_id, type="segmentation")
    action.last_modification = datetime.utcnow()
    db.session.add(action)
    db.session.commit()

    merge_masks(image_id)

    # We need this to send a successful response to the client
    return flask.make_response('Masks successfully saved!')
