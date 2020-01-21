# IRIS - Intelligence foR Image Segmentation<sup>1</sup>
<sup>1</sup>Yes, it is a <a href="https://en.wikipedia.org/wiki/Backronym">backronym</a>.
**Work in progress.**

<img src="preview/1.png" />

Tool for manual image segmentation and classification of satellite imagery (or images in general).
This application is a flask app which can be run locally. 

<hr />

## Installation
Since IRIS is written in python, you will need a python 3.7 where you can install this app.
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

2) **conclude:** (NOT YET IMPLEMENTED) After labelling is done (by using the *label* mode), you can use this mode bundle the output masks and get some statistics.

## Documentation

### Project file
Before you can use IRIS, you have to provide a configurations file for your project. See [examples](examples/example-config.yaml)

Coming soon.
