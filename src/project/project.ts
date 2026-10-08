/**
 * A project read straight from its JSON file, without a server
 *
 * The file is the same as for the IRIS server: paths are relative to the
 * file, and what it leaves out comes from the default configuration. The ids
 * of the images are listed in images.ids, or in a JSON file next to the
 * project (images.list, by default images.json).
 */

import defaultConfig from './defaultConfig.json';
import { fetchFile, resolvePath } from '../services/huggingface';

type Json = Record<string, any>;

const isObject = (value: unknown): value is Json =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Values of b over those of a, merging nested objects */
export const mergeDeep = (a: Json, b: Json): Json => {
  const merged: Json = { ...a };
  for (const [key, value] of Object.entries(b)) {
    merged[key] = isObject(value) && isObject(a[key]) ? mergeDeep(a[key], value) : value;
  }
  return merged;
};

export const imagePath = (template: string, imageId: string) => template.split('{id}').join(imageId);

/** The project as the browser uses it */
export const normalizeProject = (raw: Json, projectFile: string): Json => {
  const config = mergeDeep(defaultConfig, raw);
  if (!config.name) {
    config.name = projectFile.split('/').pop()!.replace(/\.(json|ya?ml)$/i, '');
  }
  if (typeof config.images?.path === 'string') {
    config.images.path = { pictures: config.images.path };
  }
  if (!isObject(config.images?.path) || !Object.keys(config.images.path).length) {
    throw new Error('The project needs images.path, the COG of each image with {id} in its name');
  }
  for (const [name, view] of Object.entries<Json>(config.views || {})) {
    view.name = name;
    if (view.type && view.type !== 'image') {
      throw new Error(`View '${name}' has type '${view.type}': only 'image' views exist`);
    }
  }
  if (!config.view_groups?.default) {
    config.view_groups = { ...config.view_groups, default: Object.keys(config.views || {}).slice(0, 3) };
  }
  return config;
};

/** Ids of the images of a project */
export const loadImageIds = async (config: Json, projectFile: string, token?: string | null): Promise<string[]> => {
  if (Array.isArray(config.images?.ids)) return config.images.ids.map(String);
  const list = config.images?.list || 'images.json';
  const response = await fetchFile(resolvePath(list, projectFile), token);
  if (!response.ok) {
    throw new Error(`The project lists no images: give images.ids, or a list of ids in ${list}`);
  }
  const ids = await response.json();
  return (Array.isArray(ids) ? ids : ids.ids || []).map(String);
};
