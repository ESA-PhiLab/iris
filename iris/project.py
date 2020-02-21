"""Take care of holding the current project's configurations

"""
from glob import glob
from numbers import Number
import os
from os.path import basename, dirname, exists, isabs, join, normpath
import re

import flask
import json
import numpy as np
from skimage.io import imread
import yaml

class Project:
    def __init__(self):
        # Each user is going to get a personalised random sequence of images:
        self.random_state = np.random.RandomState(seed=0)
        self.image_indices = None
        self.name = None
        self.user_id = None
        self._re_images = None
        self.file = None

    def load_from(self, filename):
        self.file = filename

        if not filename.endswith('json') or filename.endswith('yaml'):
            raise Exception('[CONFIG] config file must be in JSON or YAML format!')

        if not isabs(filename):
            filename = join(os.getcwd(), filename)

        try:
            with open(filename, 'r') as stream:
                if filename.endswith('json'):
                    self.config = json.load(stream)
                elif filename.endswith('yaml'):
                    self.config = yaml.safe_load(stream)
        except Exception as error:
            raise Exception('[CONFIG] Error in config file: '+ str(error))

        if 'name' not in self.config:
            self.config['name'] = ".".join(basename(filename).split(".")[:-1])

        if self.segmentation:
            if 'segmentation' not in self.config:
                raise Exception('[CONFIG] segmentation configuration is required for segmentation mode!')

            self.config['segmentation']['mask_shape'] = (
                self['segmentation']['mask_area'][2]-self['segmentation']['mask_area'][0],
                self['segmentation']['mask_area'][3]-self['segmentation']['mask_area'][1],
            )

        if isinstance(self['authentication_required'], str):
            if self['authentication_required'].lower == 'false':
                self['authentication_required'] = False
            else:
                self['authentication_required'] = True

        self._init_paths_and_files(filename)

        # Default seed
        self.set_image_seed(0)

        if self.segmentation:
            format = basename(self['segmentation']['path']).split('.')[-1].lower()
            encodings = {
                'npy': ['integer', 'binary', 'rgb', 'rgba'],
                'tif': ['integer', 'rgb', 'rgba'],
                'png': ['integer', 'rgb', 'rgba'],
                'jpg': ['rgb'],
                'jpeg': ['rgb'],
            }

            if format not in encodings:
                raise Exception(
                    f"Unknown format for mask: '{format}'! Allowed are: "
                    + ",".join(encodings)
                )
            encoding = self['segmentation']['mask_encoding']
            if encoding not in encodings[format]:
                raise Exception(
                    f"Mask format '{format}' does not allow '{encoding}' encoding! Allowed are: "
                    + ",".join(encodings[format])
                )

            self['segmentation']['score'] = self['segmentation'].get(
                self['segmentation']['score'], "f1"
            )
            if self['segmentation']['score'] not in ['f1', 'jaccard', 'accuracy']:
                raise Exception('Unknown segmentation score!', self['segmentation']['score'])

        # Make sure the HTML is understood in the descriptions:
        for view in self.config['views']:
            view['description'] = flask.Markup(
                view.get('description', view['name'])
            )
            if isinstance(view['content'], list):
                view['type'] = 'rgb'
            else:
                view['type'] = view['content']

        self._normalise_classes(self.config)
        for mode in ['segmentation', 'classification', 'detection']:
            if mode in self.config:
                self._normalise_classes(self[mode])

    def __getitem__(self, key):
        return self.config[key]

    def __setitem__(self, key, value):
        self.config[key] = value

    def _normalise_classes(self, data):
        if "classes" not in data:
            return

        for klass in data['classes']:
            klass['css_colour'] = f'rgba({str(klass["colour"])[1:-1]})'

    def _init_paths_and_files(self, filename):
        if project not in self.config:
            self.config['path'] = join(
                dirname(filename), self.config['name']+'.iris'
            )

        if self.segmentation:
            if not self['segmentation']['path']:
                self.config['segmentation']['path'] = join(
                    self['path'], 'segmentation', '{id}', 'mask.npy'
                )

        # create the project path and the user configuration path
        os.makedirs(self['path'], exist_ok=True)
        os.makedirs(join(self['path'], 'user_config'), exist_ok=True)

        # Make all paths absolute:
        self['images']['path'] = self.make_absolute(self['images']['path'])
        if "thumbnails" in self.config['images']:
            self['images']['thumbnails'] = self.make_absolute(
                self['images']['thumbnails']
            )
        if "metadata" in self.config['images']:
            self['images']['metadata'] = self.make_absolute(
                self['images']['metadata']
            )
        if self.segmentation:
            self['segmentation']['path'] = self.make_absolute(
                self['segmentation']['path']
            )

        # pre-compile the regex for the image path to get a better performance.
        # We will need it later to extract the image id:
        id_pos = self['images']['path'].find("{id}")
        if self['images']['path'].count('{id}') != 1:
            raise Exception('[CONFIG] images:path must contain exactly one placeholder "{id}"!')
        escaped_path = re.escape(self['images']['path'][:id_pos])
        escaped_path += "(?P<id>.+)"
        escaped_path += re.escape(self['images']['path'][id_pos+4:])

        self._re_images = re.compile(escaped_path)

        self.config['files'] = dict(
            self._get_file_paths(image)
            for image in glob(self['images']['path'].format(id="*"))
        )

        if not self.config['files']:
            raise Exception(
                f"[CONFIG] No images found in '{self['images']['path']}'.\n"
                "Did you set images:path to a valid, existing path?")

        self.config['file_ids'] = list(sorted(self.config['files'].keys()))

    def make_absolute(self, path):
        if not path:
            return path

        if not isabs(path):
            return normpath(join(dirname(self.file), path))

    def _get_file_paths(self, image_path):
        try:
            match = self._re_images.match(image_path)
            if match is None:
                raise Exception(
                    f'[ERROR] Could not extract id\nfrom path"{image_path}"\nwith regex "{self._re_images}"!'
                )
            image_id = match.groups()[0]

            files = {
                'image': image_path,
            }

            if project.segmentation:
                files['mask'] = self['segmentation']['path'].format(id=image_id)

            thumbnail_path = self['images'].get('thumbnails', False)
            if thumbnail_path:
                thumbnail_path = thumbnail_path.format(id=image_id)
            files['thumbnail'] = thumbnail_path
            metadata_path = self['images'].get('metadata', False)
            if metadata_path:
                metadata_path = metadata_path.format(id=image_id)
            files['metadata'] = metadata_path
            return image_id, files
        except Exception as error:
            raise Exception(
                f'[ERROR] Could not prepare "{image_path}":\n{error}'
            )

    def segmentation(self):
        return 'segmentation' in self.config['label_mode']

    def get_start_image(self):
        return self['file_ids'][self.image_indices[0]]

    def get_image(self, image_id, channels=None):
        filename = self['files'][image_id]['image']

        if filename.endswith('npy'):
            array = np.load(filename)
        else:
            array = imread(filename)

        if isinstance(channels, list):
            array = self.parse_channels(array, channels)

        if issubclass(array.dtype.type, np.floating):
            array = np.clip(array * 255., 0, 255).astype('uint8')

        return array

    def parse_channels(self, image, channels):
        environment = {f"B{i+1}": image[..., i] for i in range(image.shape[-1])}
        environment['np'] = np

        rgb_bands = [
            eval(channel, {"__builtins__": None}, environment)
            for channel in channels
        ]

        # Broadcast:
        for i, band in enumerate(rgb_bands):
            if isinstance(band, Number):
                array = np.repeat(band, image.shape[0]*image.shape[1])
                rgb_bands[i] = array.reshape(*image.shape[:-1])

            print(f"B{i} (min, max):",rgb_bands[i].min(), rgb_bands[i].max())

        return np.moveaxis(np.stack(rgb_bands), 0, -1)

    def get_metadata(self, image_id):
        filename = self['files'][image_id].get('metadata', False)
        if not filename:
            return None

        with open(filename, 'r') as stream:
            if filename.endswith('json'):
                metadata = json.load(stream)
            elif filename.endswith('yaml'):
                metadata = yaml.safe_load(stream)
            else:
                return {"__body__": stream.read()}

        return metadata

    def get_thumbnail(self, image_id):
        filename = self['files'][image_id]['thumbnail']
        return imread(filename)

    def get_user_config(self, default=False):
        filename = join(self['path'], 'user_config', f'{self.user_id}.json')
        if not exists(filename) or default:
            filename = join(dirname(__file__), 'user/default_config.json')

        with open(filename, 'r') as stream:
            return json.load(stream)

    def save_user_config(self, user_config):
        filename = join(self['path'], 'user_config', f'{self.user_id}.json')

        with open(filename, 'w') as stream:
            json.dump(user_config, stream)

    def get_next_image(self, image_id):
        original_index = self.config['file_ids'].index(image_id);

        index = self.image_indices.index(original_index)
        index += 1
        if index >= len(self.image_indices):
            index = 0

        return self['file_ids'][self.image_indices[index]]

    def get_previous_image(self, image_id):
        original_index = self.config['file_ids'].index(image_id);

        index = self.image_indices.index(original_index)
        index -= 1
        if index < 0:
            index = len(self.image_indices)-1

        return self['file_ids'][self.image_indices[index]]

    def set_user_id(self, user_id):
        self.user_id = user_id

    def set_image_seed(self, seed):
        self.random_state = np.random.RandomState(seed=seed)
        self.image_indices = list(range(len(self.config['file_ids'])))

        self.random_state.shuffle(self.image_indices)

project = Project()
