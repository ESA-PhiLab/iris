# TODO list for IRIS

### Bugs (please suggest more if found)

- [ ] Time spent is not logged or reported


### Aesthetics/wording/clarity

- [ ] Admin page cleanup
  - [ ] Header (users/images/etc.) make them buttons/drop-down menu, not a table row
  - [ ] Centre all columns in admin page
  - [ ] ?? Reword "pending" and "inactive" tags... new columns ??
  - [ ] ?? Redesign table lines/style ??
  - [ ] Remove "classification"/"detection" tabs and related columns from "images" tab
  - [ ] Reword "Segmentation" as "Masks"
- [ ] Segmentation view (main annotation view) cleanup
  - [ ] Reword "score" to "agreement"
  - [ ] Paintbrush movement creates horizontal/vertical artefacts
  - [ ] Colourise the helper boxes for better visibility
- [ ] Preferences menu
  - [ ] Standardise wording of options


### Improvements/features:

- [ ] Add easily configurable customisation for the questions at the end of each image ("difficulty" etc.) in project json
- [ ] Add configurable default model preferences in project json
- [ ] Add helper tips for each field on Preferences tab after ~1 second mouse hover
- [ ] Add admin tab for data statistics visualisation over the whole dataset. E.g. class pie-chart, RF confusion matrix, etc.
- [ ] Add "iris export <options> PROJECT" command to save final versions of masks, and output some python-friendly (e.g. pandas) tables to look at dataset statistics
  
  
### Big future plans:

- [ ] *Lasso tool*: Isolates area of image for another RF to be used on. Useful when there are two or more distinct areas in the image which the RF cannot handle simultaneously
- [ ] *Class heirarchies*: User annotates lowest subclasses, but they all sit within superclasses. Different RFs are trained for the different parts of the class hierarchy. E.g. a user annotates multiple types of cloud (cumulus/cirrus/etc.) and multiple types of surface (water/land/etc.), then an RF segments "cloud"/"clear", and separate RFs split those into the subcategories.
