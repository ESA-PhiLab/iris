# IRIS - Intelligently Reinforced Image Segmentation<sup>1</sup>
<sup>1</sup>Yes, it is a <a href="https://en.wikipedia.org/wiki/Backronym">backronym</a>.

<img src="preview/segmentation.png" />

Tool for manual image segmentation and classification of satellite imagery (or images in general). It was designed to accelerate the creation of machine learning training datasets for Earth Observation. This application is a flask app which can be run locally. Special highlights:
* Support by AI (gradient boosted decision tree) when doing image segmentation
* Multiple and configurable views for multispectral imagery
* Simple setup with pip and one configuration file
* Platform independent app (runs on Linux, Windows and Mac OS)
* Multi-user support: work in a team on your dataset and merge the results

**Visit the official iris Github page:  https://github.com/ESA-PhiLab/iris**


## Use

### setup projects

Make projects:

    python oxeobin/cli.py make-project landsat-8 18_L_10000_24_895,18_L_10000_25_891 test 10 gs://oxeo-water/prod 8000
    
Sync projects:

    python oxeobin/cli.py sync-project /home/lucas/iris/projects/s2-test-sentinel-2 gs://oxeo-water/prod test-s2-gt