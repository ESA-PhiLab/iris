/**
 * Start the segmentation page: choose the backend, load the project and the
 * user, read the image in the browser and load the user's mask of it
 */

import { useSegmentationStore } from '../stores/segmentationStore';
import { ViewConfig, ViewGroup, useViewManagerStore } from '../stores/viewManagerStore';
import { backend, loadSiteConfig, setBackend } from '../services/backend';
import { staticBackend } from '../services/staticBackend';
import { maskAreaBoundsError } from '../project/validate';
import type { ProjectConfig } from '../types/iris';

/** Views of the project, with their band expressions */
export const projectViews = (config: ProjectConfig): { [name: string]: ViewConfig } =>
  Object.fromEntries(Object.entries(config.views).map(([name, view]) => [name, {
    name,
    type: 'image',
    description: view.description || '',
    data: view.data,
    cmap: view.cmap,
    clip: view.clip,
    vmin: view.vmin,
    vmax: view.vmax,
  }]));

/** Groups of views of the project; a group 'default' with the first three views if none */
export const projectViewGroups = (config: ProjectConfig, views: { [name: string]: ViewConfig }): ViewGroup =>
  Object.keys(config.view_groups).length ? config.view_groups : { default: Object.keys(views).slice(0, 3) };

/** Image of the page, named in the address */
export const pageImageId = (): string | null =>
  new URLSearchParams(window.location.search).get('image_id');

/** The project, the accounts and the masks named by iris.json next to the page */
export const chooseBackend = async () => {
  setBackend(staticBackend(await loadSiteConfig()));
  return backend();
};

export const startSegmentation = async () => {
  const editor = useSegmentationStore.getState();
  const viewManager = useViewManagerStore.getState();
  const source = backend();

  const [config, user] = await Promise.all([source.loadProject(), source.currentUser()]);
  editor.setConfig(config);
  if (user) editor.setUser(user);

  const views = projectViews(config);
  viewManager.setStorageScope(source.projectId());
  viewManager.setViews(views);
  viewManager.setViewGroups(projectViewGroups(config, views));

  const images = await source.listImages();
  editor.setImages(images);

  let imageId = pageImageId();
  if (!imageId) {
    imageId = await source.startImageId(images);
    if (imageId) window.history.replaceState({}, '', source.pageUrl(imageId));
  }
  if (!imageId) throw new Error('The project has no images');
  if (!images.some((image) => image.image_id === imageId)) {
    throw new Error(`The project has no image '${imageId}'`);
  }
  editor.setCurrentImage(imageId);
  viewManager.setImage(imageId);

  // Reading the image tells where it lies on the map and how large it is
  await viewManager.openImage(imageId, await source.imageFiles(config, imageId));

  // Without a mask area the mask covers the whole image
  const { georef } = useViewManagerStore.getState();
  const configuredArea = useSegmentationStore.getState().maskArea;
  if (configuredArea && georef) {
    const error = maskAreaBoundsError(configuredArea, georef.width, georef.height);
    if (error) throw new Error(error);
  }
  if (!useSegmentationStore.getState().maskArea && georef) {
    editor.setMaskArea([0, 0, georef.width, georef.height]);
  }
  await editor.loadMaskForImage(imageId);
};
