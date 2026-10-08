"""Take care of holding the current project's configurations

"""
import json
import os
import re
import struct
from copy import deepcopy
from glob import glob
from numbers import Number
from os.path import basename, dirname, exists, getmtime, isabs, join, normpath
from pprint import pprint

import markupsafe
import numpy as np
import rasterio as rio
import yaml
from matplotlib import cm
from skimage.filters import sobel
from skimage.io import imread
from skimage.segmentation import felzenszwalb

from iris.utils import merge_deep_dicts

TIFF_TAG_TILE_WIDTH = 322

def is_tiled_tiff(filename):
    """Whether the first image of a (Big)TIFF file is stored in tiles

    rasterio cannot tell a single tile from a single strip, hence we look for
    the TileWidth tag ourselves.
    """
    with open(filename, 'rb') as stream:
        header = stream.read(16)
        if header[:2] not in (b'II', b'MM'):
            return False
        order = '<' if header[:2] == b'II' else '>'
        version, = struct.unpack(order + 'H', header[2:4])
        if version == 42:
            offset, = struct.unpack(order + 'I', header[4:8])
            count_format, entry_format, entry_size = 'H', 'H', 12
        elif version == 43:
            offset, = struct.unpack(order + 'Q', header[8:16])
            count_format, entry_format, entry_size = 'Q', 'H', 20
        else:
            return False

        stream.seek(offset)
        count_size = struct.calcsize(count_format)
        count, = struct.unpack(order + count_format, stream.read(count_size))
        entries = stream.read(count * entry_size)

    tags = {
        struct.unpack_from(order + entry_format, entries, i * entry_size)[0]
        for i in range(count)
    }
    return TIFF_TAG_TILE_WIDTH in tags


def open_cog(filename):
    """Open a Cloud Optimized GeoTIFF, the only image format IRIS reads"""
    if not filename.lower().endswith(('.tif', '.tiff')):
        raise ValueError(
            f"'{filename}' is not a COG! IRIS only reads Cloud Optimized GeoTIFFs (.tif)."
        )

    dataset = rio.open(filename)
    if not is_tiled_tiff(filename) or dataset.crs is None:
        dataset.close()
        raise ValueError(
            f"'{filename}' is not a COG! It must be tiled and have a CRS."
        )
    return dataset


class Project:
    def __init__(self):
        # Each user is going to get a personalised random sequence of images:
        self.random_state = np.random.RandomState(seed=0)
        self.image_order = None
        self.image_ids = None
        self.file = None
        self.debug = False

    def load_from(self, filename):
        if not isabs(filename):
            filename = join(os.getcwd(), filename)
        self.file = filename

        if not filename.endswith('json') or filename.endswith('yaml'):
            raise Exception('[CONFIG] config file must be in JSON or YAML format!')

        # Load the project config:
        try:
            with open(filename) as stream:
                if filename.endswith('json'):
                    self.config = json.load(stream)
                elif filename.endswith('yaml'):
                    self.config = yaml.safe_load(stream)
        except Exception as error:
            raise Exception('[CONFIG] Error in config file: '+ str(error)) from error

        # Load default config:
        with open(join(dirname(__file__), "default_config.json")) as stream:
            self.config = merge_deep_dicts(
                json.load(stream), self.config
            )

        if 'name' not in self.config:
            self.config['name'] = ".".join(basename(filename).split(".")[:-1])

        # Normalise images.path: if a single string was provided in the
        # project JSON, convert it into a dictionary so downstream code that
        # expects a mapping will work consistently (use key 'pictures').
        try:
            if 'images' in self.config and isinstance(self.config['images'].get('path', None), str):
                self.config['images']['path'] = { 'pictures': self.config['images']['path'] }
        except Exception as e:
            # Non-fatal; leave config as-is on error
            print(f"Warning: Failed to normalize images.path: {e}")

        self._init_paths_and_files(filename)

        # Default seed
        self.set_image_seed(0)

        # The image size is read from the COG, all images must share it:
        _, _, width, height = self.get_georef(self.image_ids[0])
        self.config['images']['shape'] = [width, height]

        if self.segmentation:
            self.config['segmentation']['mask_shape'] = (
                self['segmentation']['mask_area'][2]-self['segmentation']['mask_area'][0],
                self['segmentation']['mask_area'][3]-self['segmentation']['mask_area'][1],
            )

            format = basename(self['segmentation']['path']).split('.')[-1].lower()
            if format not in ['tif', 'tiff']:
                raise Exception(
                    f"Unknown format for mask: '{format}'! Masks are saved as COG (.tif)."
                )
            encoding = self['segmentation']['mask_encoding']
            encodings = ['integer', 'binary', 'rgb', 'rgba']
            if encoding not in encodings:
                raise Exception(
                    f"Unknown mask encoding '{encoding}'! Allowed are: "
                    + ",".join(encodings)
                )

            if self['segmentation']['score'] not in ['f1', 'jaccard', 'accuracy']:
                raise Exception('Unknown segmentation score!', self['segmentation']['score'])

        # Make sure the HTML is understood in the descriptions:
        for name, view in self.config['views'].items():
            if view.get('type', 'image') != 'image':
                raise Exception(
                    f"[CONFIG] View '{name}' has type '{view['type']}'! Only 'image' "
                    "views exist: every view shows the COG at its place on the map."
                )
            view['name'] = name
            view['description'] = markupsafe.Markup(
                view.get('description', view['name'])
            )
            view['stretch'] = view.get('stretch', 'linear')
            if 'data' in view and isinstance(view['data'], str):
                # a single channel image:
                view['data'] = [view['data']]
                view['cmap'] = view.get('cmap', 'jet')

        self._normalise_classes(self.config)
        for mode in ['segmentation', 'classification', 'detection']:
            if mode in self.config:
                self._normalise_classes(self[mode])

        if "host" not in self.config:
            self['host'] = '127.0.0.1'
        if "port" not in self.config:
            self['port'] = 5000
        if "debug" not in self.config:
            self['debug'] = False

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

        if self.segmentation and not self['segmentation']['path']:
            self.config['segmentation']['path'] = join(
                self['path'], 'segmentation', '{id}', 'mask.tif'
            )

        # create the project path and the user configuration path
        os.makedirs(self['path'], exist_ok=True)
        os.makedirs(join(self['path'], 'user_config'), exist_ok=True)

        # Make all paths absolute:
        self['images']['path'] = self.make_absolute(self['images']['path'])
        self['images']['thumbnails'] = self.make_absolute(
            self['images'].get('thumbnails', False)
        )
        self['images']['metadata'] = self.make_absolute(
            self['images'].get('metadata', False)
        )
        if self.segmentation:
            self['segmentation']['path'] = self.make_absolute(
                self['segmentation']['path']
            )

        if isinstance(self['images']['path'], dict):
            image_paths = list(self['images']['path'].values())[0]
        else:
            image_paths = self['images']['path']

        # We will need to extract the image id by using regex. Compile it here
        # to get a better perfomance:
        before, id_str, after = image_paths.partition("{id}")
        if not id_str:
            raise Exception('[CONFIG] images:path must contain exactly one placeholder "{id}"!')
        escaped_path = re.escape(before)
        escaped_path += "(?P<id>.+)"
        escaped_path += re.escape(after)
        regex_images = re.compile(escaped_path)

        images = glob(image_paths.format(id="*"))
        if not images:
            raise Exception(
                f"[CONFIG] No images found in '{image_paths.format(id='*')}'.\n"
                "Did you set images:path to a valid, existing path?")

        try:
            self.image_ids = sorted([
                regex_images.match(image_path).groups()[0]
                for image_path in images
            ])
        except Exception as err:
            raise Exception(
                f'[ERROR] Could not extract id\nfrom path"{image_paths}"\nwith regex "{regex_images}"!'
            ) from err


    def make_absolute(self, path):
        """Make path absolute relatively from project path"""
        if isinstance(path, dict):
            return {
                k: self.make_absolute(v)
                for k, v in path.items()
            }
        elif isinstance(path, list):
            return list(map(self.make_absolute, path))

        if not path or isabs(path):
            return path
        else:
            return normpath(join(dirname(self.file), path))

    @property
    def segmentation(self):
        return 'path' in self.config.get('segmentation', [])

    def get_start_image_id(self):
        return self.image_ids[self.image_order[0]]

    def load_image(self, filename, bands=None):
        """Load image from a COG file

        Args:
            filename:
            bands: Defines which bands to load from file. Must be a list of
                names starting with $, e.g. "$B1" or "$Sentinel2.B1"

        Returns:
            Returns a dictionary with the band names as keys and band array as
            value.
        """
        # The user uses band identifiers (like 'B1', etc):
        if bands is not None:
            bands = [int(s.replace("$B", ""))-1 for s in bands]

        with open_cog(filename) as file:
            if bands is None:
                bands = list(range(file.count))
            array = np.moveaxis(file.read([b + 1 for b in bands]), 0, -1)

        data = {
            f"B{b+1}": array[..., i]
            for i, b in enumerate(bands)
        }
        return data

    def get_image(self, image_id, bands=None):
        """Get the image data as dictionary

        Args:
            image_id: Id of the image as string.
            bands: Bands of the image file (or files) to select, e.g. "$B1" or
                "$Sentinel2.B1".

        Returns:
            A dict with bands. The keys are either "$B1"..."$Bn" or
            "$FileIdentifier.B1".
        """

        if isinstance(self['images']['path'], dict):
            data = {}
            for file_id, filename in self['images']['path'].items():
                if bands is None:
                    file_bands = None
                else:
                    file_bands = [
                        band.replace(file_id+'.', '')
                        for band in bands
                        if band.startswith('$'+file_id+'.')
                    ]
                    if not file_bands:
                        continue

                image = self.load_image(
                    filename.format(id=image_id), bands=file_bands
                )
                data[file_id] = image
        else:
            data = self.load_image(
                self['images']['path'].format(id=image_id),
                bands=bands
            )
            data = {
                '$'+key: value
                for key, value in data.items()
            }

        return data

    def get_image_bands(self, image_id):
        # TODO: probably we could do this faster:
        image = self.get_image(image_id)

        bands = []
        for band in image:
            if isinstance(image[band], dict):
                bands.extend([f'${band}.{subband}' for subband in image[band]])
            else:
                bands.append(f'{band}')
        return bands

    def get_image_path(self, image_id):
        if isinstance(self['images']['path'], dict):
            return {
                k: v.format(id=image_id)
                for k, v in self['images']['path'].items()
            }
        else:
            return self['images']['path'].format(id=image_id)

    def get_georef(self, image_id):
        """CRS, transform, width and height of an image

        Images split into several files take the georeference of the first file.
        """
        path = self.get_image_path(image_id)
        if isinstance(path, dict):
            path = next(iter(path.values()))

        with open_cog(path) as file:
            return file.crs, file.transform, file.width, file.height

    def render_image(self, image_id, view):
        # Find all required variables
        bands = re.findall(r'(?:\$\w+\.{0,1}\w+)', ";".join(view['data']))
        image = self.get_image(image_id, bands=bands)
        environment = self._get_render_environment(image)

        rgb_bands = []
        for i, expression_raw in enumerate(view['data']):
            expression = re.sub(r'\$(\w+)\.(\w+)', r'\1["\2"]', expression_raw)
            expression = re.sub(r'\$(\w+)', r'\1', expression)
            try:
                # Since one should never rely on evaluating an expression from
                # untrusted sources, we will have to find a different solution
                # to make it safe.
                self._check_band_expression(expression)
                rgb_bands.append(
                    eval(expression, {"__builtins__": None}, environment)
                )
            except Exception as error:
                print(
                    f"Could not parse {i}th expression of {view['name']}\n",
                    f"Raw expression: {expression_raw}\n",
                    f"Python expression: {expression}\n",
                    f"Error: {error}\n",
                    "Environment:"
                )
                pprint(environment)

        # Broadcast (single numbers are converted to an array with the size of
        # image)
        image_size = project['images']['shape'][0] * project['images']['shape'][1]
        for i, band in enumerate(rgb_bands):
            if isinstance(band, Number):
                band = np.repeat(band, image_size)
                band = band.reshape(*project['images']['shape'])

            rgb_bands[i] = band

        # Stretch between 0->1, with percentile clip if specified in view
        if 'clip' in view:
            if 'vmin' in view or 'vmax' in view:
                raise ValueError("Cannot specify both 'clip' and 'vmin'/'vmax' in view")
            clip = float(view['clip'])
            def linear_scale(z):
                return np.clip(
                            (z - np.percentile(z,clip))/(np.percentile(z,100-clip)-np.percentile(z,clip)),
                            0,
                            1
                            )
        elif 'vmin' in view or 'vmax' in view:
            if 'vmin' in view and 'vmax' in view:
                def linear_scale(z):
                    return np.clip((z - view['vmin'])/(view['vmax']-view['vmin']), 0, 1)
            elif 'vmin' in view:
                def linear_scale(z):
                    return np.clip((z - view['vmin'])/(z.max()-view['vmin']), 0, 1)
            elif 'vmax' in view:
                def linear_scale(z):
                    return np.clip((z - z.min())/(view['vmax']-z.min()), 0, 1)
        else:
            def linear_scale(z):
                return (z - z.min())/(z.max()-z.min())
        rgb_bands = list(map(linear_scale, rgb_bands))

        if len(rgb_bands) == 1:
            rgb_bands = cm.get_cmap(view['cmap'])(rgb_bands)[..., :3]

        rgb_bands = np.dstack(rgb_bands)
        return (255*rgb_bands).astype('uint8')

    def _get_render_environment(self, image):
        return {
            'max': np.max,
            'min': np.min,
            'mean': np.mean,
            'median': np.median,
            'log': np.log,
            'exp': np.exp,
            'sin': np.sin,
            'cos': np.cos,
            'PI': np.pi,
            'edges': sobel,
            'superpixels': felzenszwalb,
            **{
                key.strip('$'): value
                for key, value in image.items()
            },
        }

    def _check_band_expression(self, expression):
        forbidden_tokens = ['lambda', '__', 'except', 'eval', ';']

        for forbidden in forbidden_tokens:
            if forbidden in expression:
                raise Exception(
                    f"'{forbidden}' is not allowed in band expressions!\n"
                    + f"Expression: {expression}"
                )

    def get_metadata(self, image_id):
        filename = self['images'].get('metadata', False)
        if not filename:
            return {}

        filename = filename.format(id=image_id)

        with open(filename) as stream:
            if filename.endswith('json'):
                metadata = json.load(stream)
            elif filename.endswith('yaml'):
                metadata = yaml.safe_load(stream)
            else:
                return {"__body__": stream.read()}

        return metadata

    def get_thumbnail(self, image_id):
        filename = self['images'].get('thumbnails', False)
        if not filename:
            return None

        return imread(filename.format(id=image_id))

    def get_user_config(self, user_id):
        filename = join(self['path'], 'user_config', f'{user_id}.json')
        config = deepcopy(self.config)

        # Only if the user config is newer the system's config file, we use it
        # for updates:
        if exists(filename) and getmtime(self.file) <= getmtime(filename):
            with open(filename) as stream:
                user_config = json.load(stream)

            config = merge_deep_dicts(config, user_config)
            # Actually, it would be a security risk to allow some options to be
            # set by the user (or by a potential attacker):
            config['images'] = deepcopy(self.config['images'])
            config['views'] = deepcopy(self.config['views'])
            if "path" in self.config['segmentation']:
                config['segmentation']['path'] = self.config['segmentation']['path']

        return config

    def save_user_config(self, user_id, user_config):
        filename = join(self['path'], 'user_config', f'{user_id}.json')

        with open(filename, 'w') as stream:
            json.dump(user_config, stream)

    def get_next_image(self, image_id, user_id):

        original_index = self.image_ids.index(image_id)
        index = self.image_order.index(original_index)

        # 'prioritise_unmarked_images' mode will search the database of existing
        # masks, and find images with the lowest number of annotations to serve
        # when a user asks for the next image. Then it will swap this image
        # into the existing order to make it come up next.
        if self.config['segmentation']['prioritise_unmarked_images']:
            from iris.models import Action
            actions = Action.query.all()
            # Same order as self.image_order (NOT self.image_ids)
            mask_count = [0]*len(self.image_order)
            mask_count[index] = 99999 # Make sure the current image isn't selected as the new one
            for action in actions:
                mask_count[
                    self.image_order.index(
                        self.image_ids.index(
                            action.image_id
                            )
                            )
                            ] += 1

                if user_id.id == action.user_id:
                    mask_count[
                        self.image_order.index(
                            self.image_ids.index(
                                action.image_id
                                )
                                )
                                ] += 9999

            min_labellers = min(mask_count)
            # iterate through images until one is found with fewest existing masks
            next_image_found = False
            trial_idx = index
            while not next_image_found:
                trial_idx = (trial_idx + 1) % len(self.image_order)
                if mask_count[trial_idx] == min_labellers and trial_idx != index:
                    # Once a suitable image is found, update the list so that its
                    # next in line (this means self.get_previous_image retains expected
                    # behaviour immediately afterwards).
                    a = trial_idx
                    b = (index + 1) % len(self.image_order)
                    self.image_ids[self.image_order[a]], self.image_ids[self.image_order[b]] = \
                        self.image_ids[self.image_order[b]], self.image_ids[self.image_order[a]]
                    next_image_found = True
        index = (index + 1) % len(self.image_order)
        return self.image_ids[self.image_order[index]]

    def get_previous_image(self, image_id):
        original_index = self.image_ids.index(image_id)

        index = self.image_order.index(original_index)
        index = (index - 1) % len(self.image_order)
        return self.image_ids[self.image_order[index]]

    def set_image_seed(self, seed):
        self.random_state = np.random.RandomState(seed=seed)
        self.image_order = list(range(len(self.image_ids)))

        self.random_state.shuffle(self.image_order)

project = Project()
