from datetime import datetime, timedelta
from glob import glob
import io
import json
import os
from os.path import basename, dirname, exists, join
import time
from pprint import pprint

import lightgbm as lgb
import flask
from flask_compress import Compress
import numpy as np
from PIL import Image as PILImage
from scipy.ndimage import minimum_filter, maximum_filter
from skimage.io import imread, imsave
from sklearn.model_selection import train_test_split
import yaml

from iris.user import requires_auth
from iris.models import db, Image, User, Mask
from iris.project import project

segmentation_app = flask.Blueprint(
    'segmentation', __name__,
    template_folder='templates',
    static_folder='static'
)

@segmentation_app.route('/', methods=['GET'])
def index():
    image_id = flask.request.args.get('image_id', project.get_start_image())

    return flask.render_template(
        'segmentation.html',
        image_id=image_id,
        image_shape=project['image_shape'],
        mask_area=project['segmentation']['mask_area'],
        views=project['views'], classes=project['classes'],
        thumbnail_available='thumbnail' in project['files'][image_id],
        metadata_available='metadata' in project['files'][image_id],
    )

@segmentation_app.route('/next_image', methods=['GET'])
def next_image():
    image_id = project.get_next_image(
        flask.request.args.get('image_id', project.get_start_image())
    )

    return flask.redirect(
        flask.url_for('segmentation.index', image_id=image_id)
    )

@segmentation_app.route('/previous_image', methods=['GET'])
def previous_image():
    image_id = project.get_previous_image(
        flask.request.args.get('image_id', project.get_start_image())
    )

    return flask.redirect(
        flask.url_for('segmentation.index', image_id=image_id)
    )

def get_mask_filenames(image_id, user_id=None):
    """Get final and user mask filenames"""
    if user_id is None:
        user_id = project.user_id

    final_mask = join(
        project['paths']['project'], 'segmentation', image_id,
        f'{user_id}_final.npy'
    )

    user_mask = join(
        project['paths']['project'], 'segmentation', image_id,
        f'{user_id}_user.npy'
    )

    return final_mask, user_mask

def read_masks(image_id):
    """Read the final and user mask"""
    final_mask_file, user_mask_file = get_mask_filenames(image_id)

    final_mask = np.load(final_mask_file)
    final_mask = np.argmax(final_mask, axis=-1)
    user_mask = np.load(user_mask_file)
    return final_mask, user_mask

def merge_masks(image_id):
    """Combine the masks of all users to a resulting mask"""
    final_mask_paths = get_mask_filenames(image_id, user_id="*")[0]
    users, final_masks = zip(*[
        [basename(path).split('_')[0], np.argmax(np.load(path), axis=-1)]
        for path in glob(final_mask_paths)
    ])
    final_masks = np.dstack(final_masks)

    # Time to merge the masks, i.e. we are going to count which class is the
    # most often:

    # Unfortunately, there is no fast standard solution for mode in numpy or
    # scipy (scipy.stats.mode is not optimised for our case):
    classes = dict(enumerate(np.unique(final_masks)))
    class_votes = np.zeros((*final_masks.shape[:-1], len(classes)))
    for u in range(len(users)):
        for i, klass in classes.items():
            # We collect the votes for each class for each pixel.
            # Instead of increasing by 1, we could also use the user's rank or
            # etc. to weight their mask
            class_votes[final_masks[..., u] == klass, i] += 1

    # Create the final mask out of the elements occuring the most often:
    winner_indices = np.argmax(class_votes, axis=-1)

    # Retranslate to original classes (we initialised class_votes not with the
    # original class indices):
    final_mask = np.vectorize(classes.__getitem__, otypes=[np.uint8])(winner_indices)

    # Update the database for all users
    image = Image.query.get(image_id)
    if not image:
        image = Image(id=image_id)
        db.session.add(image)

    for u, user_id in enumerate(users):
        user = User.query.get(user_id)
        if user is None:
            continue

        mask = Mask.query.filter_by(creator=user, image=image).first()
        if not mask:
            mask = Mask(creator=user, image=image)
        mask.score = int((final_masks[..., u]==final_mask).sum())
        mask.score_pending = len(users) < 3

    total_agreement = \
        np.take_along_axis(class_votes, winner_indices[..., np.newaxis], axis=-1).sum()
    image.segmentation_agreement = total_agreement / class_votes.sum()
    db.session.commit()

    final_mask = encode_mask(
        final_mask, mode=project['segmentation']['mask_encoding']
    )
    filename = project['files'][image_id]['mask']
    if filename.endswith('npy'):
        np.save(filename, final_mask, allow_pickle=False)
    else:
        imsave(filename, final_mask, check_contrast=False)

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

def save_masks(image_id, final_mask, user_mask):
    final_mask_file, user_mask_file = get_mask_filenames(image_id)

    os.makedirs(dirname(final_mask_file), exist_ok=True)

    final_mask = encode_mask(final_mask, mode='binary')

    np.save(final_mask_file, final_mask, allow_pickle=False)
    np.save(user_mask_file, user_mask.astype(bool), allow_pickle=False)

    # Update the database:
    image = Image.query.get(image_id)
    if not image:
        image = Image(id=image_id)
        db.session.add(image)

    user = User.query.get(project.user_id)
    mask = Mask.query.filter_by(creator=user, image=image).first()
    if not mask:
        mask = Mask(creator=user, image=image)
    mask.last_modification = datetime.utcnow()
    db.session.add(mask)
    db.session.commit()

@segmentation_app.route('/load_mask/<image_id>')
@requires_auth
def load_mask(image_id):
    user_id = flask.session.get('user_id')

    print('LOADING MASK BY', user_id)
    try:
        final_mask, user_mask = read_masks(image_id)
        print(f"Load {user_id}'s mask")

        data = np.concatenate([final_mask.ravel(), user_mask.ravel()])
        data = np.pad(data, 1, constant_values=(254, 254))

        response = flask.make_response(
            data.astype(np.uint8).tobytes()
        )
        response.headers.set('Content-Type', 'application/octet-stream')
        return response
    except:
        print("Could not use user's mask, use default mask instead.")
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
    user_mask = data[1+mask_length:-1].astype(np.bool)
    user_mask = user_mask.reshape(project['segmentation']['mask_shape'][::-1])

    save_masks(image_id, final_mask, user_mask)
    merge_masks(image_id)

    # We need this to send a successful response to the client
    return flask.make_response('Masks successfully saved!')

@segmentation_app.route('/predict_mask/<image_id>', methods=['POST'])
@requires_auth
def predict_mask(image_id):
    image = project.get_image(image_id)
    n_channels = image.shape[-1]

    # Select only the masking area:
    mask_area = (
        slice(
            project['segmentation']['mask_area'][0],
            project['segmentation']['mask_area'][2]
        ),
        slice(
            project['segmentation']['mask_area'][1],
            project['segmentation']['mask_area'][3]
        ),
        slice(None, None, None)
    )
    image = image[mask_area]

    data = json.loads(flask.request.data)
    user_indices = np.array(data['user_pixels'])
    user_labels = np.array(data['user_labels'])
    ai_config = data['ai_config']

    print('Fit options:', ai_config)

    if ai_config['include_context']:
        # Reshape the image for the filter functions:
        image_min = minimum_filter(image, 7).reshape(-1, n_channels)
        image_max = maximum_filter(image, 7).reshape(-1, n_channels)

        inputs = np.concatenate(
            [image.reshape(-1, n_channels), image_min, image_max], axis=-1
        )
    else:
        inputs = image.reshape(-1, n_channels)

    train_indices, val_indices, train_labels, val_labels = train_test_split(
        user_indices, user_labels, stratify=user_labels,
        test_size=0.2, random_state=42
    )

    gbm = lgb.LGBMClassifier(
        num_leaves=ai_config['n_leaves'],
        max_bin=128,
        max_depth=ai_config['max_depth'],
        # min_data_in_leaf=1000,
        # bagging_fraction=0.2,
        # boosting_type='dart',
        tree_learner='data',
        learning_rate=0.05,
        n_estimators=ai_config['n_estimators'],
        silent=True,
        n_jobs=10,
    )
    t = time.time()
    gbm.fit(
        inputs[train_indices, :], train_labels,
        eval_set=[(inputs[val_indices, :], val_labels)],
        early_stopping_rounds=4, verbose=0
    )
    print('Fit:', t - time.time())

    # predict the mask for the whole image:
    t = time.time()
    predictions = gbm.predict(
            inputs, num_iteration=gbm.best_iteration_
        ).astype(np.uint8)
    print('Predict:', t - time.time())

    response = flask.make_response(
        predictions.tobytes()
    )
    response.headers.set('Content-Type', 'application/octet-stream')
    return response

@segmentation_app.route('/load_image/<image_id>/<int:view>')
def load_image(image_id, view):
    image = project.get_image(image_id)
    user_image = parse_channels(
        project['views'][view]['channels'], image
    )
    return array_to_png(user_image)

def parse_channels(channels, image):
    environment = {f"B{i+1}": image[..., i] for i in range(image.shape[-1])}
    environment['np'] = np

    user_bands = [
        eval(channel, dict(), environment)
        for channel in channels
    ]

    return np.moveaxis(np.stack(user_bands), 0, -1)

@segmentation_app.route('/load_metadata/<image_id>')
def load_metadata(image_id):
    metadata = project.get_metadata(image_id)
    return flask.jsonify({
        "data": metadata,
        "format": "dictionary" if isinstance(metadata, dict) else "string"
    })

@segmentation_app.route('/load_thumbnail/<image_id>')
def load_thumbnail(image_id):
    array = project.get_thumbnail(image_id)
    return array_to_png(array)

def array_to_png(array):
    if issubclass(array.dtype.type, np.floating):
        array = np.clip(array * 255., 0, 255).astype('uint8')

    img = PILImage.fromarray(array) # convert arr to image
    file_object = io.BytesIO()   # create file in memory
    img.save(file_object, 'PNG') # save PNG in file in memory
    file_object.seek(0)          # move to beginning of file
    return flask.send_file(file_object,  mimetype='image/png')

def array_to_json(array):
    return flask.jsonify(array.tolist())
