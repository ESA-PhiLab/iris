# IRIS - Intelligence foR Image Segmentation<sup>1</sup>
<sup>1</sup>Yes, it is a <a href="https://en.wikipedia.org/wiki/Backronym">backronym</a>.
**Work in progress.**

<img src="preview/1.png" />

Tool for manual image segmentation and classification of satellite imagery (or images in general). It was designed to accelerate the creation of machine learning training datasets for Earth Observation. This application is a flask app which can be run locally. Special highlights:
* Support by AI (gradient boosted decision tree) when doing image segmentation
* Multiple and configurable views for multispectral imagery available
* Simple setup by one configuration file
* Platform independent app (runs on Linux, Windows and Mac OS)

<hr />

## Installation
Since IRIS is written in python, you will need a python 3.7 environment to use this app.
Go to your preferenced installation folder via your console and clone this repository by running:

`git clone https://github.com/ESA-PhiLab/iris.git`.

Enter the iris directory with

`cd iris`

and install the app with pip

`pip install .`

This should install all necessary python packages automatically.

## Usage
You will need a configuration file to run IRIS. There is one example in the examples folder you can use. 

You can start IRIS in two different modes:
1) **label:** This will open a local browser application which helps you to perform manual segmentation of the images in your project. Start IRIS in the label mode like this: `iris label PROJECT_FILE`. Then open this address with your browser (chrome or firefox): `http://localhost:5000`

2) **conclude:** (NOT YET IMPLEMENTED) After labelling is done (by using the *label* mode), you can use this mode to bundle the output masks and get some statistics.

## Documentation

### Label interface

### Project file
Before you can use IRIS, you have to provide a configurations file for your project (must be in yaml or json format). See [here](examples/example-config.json) for an example.

The table below shows different options for the configurations:

Field | Description | JSON Example
--- | --- | ---
**label-mode** | IRIS is going to provide different label modes: *segmentation* or *classification* (the latter is not yet implemented) | <sub><sup>`"label-mode": segmentation`</sub></sup>
**in_path** | The input directory for your project. This directory should contain subfolders (which names present the tile ids) with the images that you want to label. | <sub><sup>`"in_path": "/home/user/projects/sentinel-labeling/examples"`</sub></sup>
**image_filename** | The filename of the images inside the tile folders. IRIS can load standard image formats (like *png* or *tif*) and numpy files (*npy*). The arrays inside the numpy arrays should have the shape HxWxC | <sub><sup>`"image_filename": "image.npy"` </sub></sup>
**out_path** | The output directory for your project. This directory will contain the mask files (from the segmentation) and user configurations | <sub><sup>`"out_path": "/home/user/projects/sentinel-labeling/results"` 
**classes** | This is a list of classes that you want to allow the user to label. Each class is represented as a dictionary with the following keys:<ul><li>*name:* Name of the class</li><li>*description:* Further description which explains the user more about the class (e.g. why is it different from another class, etc.)</li><li>*colour:* Colour for this class. Must be a list of 4 integers (RGBA) from 0 to 255.</li><li>*user_colour (optional)*: Colour for this class when user mask is activated in the interface. Useful for background classes which are normally transparent.</li></ul> | <sub><sup>"classes": [<br>&nbsp;{<br>&nbsp;&nbsp;"name": "Clear",<br>&nbsp;&nbsp;"description": "All clear pixels.",<br>&nbsp;&nbsp;"colour": [255,255,255,0],<br>&nbsp;&nbsp;"user_colour": [0,255,255,70]<br>},<br>{<br>&nbsp;&nbsp;"name": "Cloud",<br>&nbsp;&nbsp;"description": "All cloudy pixels.",<br>&nbsp;&nbsp;"colour": [255,255,0,70]<br>}<br>]<br></sub></sup>
**image_shape** | The dimensions of the images you want to label (WxH). | <sub><sup>`"image_shape": [1280, 1280]`</sub></sup>
**mask_area** | In case you don't want to allow the user to label the complete image, you can limit the segmentation area. | <sub><sup>`"mask_area": [128, 128, 1152, 1152]`</sub></sup>
**views** | Since this app was developed for multispectral satellite data (i.e. images with more than just three channels), you can decide how to present the images to the user. This option must be a list of dictionaries where each dictionary represents a view and has the following keys:<ul><li>*name*: Name of the view</li><li>*description:* Further description which explains what the user can see in this view.</li><li>*channels*: List of three strings which can be mathematical expressions with the image bands.</li></ul>|<sub><sup>"views": [<br>{<br>&nbsp;&nbsp;"name": "RGB",<br>&nbsp;&nbsp;"description": "Normal RGB image.",<br>&nbsp;&nbsp;"channels": ["B5", "B3", "B2"]<br>},<br>{<br>&nbsp;&nbsp;"name": "NDVI",<br>&nbsp;&nbsp;"description": "Normalized Difference Vegetation Index (NDVI).",<br>&nbsp;&nbsp;"channels": ["B4", "(B8 - B4) / (B8 + B0)", "B2"]<br>}<br>]</sub></sup>

### Project structure


Coming soon.
