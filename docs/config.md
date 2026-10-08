# Project file configurations

To use IRIS, you need to define a project file in JSON format, named by `project` in the `iris.json` next to the page (see the [README](../README.md#how-a-site-is-put-together)). A full-working example can be found [here](../public/demo/cloud-segmentation.json). The following will outline each of the fields one can use to change the behaviour of IRIS. If fields are not explicitly given in a project's configuration file, then they will take the values found in the [default configuration file](../src/project/defaultConfig.json).

Paths in the project file are relative to the project file. They can also be Hugging Face paths, `hf://datasets/<owner>/<name>/<path>` or `hf://buckets/<owner>/<name>/<path>`, or full addresses (`https://...`).

Admins can also edit the project in the preferences of IRIS.

- [Project file configurations](#project-file-configurations)
  * [name](#name)
  * [images](#images)
  * [classes](#classes)
  * [views](#views)
  * [view_groups](#view_groups)
  * [segmentation](#segmentation)

## name
Optional name for this project. Defaults to the name of the project file. Masks kept in the browser are kept per project name.

<i>Example:</i>
```
"name": "cloud-segmentation"
```

## images
A dictionary which defines the inputs. 

<i>Example:</i>
```
"images": {
      "path": "images/{id}/image.tif",
      "thumbnails": "images/{id}/thumbnail.png",
      "metadata": "images/{id}/metadata.json"
  }
```

### images : ids and images : list
The unique ids of the images, which replace the placeholder `{id}` in the paths. Either list them in `ids`:
```
"ids": ["coast", "mountains"]
```

or in a JSON file next to the project file, named by `list` (by default `images.json`), holding a list of ids:
```
"list": "images.json"
```
```
["coast", "mountains"]
```

IRIS shows the images in the order of this list.

### images : path
This hold the input path to the images. Can be either a string containing a path with the placeholder `{id}` or a dictionary of paths with the placeholder `{id}` (see examples below). The placeholder will be replaced by the unique id of the current image. IRIS only reads Cloud Optimized GeoTIFFs (COG): the files must be tiled and have a CRS, so that each image can be shown at its place on the map. Other formats (*npy*, *png*, *vrt* or GeoTIFFs stored in strips) are rejected. You can create a COG with GDAL, e.g. `gdal_translate -of COG input.tif image.tif`. The browser reads the files with HTTP range requests, so they must be served by a host that answers them (GitHub Pages, the Hugging Face Hub and S3 do).

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

### images : thumbnails
Optional thumbnail files for the images. Path must contain a placeholder `{id}`. If you cannot provide any thumbnail, just leave it out or set it to `false`.

<i>Example:</i>
```
"thumbnails": "thumbnails/{id}.png"
```

### images : metadata
Optional metadata for the images. Path must contain a placeholder `{id}`. JSON files will be parsed and made accessible via the GUI; other text files are shown as they are. If you cannot provide any metadata, just leave it out or set it to `false`.

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
        "colour": [0, 150, 255, 70]
    },
    {
        "name": "Cloud",
        "description": "All cloudy pixels.",
        "colour": [255, 255, 0, 70]
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
        *type:* Must be `image`. Every view shows the image at its place on the map.
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
    <li>
        *vmin/vmax* If you know the precise values you would like to clip the pixel values to, (rather than a percentile), then you can specify these with vmin and/or vmax. This cannot be used for the same view as `clip`.
    </li>
</ul>

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
  }
}
```

## view_groups
Views are displayed in groups. In the GUI of IRIS, you will be able to switch between different groups quickly.
The group `default` must always be set, further groups are optional.

```
"view_groups": {
      "default": ["Cirrus", "RGB", "Superpixels"],
      "clouds": ["Cirrus"],
      "radar": ["Sentinel1"]
  }
```

## segmentation
A dictionary which defines the parameters for the segmentation mode.

### segmentation : mask_area
In case you don't want to allow the user to label the complete image, you can limit the segmentation area to the pixels `[x0, y0, x1, y1]` of the image. Without it, users label the whole image.

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

### segmentation : unverified_threshold
Scores of images annotated by this many users or fewer are marked as unverified in the review, since there are not enough masks to compare. Default is `1`.

<i>Example:</i>
```
"unverified_threshold": 1
```

### segmentation : ai_model
The settings of the AI, a gradient boosted decision tree trained in the browser on the pixels the user drew. Set it to `false` to turn the AI off. Users can change these settings for themselves in the preferences.

| Field | Meaning | Default |
| --- | --- | --- |
| `bands` | Bands the AI learns from, e.g. `["$Sentinel2.B2", "$Sentinel2.B3"]`; `null` for all bands | `null` |
| `train_ratio` | Share of the drawn pixels used for training; the rest score the AI | `0.8` |
| `max_train_pixels` | Most drawn pixels used for training | `20000` |
| `n_estimators` | Number of trees | `20` |
| `max_depth` | Depth of each tree | `10` |
| `n_leaves` | Leaves of each tree | `10` |
| `use_edge_filter` | Also learn from the edges of the bands | `false` |
| `use_superpixels` | Also learn from the superpixel each pixel belongs to | `false` |
| `use_meshgrid` | Also learn from the position of each pixel in a grid | `false` |
| `meshgrid_cells` | The grid, `<columns>x<rows>` or `pixelwise` | `"3x3"` |
| `suppression_threshold` | Give pixels the default class where fewer than this percentage of their neighbours have another class; `0` turns it off | `0` |
| `suppression_filter_size` | Size of the neighbourhood, in pixels | `5` |
| `suppression_default_class` | The class given to those pixels | `0` |

<i>Example:</i>
```
"ai_model": {
    "n_estimators": 20,
    "max_depth": 10,
    "n_leaves": 10,
    "use_edge_filter": true
}
```
