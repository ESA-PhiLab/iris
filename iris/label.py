import hashlib
import io
import json
import os
from os.path import basename, dirname, exists, join
import time

import cv2 as cv
import lightgbm as lgb
import flask
from flask_compress import Compress
import numpy as np
from PIL import Image
from scipy.ndimage import minimum_filter, maximum_filter
from skimage.io import imread
from sklearn.model_selection import train_test_split
import yaml

app = flask.Flask(__name__)
app.config['EXPLAIN_TEMPLATE_LOADING'] = True

# Reduce the amount of transferred data by compressing it:
Compress(app)
app.config['COMPRESS_MIMETYPES'] = [
    'text/html', 'text/css', 'text/xml',
    'application/json', 'application/octet-stream',
    'application/javascript'
]

# We need this secret key to encrypt cookies
app.secret_key = os.urandom(16)

def start(project, debug):
    # Make sure the HTML is understood in the descriptions:
    for view in project['views']:
        view['description'] = flask.Markup(view['description'])
    app.config['project'] = project

    # Let's the fun begin
    app.run(debug=debug)

def create_user(username, password):
    pass

def load_user(username):
    user_id = hashlib.md5(username.encode()).hexdigest()
    file = join(app.config['project']['users_path'], user_id+'.yaml')
    if not exists(file):
        raise Exception("User does not exist or password is wrong!")

    with open(file, 'r') as stream:
        return yaml.safe_load(stream)

def save_user(user):
    file = join(app.config['project']['users_path'], user['id']+'.yaml')
    with open(file, 'w') as stream:
        yaml.dump(user, stream)

@app.route('/')
def index():
    return flask.redirect(flask.url_for('next_tile'))

@app.route('/register', methods=['POST'])
def register():
    if flask.request.method != 'POST':
        return False

    data = json.loads(flask.request.data)


@app.route('/login', methods=['POST'])
def login():
    if flask.request.method != 'POST':
        return False

    data = json.loads(flask.request.data)
    flask.session['user'] = load_user(data['username'])
    save_user(flask.session['user'])

    return flask.jsonify({
        'sucess': True,
        'user': flask.session['user'],
    })

@app.route('/logout')
def logout():
    save_user(flask.session['user'])

    # remove the username from the session if it's there
    flask.session.pop('user', None)
    return flask.redirect(flask.url_for('index'))

def get_start_tile():
    return app.config['project']['tile_ids'][0]

def get_tile_ids():
    # We will change this in future so each user gets different tiles:
    return app.config['project']['tile_ids']

@app.route('/segmentation', methods=['GET'])
def segmentation():
    user = flask.session.get('user', None)
    tile_id = flask.request.args.get('tile_id', get_start_tile())

    return flask.render_template(
        'segmentation.html', tile_id=tile_id,
        tile_shape=app.config['project']['image_shape'], mask_area=app.config['project']['mask_area'],
        views=app.config['project']['views'], classes=app.config['project']['classes'],
        user=user,
        thumbnail_available=bool(app.config['project']['files']['thumbnail']),
        metadata_available=bool(app.config['project']['files']['metadata']),
    )

@app.route('/next_tile', methods=['GET'])
def next_tile():
    tile_ids = get_tile_ids()
    tile_id = flask.request.args.get('tile_id', get_start_tile())
    index = tile_ids.index(tile_id);
    index += 1
    if index >= len(tile_ids):
        index = 0

    return flask.redirect(
        flask.url_for('segmentation', tile_id=tile_ids[index])
    )

@app.route('/previous_tile', methods=['GET'])
def previous_tile():
    tile_ids = get_tile_ids()
    tile_id = flask.request.args.get('tile_id', get_start_tile())
    index = tile_ids.index(tile_id);
    index -= 1
    if index >= len(tile_ids):
        index = 0

    return flask.redirect(
        flask.url_for('segmentation', tile_id=tile_ids[index])
    )

@app.route('/save_mask/<tile_id>', methods=['POST'])
def save_mask(tile_id):
    user = flask.session.get('user', None)
    print('SAVING BY', user)

    if user is None:
        return 'false'

    t = time.time()
    data = np.frombuffer(flask.request.data, dtype=np.uint8)
    print(f'transfer time: {time.time()-t:.2f}s')

    # We will get an octet stream (uint8) from the website. It contains:
    # 0 to 1: magic start byte 254
    # 1 to mask_length: mask
    # mask_length to 2*mask_length: user mask
    # 2*mask_length + 1: magic end byte 254
    mask_length = \
        app.config['project']['mask_shape'][0] \
        * app.config['project']['mask_shape'][1]

    if len(data) != 2*mask_length + 2:
        print('Error: Octet-stream does not have the expected length!')
        print(f'Expected length: {2*mask_length + 2}, received length: {len(data)}')
        return 'false'
    elif data[0] != 254 and data[-1] != 254:
        print('Error: Magic numbers are not correct!')
        print(f'Start number: {data[0]}, end number: {data[-1]}')
        return 'false'

    # We get the mask in the form HxW where each element is a class id
    mask = data[1:mask_length+1]
    mask = mask.reshape(app.config['project']['mask_shape'][::-1])

    # The user mask denotes who classified the pixels in the mask. If true, then
    # the user classified the pixel otherwise it was classified by the AI:
    user_mask = data[1+mask_length:-1].astype(np.bool)
    user_mask = user_mask.reshape(app.config['project']['mask_shape'][::-1])

    # Change the mask to an encoded mask with the dimensions HxWxC where C is a
    # boolean layer for each different class
    encoded_mask = np.empty((*mask.shape, len(app.config['project']['classes'])))
    for i in range(encoded_mask.shape[-1]):
        encoded_mask[..., i] = mask == i

    output_dir = join(app.config['project']['masks_path'], tile_id)
    os.makedirs(output_dir, exist_ok=True)
    np.save(
        join(output_dir, f"{user['id']}.npy"),
        encoded_mask.astype(bool),
        allow_pickle=False,
    )

    np.save(
        join(output_dir, f"{user['id']}_user.npy"),
        user_mask.astype(bool),
        allow_pickle=False,
    )

    # We need this to send a successful response to the client
    return 'true'


@app.route('/load_mask/<tile_id>')
def load_mask(tile_id):
    user = flask.session.get('user', None)
    print('LOADING MASK BY', user)

    if user is not None:
        mask_file = join(
            app.config['project']['masks_path'], tile_id, f"{user['id']}.npy"
        )
        user_mask_file = join(
            app.config['project']['masks_path'], tile_id,
            f"{user['id']}_user.npy"
        )
        if exists(mask_file) and exists(user_mask_file):
            print(f"Load {user['name']}'s mask")
            mask = np.argmax(np.load(mask_file), axis=-1)
            user_mask = np.load(user_mask_file)

            data = np.concatenate([mask.ravel(), user_mask.ravel()])
            data = np.pad(data, 1, constant_values=(254, 254))

            response = flask.make_response(
                data.astype(np.uint8).tobytes()
            )
            response.headers.set('Content-Type', 'application/octet-stream')
            return response

    print('Use default mask')
    return flask.jsonify({
        'use_default_mask': True,
    })

def read_tile(tile_id):
    filename = join(
        app.config['project']['tiles'][tile_id],
        app.config['project']['files']['image']
    )

    if filename.endswith('npy'):
        return np.load(filename)
    else:
        image = imread(filename)
        return image

@app.route('/predict_mask/<tile_id>', methods=['POST'])
def predict_mask(tile_id):
    image = read_tile(tile_id)
    n_channels = image.shape[-1]

    # Select only the masking area:
    mask_area = (
        slice(app.config['project']['mask_area'][0], app.config['project']['mask_area'][2]),
        slice(app.config['project']['mask_area'][1], app.config['project']['mask_area'][3]),
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

@app.route('/load_tile/<tile_id>/<int:view>')
def load_tile(tile_id, view):
    image = read_tile(tile_id)
    user_image = parse_channels(
        app.config['project']['views'][view]['channels'], image
    )
    return array_to_png(user_image)

def parse_channels(channels, image):
    bands = {f"B{i+1}": image[..., i] for i in range(image.shape[-1])}

    user_bands = [
        eval(channel, bands)
        for channel in channels
    ]

    return np.moveaxis(np.stack(user_bands), 0, -1)

def get_tile_dir(tile_id):
    return app.config['project']['tiles'][tile_id]

@app.route('/load_metadata/<tile_id>')
def load_metadata(tile_id):
    try:
        filename = join(
            get_tile_dir(tile_id),
            app.config['project']['files']['metadata']
        )
        with open(filename, 'r') as stream:
            if filename.endswith('json'):
                metadata = json.load(stream)
            elif filename.endswith('yaml'):
                metadata = yaml.safe_load(stream)
            else:
                raise Exception("Unknown metadata format!")

        metadata = {
            k: flask.Markup(str(v))
            for k, v in metadata.items()
        }
        return flask.jsonify({
            "data": metadata
        })
    except Exception as err:
        print(err)
        return flask.jsonify({
            "error": "Could not load metadata file."
        })

@app.route('/load_thumbnail/<tile_id>')
def load_thumbnail(tile_id):
    filename = join(
        get_tile_dir(tile_id),
        app.config['project']['files']['thumbnail']
    )
    array = cv.imread(filename)
    return array_to_png(array[...,::-1])

def array_to_png(array):
    if array.dtype == np.float32:
        array = np.clip(array * 255., 0, 255).astype('uint8')

    img = Image.fromarray(array) # convert arr to image
    file_object = io.BytesIO()   # create file in memory
    img.save(file_object, 'PNG') # save PNG in file in memory
    file_object.seek(0)          # move to beginning of file
    return flask.send_file(file_object,  mimetype='image/png')

def array_to_json(array):
    return flask.jsonify(array.tolist())
