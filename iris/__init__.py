import argparse
import json
from os.path import basename, dirname, exists, join
import os
import sys

import numpy as np
import yaml

def run_app():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "mode", type=str,
        help="Specify the mode you want to start iris, i.e. either *label* or *conclude*."
    )
    parser.add_argument(
        "project", type=str,
        help="Path to the project configurations file (yaml or json)."
    )
    parser.add_argument(
        "-d", "--debug", action="store_true",
        help="start the app in debug mode"
    )
    args = parser.parse_args()

    # Load the configurations of the project:
    with open(args.project, 'r') as stream:
        if args.project.endswith('json'):
            project = json.load(stream)
        elif args.project.endswith('yaml'):
            project = yaml.safe_load(stream)
        else:
            raise OSError('Project file must be a JSON or YAML file!')

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
        if file == project['image_filename']
    }
    project['tile_ids'] = list(sorted(project['tiles'].keys()))

    if args.mode == "label":
        import iris.label
        iris.label.start(project, args.debug)
    elif args.mode == "conclude":
        import iris.conclude
        iris.conclude.start(project, args.debug)
    else:
        print("Wrong mode! Allowed are label or conclude.")

if __name__ == '__main__':
    run_app()
