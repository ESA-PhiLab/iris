<h1>Project file configurations</h1>

To use iris, you need to define a project file in JSON or YAML format.

<h3>name</h3>
Optional name for this project.

<i>Example:</i>
```
"name": "cloud-segmentation"
```

<h3>authentication_required</h3>
Defines whether you want to use IRIS with or without user authentication (latter is not yet implemented).

<i>Example:</i>
```
"authentication_required": true
```

<h3>images</h3>
A dictionary which defines the inputs.

<h4>images : path</h4>
The input path to the images. Must be an existing path with the placeholder `{id}`. The placeholder will be replaced by the unique id of the current image. IRIS can load standard image formats (like *png* or *tif*) and numpy files (*npy*). The arrays inside the numpy arrays should have the shape HxWxC.

<i>Example:</i>
```
"path": "images/{id}.tif"
```

<h4>images : shape</h4>
The shape of the images. Must be a list of width and height.
```
"shape": [512, 512]
```

<h4>images : thumbnails</h4>
Optional thumbnail files for the images. Path must contain a placeholder `{id}`.

<i>Example:</i>
```
"thumbnails": "thumbnails/{id}.png"
```

<h4>images : metadata</h4>
Optional metadata for the images. Path must contain a placeholder `{id}`. Metadata files can be in json, yaml or another text file format. json and yaml files will be parsed and made accessible via the GUI. If the metadata contains the key `location` with a list of two floats (longitude and latitude), it can be used for a bingmap view.

<i>Example:</i>
```
"metadata": "metadata/{id}.json"
```

<h3>classes</h3>
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
        *user_colour (optional)*: Colour for this class when user mask is activated in the interface. Useful for background classes which are normally transparent.
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

<h3>views</h3>
Since this app was developed for multi-spectral satellite data (i.e. images with more than just three channels), you can decide how to present the images to the user. This option must be a list of dictionaries where each dictionary represents a view and has the following keys:
<ul>
    <li>*name*: Name of the view</li>
    <li>
        *description:* Further description which explains what the user can see in this view.
    </li>
    <li>
        *content*: Can be either `bingmap` or a list of three strings which can be mathematical expressions with the image bands.
    </li>
</ul>

Iris can display up to 4 views.

<i>Example:</i>
```
"views": [
    {
        "name": "RGB",
        "description": "Normal RGB image.",
        "content": ["B5", "B3", "B2"]
    },
    {
        "name": "NDVI",
        "description": "Normalized Difference Vegetation Index (NDVI).",
        "content": ["B4", "(B8 - B4) / (B8 + B0)", "B2"]
    },
    {
        "name": "Aerial imagery from bing",
        "content": "bingmap"
    },
]
```

<h3>segmentation</h3>
A dictionary which defines the parameters for the segmentation mode.

<h4>segmentation : path</h4>
The output directory for your project. This directory will contain the mask files (from the segmentation) and user configurations

<i>Example:</i>
```
"path": "masks/{id}.png"
```

<h4>segmentation : mask_encoding</h4>
 The encodings of the final masks. Can be `integer`, `binary`, `rgb` or `rgba`.

<i>Example:</i>
```
"mask_encoding": "rgb"
```

<h4>segmentation : mask_area</h4>
In case you don't want to allow the user to label the complete image, you can limit the segmentation area.

<i>Example:</i>
```
"mask_area": [100, 100, 400, 400]
```
