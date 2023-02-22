# IRIS - Intelligently Reinforced Image Segmentation<sup>1</sup>
<sup>1</sup>Yes, it is a <a href="https://en.wikipedia.org/wiki/Backronym">backronym</a>.

<img src="preview/segmentation.png" />

Tool for manual image segmentation of satellite imagery (or images in general). It was designed to accelerate the creation of machine learning training datasets for Earth Observation. This application is a flask app which can be run locally. Special highlights:
* Support by AI (gradient boosted decision tree) when doing image segmentation
* Multiple and configurable views for multispectral imagery
* Simple setup with pip and one configuration file
* Platform independent app (runs on Linux, Windows and Mac OS)
* Multi-user support: work in a team on your dataset and merge the results

## Installation

Clone the repository, navigate to the directory, and install the package and its dependencies. We recommend doing this inside an environment such as conda, with python 3.8 or 3.9.

```
git clone git@github.com:ESA-PhiLab/iris.git
cd iris
python setup.py install
```

If you are altering the IRIS source code then you made find it easier to install like below, to avoid having to reinstall it every time a change is made
```
pip install -e ./
```


## Usage

Once installed, you can run the demo version of IRIS

```
iris demo
```

Having run the demo, you can then create a personalised config file, based on _demo/cloud-segmentation.json_. With your own config file, you can then instantiate your own custom project. <a href="https://github.com/ESA-PhiLab/iris/blob/master/docs/config.md">Here is a guide</a> on how to write your own config file.

```
iris label <your-config-file>
```

### Docker

You can also use Docker to deploy IRIS. First, build an image (run from IRIS's root directory). Then, you can use docker run to launch IRIS. However, please note that port-forwarding is needed (here we use port 80 as an example for a typical http setup, but the port number can be set in your IRIS config file) and the directory to your project also needs to be given as a volume to docker.

```
docker build --tag iris .
docker run -p 80:80 -v <dataset_path>:/dataset/ --rm -it iris label /dataset/cloud-segmentation.json
```


**Visit the official iris Github page:  https://github.com/ESA-PhiLab/iris**
