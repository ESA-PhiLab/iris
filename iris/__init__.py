import argparse
import json
from os.path import basename, dirname, exists, isabs, join
import os
import sys

import numpy as np
import yaml

def run_app():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "mode", type=str,
        help="Specify the mode you want to start iris, can be either *label*, *demo* or *conclude*."
    )
    parser.add_argument(
        "project", type=str, nargs='?',
        help="Path to the project configurations file (yaml or json)."
    )
    parser.add_argument(
        "-d", "--debug", action="store_true",
        help="start the app in debug mode"
    )
    args = parser.parse_args()

    if args.mode == "demo":
        filename = join(
            dirname(dirname(__file__)), "examples/cloud-segmentation.json"
        )
        project = load_config(filename)
    elif args.mode == "label" or args.mode == "conclude":
        if not args.project:
            raise Exception("Label or conclude mode require a project file!")

        project = load_config(args.project)
    else:
        raise Exception(f"Unknown mode '{mode}'!")

    project['mask_shape'] = (
        project['mask_area'][2]-project['mask_area'][0],
        project['mask_area'][3]-project['mask_area'][1],
    )

    project['users_path'] = join(project['out_path'], 'users')
    os.makedirs(project['users_path'], exist_ok=True)
    project['masks_path'] = join(project['out_path'], 'masks')

    project['tiles'] = {
        basename(root): root
        for root,dirs,files in os.walk(project['in_path'])
        for file in files
        if file == project['files']['image']
    }
    if not project['tiles']:
        raise Exception(f"No images found in '{project['in_path']}'. Did you set files:image correctly in the config file?")

    project['tile_ids'] = list(sorted(project['tiles'].keys()))

    if args.mode == "label" or args.mode == "demo":
        import iris.label
        iris.label.start(project, args.debug)
    elif args.mode == "conclude":
        import iris.conclude
        iris.conclude.start(project, args.debug)
    else:
        raise Exception(f"Unknown mode '{mode}'!")


def load_config(filename):
    # Load the configurations of the project:
    with open(filename, 'r') as stream:
        if filename.endswith('json'):
            config = json.load(stream)
        elif filename.endswith('yaml'):
            config = yaml.safe_load(stream)
        else:
            raise OSError('Project file must be a JSON or YAML file!')

    if not isabs(config['in_path']):
        config['in_path'] = join(dirname(filename), config['in_path'])

    if not isabs(config['out_path']):
        config['out_path'] = join(dirname(filename), config['out_path'])

    if not exists(config['in_path']):
        raise Exception(f"[CONFIG] in_path '{config['in_path']}' does not exist!")

    default_files = {
        'image': 'image.tif',
        'thumbnail': False,
        'metadata': False,
    }

    config['files'] = {**default_files, **config['files']}

    return config

if __name__ == '__main__':
    run_app()
