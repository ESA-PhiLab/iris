# Project file configurations

To use iris, you need to define a project file in JSON or YAML format. A full-working example can be found [here](../demo/cloud-segmentation.json).

- [Project file configurations](#project-file-configurations)
  * [name](#name)
  * [authentication_required](#authentication-required)
  * [images](#images)
  * [classes](#classes)
  * [views](#views)
  * [segmentation](#segmentation)

## name
Optional name for this project.

<i>Example:</i>
```
"name": "cloud-segmentation"
```

## authentication_required
Defines whether you want to use IRIS with or without user authentication (latter is not yet implemented).

<i>Example:</i>
```
"authentication_required": true
```

## images
A dictionary which defines the inputs.

<i>Example:</i>
```
"images": {
      "path": "images/{id}/image.tif",
      "shape": [512, 512],
      "thumbnails": "images/{id}/thumbnail.png",
      "metadata": "images/{id}/metadata.json"
  }
```

### images : path
This hold the input path to the images. Can be either a string containing an existing path with the placeholder `{id}` or a dictionary of paths with the placeholder `{id}` (see examples below). The placeholder will be replaced by the unique id of the current image. IRIS can load standard image formats (like *png* or *tif*),  theoretically all kind of files that can be opened by GDAL/rasterio (such as *geotiff* or *vrt*) and numpy files (*npy*). The arrays inside the numpy files should have the shape HxWxC.

<i>Example:</i>
When you have one folder `images` containing your images in *tif* format:
```
"path": "images/{id}.tif"
```

When you have one folder `images` containing subfolders with your images in *tif* format:
```
"path": "images/{id}/image.tif"
```

When you have your data distributed over multiple files (e.g. coming from Sentinel-1 and Sentinel-2), you can use a dictionary for each file type. The keys of the dictionary are file identifiers which are important for the [views](#views) configuration.
```
"path": {
    "Sentinel1": "images/{id}/S1.tif",
    "Sentinel2": "images/{id}/S2.tif"
}
```

### images : shape
The shape of the images. Must be a list of width and height.
```
"shape": [512, 512]
```

### images : thumbnails
Optional thumbnail files for the images. Path must contain a placeholder `{id}`. If you cannot provide any thumbnail, just leave it out or set it to `false`.

<i>Example:</i>
```
"thumbnails": "thumbnails/{id}.png"
```

### images : metadata
Optional metadata for the images. Path must contain a placeholder `{id}`. Metadata files can be in json, yaml or another text file format. json and yaml files will be parsed and made accessible via the GUI. If the metadata contains the key `location` with a list of two floats (longitude and latitude), it can be used for a bingmap view. If you cannot provide any metadata, just leave it out or set it to `false`.

<i>Example:</i>
```
"metadata": "metadata/{id}.json"
```

<i>Example for metadata file:</i>
```
{
    "spacecraft_id": "Sentinel2",
    "scene_id": "coast",
    "location": [-26.3981, 113.3077],
    "resolution": 20.0
}
```

## classes
This is a list of classes that you want to allow the user to label. Each class is represented as a dictionary with the following keys:
<ul>
    <li>*name:* Name of the class</li>
    <li>
        *description:* Further description which explains the user more about the class (e.g. why is it different from another class, etc.)
    </li>
    <li>
        *colour:* Colour for this class. Must be a list of 4 integers (RGBA) from 0 to 255.
    </li>
    <li>
        *user_colour (optional):* Colour for this class when user mask is activated in the interface. Useful for background classes which are normally transparent.
    </li>
</ul>

<i>Example:</i>
```
"classes": [
    {
        "name": "Clear",
        "description": "All clear pixels.",
        "colour": [255,255,255,0],
        "user_colour": [0,255,255,70]
    },
    {
        "name": "Cloud",
        "description": "All cloudy pixels.",
        "colour": [255,255,0,70]
    }
]
```

## views
Since this app was developed for multi-spectral satellite data (i.e. images with more than just three channels), you can decide how to present the images to the user. This option must be a dictionary where each key is the name of the view and the value another dictionary containing properties for the view:
<ul>
    <li>
        *description:* Further description which explains what the user can see in this view.
    </li>
    <li>
        *type:* Can be either `bingmap` or `image`.
    </li>
    <li>
        *data:* Can be either one string (monochrome image) or a list of three strings (rgb image). Each string must contain an expression that returns a valid band array. It can contain mathematical expressions, band combinations or calls of specific functions like `edges` or `superpixels`. One refers to the bands by using variable names starting with `$B`, e.g. `$B1` for the first band of the image file. If you set `image:path` to a dictionary, you need the file identifiers as prefix, i.e. `$FileIdentifier.B1` (e.g. `$Sentinel2.B1`).
    </li>
    <li>
        *cmap:* If `data` contains only one string (monochrome image), you can set a matplotlib colormap name here to render that image.
    </li>
    <li>
        *clip:* By default, bands are stretched between 0 and 1, relative to their minimum and maximum values. By setting a value for clip, you control the percentile of pixels that are saturated at 0 and 1, which can be helpful if there are some extreme pixel values that reduce the contrast in other parts of the image.
    </li>
</ul>

Iris can display up to 4 views until v0.1. From v0.2 it can display an arbitrary number of views.

<i>Example:</i>
```
"views": {
  "Cirrus": {
      "description": "Cirrus and high clouds are red.",
      "type": "image",
      "data": "$Sentinel2.B11**0.8*5",
      "cmap": "jet"
  },
  "Cirrus-Edges": {
      "description": "Edges in the cirrus band",
      "type": "image",
      "data": "edges($Sentinel2.B11**0.8*5)*1.5",
      "cmap": "gray"
  },
  "RGB": {
      "description": "Normal RGB image.",
      "type": "image",
      "data": ["$Sentinel2.B5", "$Sentinel2.B3", "$Sentinel2.B2"]
  },
  "Sentinel-1": {
      "description": "RGB of VH, VV and VH-VV.",
      "type": "image",
      "data": ["$Sentinel1.B1", "$Sentinel1.B2", "$Sentinel1.B1-$Sentinel1.B2"]
  },
  "Superpixels": {
      "description": "Superpixels in the panchromatic bands",
      "type": "image",
      "data": "superpixels($Sentinel2.B2+$Sentinel2.B3+$Sentinel2.B4, sigma=4, min_size=100)",
      "cmap": "jet"
  },
  "Bing": {
      "description": "Aerial Imagery",
      "type": "bingmap"
  }
}
```

## view_groups
Views are displayed in groups. In the GUI of iris, you will be able to switch between different groups quickly.
The group `default` must always be set, further groups are optional.

```
"view_groups": {
      "default": ["Cirrus", "RGB", "Bing"],
      "clouds": ["Cirrus"],
      "radar": ["Sentinel1"]
  }
```

## segmentation
A dictionary which defines the parameters for the segmentation mode.

### segmentation : path
This directory will contain the mask files from the segmentation. Four different mask formats are allowed: *npy*, *tif*, *png* or *jpeg*.

<i>Example:</i>
This will create a folder next to the project file called `masks` containing the mask files in *png* format.
```
"path": "masks/{id}.png"
```

### segmentation : mask_encoding
The encodings of the final masks. Can be `integer`, `binary`, `rgb` or `rgba`.
Note: not all mask formats support all encodings.

<i>Example:</i>
```
"mask_encoding": "rgb"
```

### segmentation : mask_area
In case you don't want to allow the user to label the complete image, you can limit the segmentation area.

<i>Example:</i>
```
"mask_area": [100, 100, 400, 400]
```

### segmentation : score
Defines how to measure the score achieved by the user for each mask. Can be
`f1`, `jaccard` or `accuracy`. Default is `f1`

<i>Example:</i>
```
"score": "f1"
```
