import argparse
import json
import os
import platform
import subprocess
import time
import webbrowser


def prompt_user_y_n(message):
    answer = None
    while answer == None:
        response = input(f"{message} (y/n): ")
        if response == "y" or response == "Y" or response == "Yes" or response == "YES" or response == "yes":
            answer = True
        elif response == "n" or response == "N" or response == "No" or response == "NO" or response == "no":
            answer = False
        else:
            print("enter 'yes' or 'no'")
    return answer


def main(src, dst, name, password):
    width = 4096
    height = 3000

    current_os = platform.system()
    if current_os == "Linux": separator = "/"
    elif current_os == "Windows": separator = "\\"
    else: raise Exception("Can only run on Linux and Windows")

    # strip triling slashes from paths
    src = src.rstrip("/").rstrip("\\")
    dst = dst.rstrip("/").rstrip("\\")
    
    dst = os.path.join(dst, name)

    # ensure directories exist
    if not os.path.exists(src):
        raise Exception(f"ERROR: no such path: {src}")
    if not os.path.exists(dst):
        if prompt_user_y_n(f"destination path {dst} does not exist. Do you wish to create it?"):
            os.makedirs(dst)
        else:
            raise Exception(f"ERROR: no such path: {dst}")

    # define config json
    cfg = {
        "name": f"{name}",
        "images": {
            "path": {
            "RGB": f"{src}{separator}RGB_{{id}}.png",
            "LWIR": f"{src}{separator}LWIR_{{id}}.png",
            "NIR": f"{src}{separator}NIR_{{id}}.png"
            },
            "shape": [width, height]
        },
        "classes": [
            {
            "name": "Background",
            "description": "background",
            "colour": [255, 255, 255, 0]
            },
            {
            "name": "Caribou",
            "description": "Caribou",
            "colour": [255, 36, 237, 70]
            },
            {
            "name": "Elk",
            "description": "Elk",
            "colour": [212, 56, 13, 70]
            },
            {
            "name": "Moose",
            "description": "Moose",
            "colour": [255, 149, 0, 70]
            },
            {
            "name": "Pronghorn",
            "description": "Pronghorn",
            "colour": [173, 139, 0, 70]
            },
            {
            "name": "Mountain Goat",
            "description": "Mountain Goat",
            "colour": [211, 242, 97, 70]
            },
            {
            "name": "Bison",
            "description": "Bison",
            "colour": [142, 96, 251, 70]
            },
            {
            "name": "Deer",
            "description": "Deer",
            "colour": [51, 102, 255, 70]
            },
            {
            "name": "Albino Bison",
            "description": "Albino Bison",
            "colour": [176, 15, 240, 70]
            },
            {
            "name": "Animal (unknown)",
            "description": "various unidentified animal types",
            "colour": [255, 163, 158, 70]
            },
            {
            "name": "Mountain Sheep",
            "description": "Mountain Sheep",
            "colour": [0, 158, 11, 70]
            },
            {
            "name": "Beaver Lodge",
            "description": "Beaver Lodge",
            "colour": [177, 142, 114, 70]
            },
            {
            "name": "Cattle",
            "description": "Cattle",
            "colour": [244, 191, 248, 70]
            },
            {
            "name": "Hotspot",
            "description": "Hotspots identified by the alignment and hotspot detection software (these do not need to be manually annotated)",
            "colour": [63, 196, 81, 70]
            },
        ],
        "views": {
            "RGB": {
            "description": "Normal RGB image.",
            "type": "image",
            "data": ["$RGB.B1", "$RGB.B2", "$RGB.B3"]
            },
            "LWIR": {
            "description": "Long Wave Infared",
            "type": "image",
            "data": "$LWIR.B1",
            "cmap": "gray"
            },
            "NIR": {
            "descrription": "Near Infared",
            "type": "image",
            "data": "$NIR.B1"
            }
        },
        "view_groups": {
            "default": ["RGB", "LWIR"]
        },
        "segmentation": {
            "path": f"{dst}/Masks/MASK_{{id}}.png",
            "mask_encoding": "rgb",
            "mask_area": [0, 0, width, height],
            "score": "f1",
            "unverified_threshold": 1,
            "test_images": None
        },
        "YOLO": {
            "path": f"{dst}/YOLO/LABELS_{{id}}.txt"
        }
    }
    # save config json to file
    json_path = os.path.join(dst, f"{name}.json")
    json_file = open(json_path, "w")
    json.dump(cfg, json_file)
    json_file.close()


    # start server and open site in browser
    try:
        p = subprocess.Popen(["iris", "-ap", password, "label", json_path], text=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
        time.sleep(3)
        webbrowser.open("http://localhost:5000/", autoraise=True)
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log = open("./log.txt", "w")
        log.write(p.stdout.read())
        log.close()
        p.terminate()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--images_path", help="path to folder containing aligned images")
    parser.add_argument("-d", "--destination", help="path to folder to hold config file and generated YOLO files")
    parser.add_argument("-n", "--project_name", help="OPTIONAL: unique name for the project, If not provided uses final directory name in images_path")
    parser.add_argument("-ap", "--admin_password", help="OPTIONAL: password to use for admin account when starting a new project, default: 'password'", default="password")
    args = parser.parse_args()
    if args.project_name:
        name = args.project_name
    else:
        name = os.path.basename(os.path.normpath(args.images_path))
    main(args.images_path, args.destination, name, args.admin_password)
