/**
 * Start the segmentation page: load the project and the user, read the image
 * in the browser and load the user's mask of it
 */

import { useSegmentationStore } from '../stores/segmentationStore';
import { ViewConfig, ViewGroup, useViewManagerStore } from '../stores/viewManagerStore';
import { imageFileSources } from '../services/imageFiles';

const getJson = async (url: string) => {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response.json();
};

/** Views of the project, with their band expressions */
export const projectViews = (config: any): { [name: string]: ViewConfig } => {
  const entries: Array<[string, any]> = Array.isArray(config.views)
    ? config.views.map((view: any) => [view.name, view])
    : Object.entries(config.views || {});
  return Object.fromEntries(entries.map(([name, view]) => [name, {
    name,
    type: 'image',
    description: view.description || '',
    data: view.data,
    cmap: view.cmap,
    clip: view.clip,
    vmin: view.vmin,
    vmax: view.vmax,
  }]));
};

/** Groups of views of the project; a group 'default' with the first three views if none */
export const projectViewGroups = (config: any, views: { [name: string]: ViewConfig }): ViewGroup => {
  const groups = config.view_groups;
  if (groups && !Array.isArray(groups)) return groups;
  if (Array.isArray(groups) && groups.length) {
    return Array.isArray(groups[0])
      ? Object.fromEntries(groups.map((group: string[], i: number) => [`group_${i}`, group]))
      : { default: groups };
  }
  return { default: Object.keys(views).slice(0, 3) };
};

/** Image of the page: the one in the address, else the one the server picked */
export const pageImageId = (): string | null =>
  new URLSearchParams(window.location.search).get('image_id') || (window as any).vars?.image_id || null;

export const startSegmentation = async () => {
  const editor = useSegmentationStore.getState();
  const viewManager = useViewManagerStore.getState();

  const [config, user] = await Promise.all([
    getJson('/segmentation/api/config'),
    getJson('/user/get/current'),
  ]);
  editor.setConfig(config);
  editor.setUser(user);

  const views = projectViews(config);
  viewManager.setViews(views);
  viewManager.setViewGroups(projectViewGroups(config, views));

  const imageId = pageImageId();
  if (!imageId) throw new Error('The project has no images');
  editor.setCurrentImage(imageId);
  viewManager.setImage(imageId);

  const [images] = await Promise.all([
    getJson(`/segmentation/api/images/list?current_image_id=${encodeURIComponent(imageId)}`),
    // Reading the image tells where it lies on the map and how large it is
    viewManager.openImage(imageId, imageFileSources(config, imageId)),
  ]);
  editor.setImages(images.images);

  // Without a mask area the mask covers the whole image
  const { georef } = useViewManagerStore.getState();
  if (!useSegmentationStore.getState().maskArea && georef) {
    editor.setMaskArea([0, 0, georef.width, georef.height]);
  }
  await editor.loadMaskForImage(imageId);
};
