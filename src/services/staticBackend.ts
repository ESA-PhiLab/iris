/**
 * IRIS without a server
 *
 * The project and its images are files next to the page (or anywhere the
 * project file points to). The masks and the settings stay in this browser.
 */

import { imagePath, loadImageIds, normalizeProject, projectUrl } from '../project/project';
import type { AIModelConfig, ProjectConfig, UserConfig, UserInfo } from '../types/iris';
import type { Backend, Preferences, Profile } from './backend';
import { localLabels } from './localLabels';
import { zipSync } from 'fflate';
import { rasterEngine } from '../raster/engine';
import { maskCog } from '../export/maskFiles';

const LOCAL_USER = 'local';

const settingsKey = (project: string) => `iris-settings|${project}`;

const readSettings = (project: string): Partial<AIModelConfig> => {
  try {
    return JSON.parse(localStorage.getItem(settingsKey(project)) || '{}');
  } catch {
    return {};
  }
};

export const staticBackend = ({ project: projectPath }: { project: string }): Backend => {
  const projectFile = new URL(projectPath, window.location.href).href;
  let project: Record<string, any> | null = null;

  const loaded = () => {
    if (!project) throw new Error('The project is not loaded yet');
    return project;
  };
  const labels = () => localLabels(loaded().name, LOCAL_USER);
  const fileOf = (template: string | false | undefined, imageId: string) =>
    template ? projectUrl(imagePath(template, imageId), projectFile) : null;

  const savedMasks = async () =>
    (await labels().all()).filter((label) => label.mask)
      .sort((a, b) => b.modified.localeCompare(a.modified));

  return {
    kind: 'static',

    async currentUser(): Promise<UserInfo> {
      const masks = project ? await savedMasks() : [];
      return {
        id: 0,
        name: LOCAL_USER,
        admin: false,
        tested: false,
        created: '',
        image_seed: 0,
        segmentation: { score: 0, score_unverified: 0, n_masks: masks.length },
      };
    },

    async loadProject() {
      const response = await fetch(projectFile, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Could not read the project ${projectPath} (${response.status})`);
      project = normalizeProject(await response.json(), projectFile);
      return project as ProjectConfig;
    },

    async listImages() {
      const ids = await loadImageIds(loaded(), projectFile);
      const annotated = new Set((await savedMasks()).map((label) => label.imageId));
      return ids.map((imageId) => ({
        image_id: imageId,
        has_user_annotation: annotated.has(imageId),
        has_any_annotation: annotated.has(imageId),
        annotation_count: annotated.has(imageId) ? 1 : 0,
      }));
    },

    async startImageId(images) {
      // The image worked on last, else the first one
      const last = (await savedMasks())[0]?.imageId;
      return images.find((image) => image.image_id === last)?.image_id ?? images[0]?.image_id ?? null;
    },

    pageUrl: (imageId) => `${window.location.pathname}?image_id=${encodeURIComponent(imageId)}`,

    imageFiles(config, imageId) {
      const paths = (config.images as any).path as Record<string, string>;
      return Object.fromEntries(Object.entries(paths).map(([fileId, template]) => [
        fileId, { url: projectUrl(imagePath(template, imageId), projectFile) },
      ]));
    },

    thumbnailUrl: (imageId) => fileOf(loaded().images?.thumbnails, imageId),

    async loadMetadata(imageId) {
      const url = fileOf(loaded().images?.metadata, imageId);
      if (!url) return null;
      const response = await fetch(url);
      if (!response.ok) return null;
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { __body__: text };
      }
    },

    async loadMask(imageId, length) {
      const label = await labels().get(imageId);
      if (!label?.mask || !label.userMask || label.mask.length !== length) return null;
      return { mask: new Uint8Array(label.mask), userMask: new Uint8Array(label.userMask) };
    },

    async saveMask(imageId, { mask, userMask }) {
      await labels().put(imageId, { mask: new Uint8Array(mask), userMask: new Uint8Array(userMask) });
    },

    saveMaskOnUnload(imageId, mask) {
      // IndexedDB usually finishes writing while the page closes
      this.saveMask(imageId, mask).catch(() => {});
    },

    async loadNotes(imageId) {
      const label = await labels().get(imageId);
      return label?.mask ? label.notes : null;
    },

    async saveNotes(imageId, notes) {
      await labels().put(imageId, { notes });
    },

    async loadPreferences(allBands): Promise<Preferences> {
      const config = loaded();
      const aiModel = { ...config.segmentation.ai_model, ...readSettings(config.name) };
      if (!aiModel.bands?.length) aiModel.bands = allBands;
      return {
        config: { segmentation: { ai_model: aiModel }, classes: config.classes } as UserConfig,
        allBands,
        isAdmin: false,
      };
    },

    async savePreferences(config) {
      try {
        localStorage.setItem(settingsKey(loaded().name), JSON.stringify(config.segmentation.ai_model));
      } catch {
        throw new Error('This browser does not let IRIS keep settings');
      }
    },

    async loadProfile(): Promise<Profile> {
      const masks = await savedMasks();
      return {
        id: 0,
        name: LOCAL_USER,
        admin: false,
        tested: false,
        created: '',
        image_seed: 0,
        segmentation: {
          rank: null,
          score: 0,
          score_unverified: 0,
          n_masks: masks.length,
          last_masks: masks.slice(0, 10).map((label) => ({
            image_id: label.imageId,
            score: 0,
            score_unverified: true,
            last_modification: label.modified,
            time_spent: '',
          })),
        },
        is_current_user: true,
        canChangePassword: false,
        canSignOut: false,
      };
    },

    async signOut() {},

    async downloadMasks(onProgress = () => {}) {
      const config = loaded();
      const masks = await savedMasks();
      if (!masks.length) return null;
      const files: Record<string, [Uint8Array, { level: 0 }]> = {};
      for (const [i, label] of masks.entries()) {
        onProgress(i, masks.length);
        const georef = await rasterEngine().open(label.imageId, this.imageFiles(config as ProjectConfig, label.imageId));
        const area = config.segmentation?.mask_area ?? [0, 0, georef.width, georef.height];
        if (label.mask!.length !== (area[2] - area[0]) * (area[3] - area[1])) continue;
        // The layout of the server's project folder: segmentation/<image>/<user>_mask.tif
        files[`segmentation/${label.imageId}/${LOCAL_USER}_mask.tif`] = [
          maskCog(georef, area, { mask: label.mask!, userMask: label.userMask! }),
          { level: 0 },
        ];
      }
      onProgress(masks.length, masks.length);
      return { bytes: zipSync(files), name: `${config.name}_masks.zip` };
    },
  };
};
