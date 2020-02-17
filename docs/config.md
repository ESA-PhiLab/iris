<h5>name</h5> 
Optional name for this project.
```
"name": "cloud-segmentation"
```

<h5>authentication_required</h5> 
Defines whether you want to use IRIS with or without user authentication (latter is not yet implemented). 
```
"authentication_required": true
```

<h5>images</h5> 
A dictionary which defines the inputs.

**images:path** | The input path to the images. Must be an existing path with the placeholder `{id}`. The placeholder will be replaced by the unique id of the current image. IRIS can load standard image formats (like *png* or *tif*) and numpy files (*npy*). The arrays inside the numpy arrays should have the shape HxWxC. | <sub><sup>`"path": "images/{id}.tif"`</sub></sup>
**images:shape** | The shape of the images. Must be a list of width and height. | <sub><sup>`"shape": [512, 512]`</sub></sup>
**images:thumbnails** | Optional thumbnails for the images. Path must contain a placeholder `{id}`. | <sub><sup>`"thumbnails": "thumbnails/{id}.png"` </sub></sup>
**images:metadata** | Optional metadata for the images. Path must contain a placeholder `{id}`. Metadata files can be in json, yaml or another text file format. json and yaml files will be parsed and made accessible via the GUI. If the metadata contains the key `location` with a list of two floats (longitude and latitude), it can be used for a bingmap view. | <sub><sup>`"metadata": "metadata/{id}.json"` </sub></sup>
**classes** | This is a list of classes that you want to allow the user to label. Each class is represented as a dictionary with the following keys:<ul><li>*name:* Name of the class</li><li>*description:* Further description which explains the user more about the class (e.g. why is it different from another class, etc.)</li><li>*colour:* Colour for this class. Must be a list of 4 integers (RGBA) from 0 to 255.</li><li>*user_colour (optional)*: Colour for this class when user mask is activated in the interface. Useful for background classes which are normally transparent.</li></ul> | <sub><sup>"classes": [<br>&nbsp;{<br>&nbsp;&nbsp;"name": "Clear",<br>&nbsp;&nbsp;"description": "All clear pixels.",<br>&nbsp;&nbsp;"colour": [255,255,255,0],<br>&nbsp;&nbsp;"user_colour": [0,255,255,70]<br>},<br>{<br>&nbsp;&nbsp;"name": "Cloud",<br>&nbsp;&nbsp;"description": "All cloudy pixels.",<br>&nbsp;&nbsp;"colour": [255,255,0,70]<br>}<br>]<br></sub></sup>
**views** | Since this app was developed for multi-spectral satellite data (i.e. images with more than just three channels), you can decide how to present the images to the user. This option must be a list of dictionaries where each dictionary represents a view and has the following keys:<ul><li>*name*: Name of the view</li><li>*description:* Further description which explains what the user can see in this view.</li><li>*content*: Can be either `bingmap` or a list of three strings which can be mathematical expressions with the image bands.</li></ul>|<sub><sup>"views": [<br>{<br>&nbsp;&nbsp;"name": "RGB",<br>&nbsp;&nbsp;"description": "Normal RGB image.",<br>&nbsp;&nbsp;"content": ["B5", "B3", "B2"]<br>},<br>{<br>&nbsp;&nbsp;"name": "NDVI",<br>&nbsp;&nbsp;"description": "Normalized Difference Vegetation Index (NDVI).",<br>&nbsp;&nbsp;"channels": ["B4", "(B8 - B4) / (B8 + B0)", "B2"]<br>}<br>]</sub></sup>
**segmentation:path** | The output directory for your project. This directory will contain the mask files (from the segmentation) and user configurations | <sub><sup>`"path": "masks/{id}.png"`
**segmentation:mask_encoding** | The encodings of the final masks. Can be `integer`, `binary`, `rgb` or `rgba`. | <sub><sup>`"mask_encoding": "rgb"`</sub></sup>
**segmentation:mask_area** | In case you don't want to allow the user to label the complete image, you can limit the segmentation area. | <sub><sup>`"mask_area": [128, 128, 1152, 1152]`</sub></sup>
