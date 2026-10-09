/**
 * IRIS without a server
 *
 * iris.json, next to the page, says where everything is:
 *   project      the project file, a path next to the page or hf://...
 *   labels       where the masks go: hf://buckets/<owner>/<name> or
 *                hf://datasets/<owner>/<name>; this browser when left out
 *   credentials  the accounts (scripts/credentials.mjs); anyone can use the
 *                page as the local user when left out
 *   guests       whether people without an account can enter (default true);
 *                their masks stay in their browser
 * The paths of the project are relative to the project file.
 */

import { zipSync } from 'fflate';
import { imagePath, loadImageIds, normalizeProject } from '../project/project';
import type { AIModelConfig, ProjectConfig, UserInfo } from '../types/iris';
import type { Backend, Preferences, Profile, UserMask } from './backend';
import { CredentialsFile, Session, clearSession, saveSession, savedSession, unlock } from './credentials';
import { fetchFile, hub, hubRepo, huggingFaceUser, isHfPath, parseHfPath, readableUrl, resolvePath } from './huggingface';
import { downloadFile } from '../utils/download';
import { LabelStorage, browserStorage, hubStorage } from './labelStorage';
import { rasterEngine } from '../raster/engine';
import { maskCog } from '../export/maskFiles';
import { maskAreaBoundsError } from '../project/validate';

export interface SiteConfig {
  project: string;
  labels?: string;
  credentials?: string;
  /** Let each user sign in with their own Hugging Face token */
  login?: 'huggingface';
  guests?: boolean;
}

const LOCAL_USER = 'local';
const GUEST = 'guest';

const settingsKey = (project: string) => `iris-settings|${project}`;

const readSettings = (project: string, legacyProject?: string): Partial<AIModelConfig> => {
  try {
    const current = localStorage.getItem(settingsKey(project));
    const legacy = legacyProject ? localStorage.getItem(settingsKey(legacyProject)) : null;
    return JSON.parse(current || legacy || '{}');
  } catch {
    return {};
  }
};

export const staticBackend = (site: SiteConfig): Backend => {
  const siteKey = new URL('iris.json', window.location.href).href;
  // Paths of the site are relative to the page, those of the project to the project file
  const projectFile = resolvePath(site.project, window.location.href);
  let project: ProjectConfig | null = null;
  let storage: LabelStorage | null = null;
  const hasLogin = !!site.credentials || site.login === 'huggingface';

  const session = (): Session | null =>
    (hasLogin ? savedSession(siteKey) : { user: LOCAL_USER, role: 'admin' });
  const token = () => session()?.hfToken ?? null;
  const userName = () => session()?.user ?? GUEST;
  const requireAdmin = () => {
    const current = session();
    if (!current || current.role !== 'admin' || current.guest) {
      throw new Error('Only an administrator can edit the project');
    }
  };

  const loaded = () => {
    if (!project) throw new Error('The project is not loaded yet');
    return project;
  };
  const fileOf = (template: string | false | undefined, imageId: string) =>
    (template ? resolvePath(imagePath(template, imageId), projectFile) : null);

  const labels = (): LabelStorage => {
    if (!storage) {
      const current = session();
      storage = site.labels && current && !current.guest
        ? hubStorage(resolvePath(site.labels, window.location.href), current.hfToken ?? null)
        : browserStorage(projectFile, loaded().name);
    }
    return storage;
  };

  const myMasks = async () =>
    (await labels().list()).filter((entry) => entry.user === userName())
      .sort((a, b) => b.modified.localeCompare(a.modified));

  /** Size and place of the mask area of an image, read from its COG */
  const maskGeoreference = async (imageId: string) => {
    const config = loaded();
    const georef = await rasterEngine().open(imageId, await backend.imageFiles(config, imageId));
    const area: [number, number, number, number] = config.segmentation?.mask_area
      ?? [0, 0, georef.width, georef.height];
    const error = maskAreaBoundsError(area, georef.width, georef.height);
    if (error) throw new Error(error);
    return { georef, area };
  };

  const backend: Backend = {
    projectId: () => projectFile,

    async currentUser(): Promise<UserInfo | null> {
      const current = session();
      if (!current) return null;
      return {
        id: 0,
        name: current.user,
        admin: current.role === 'admin' && !current.guest,
        tested: false,
        created: '',
        image_seed: 0,
        segmentation: { score: 0, score_unverified: 0, n_masks: project ? (await myMasks()).length : 0 },
      };
    },

    signInOptions: () => ({
      guest: site.guests !== false,
      method: site.login === 'huggingface' ? 'huggingface' : 'credentials',
    }),

    async signIn(user, secret) {
      if (site.login === 'huggingface') {
        const account = await huggingFaceUser(secret.trim());
        saveSession(siteKey, { user: account, role: 'annotator', hfToken: secret.trim() });
        return;
      }
      if (!site.credentials) throw new Error('This site has no accounts');
      const response = await fetch(new URL(site.credentials, window.location.href).href, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Could not read the accounts (${response.status})`);
      const file: CredentialsFile = await response.json();
      saveSession(siteKey, await unlock(file, user.trim(), secret));
    },

    async enterAsGuest() {
      if (site.guests === false) throw new Error('This site has no guest access');
      saveSession(siteKey, { user: GUEST, role: 'annotator', guest: true });
    },

    async loadProject() {
      const response = await fetchFile(projectFile, token(), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(response.status === 401 || response.status === 403
          ? `No access to the project ${site.project}: sign in with an account that can read it`
          : `Could not read the project ${site.project} (${response.status})`);
      }
      project = normalizeProject(await response.json(), projectFile);
      return project;
    },

    async listImages() {
      const config = loaded();
      const ids = await loadImageIds(config, projectFile, token());
      const entries = await labels().list();
      const mine = new Set(entries.filter((entry) => entry.user === userName()).map((entry) => entry.imageId));
      const counts = new Map<string, number>();
      for (const entry of entries) counts.set(entry.imageId, (counts.get(entry.imageId) ?? 0) + 1);
      return ids.map((imageId: string) => ({
        image_id: imageId,
        has_user_annotation: mine.has(imageId),
        has_any_annotation: (counts.get(imageId) ?? 0) > 0,
        annotation_count: counts.get(imageId) ?? 0,
      }));
    },

    async startImageId(images) {
      // The image worked on last, else the first one
      const last = (await myMasks())[0]?.imageId;
      return images.find((image) => image.image_id === last)?.image_id ?? images[0]?.image_id ?? null;
    },

    pageUrl: (imageId) => `${window.location.pathname}?image_id=${encodeURIComponent(imageId)}`,

    async imageFiles(config, imageId) {
      const paths = config.images.path;
      const sources = await Promise.all(Object.entries(paths).map(async ([fileId, template]) => {
        const location = resolvePath(imagePath(template, imageId), projectFile);
        // The worker reads the files by their own address, without the token
        return [fileId, { url: new URL(await readableUrl(location, token()), window.location.href).href }] as const;
      }));
      return Object.fromEntries(sources);
    },

    async thumbnailUrl(imageId) {
      const location = fileOf(loaded().images?.thumbnails, imageId);
      return location ? readableUrl(location, token()).catch(() => null) : null;
    },

    async loadMetadata(imageId) {
      const location = fileOf(loaded().images?.metadata, imageId);
      if (!location) return null;
      const response = await fetchFile(location, token());
      if (!response.ok) return null;
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { __body__: text };
      }
    },

    loadMask: (imageId, length) => labels().loadMask(userName(), imageId, length),

    async saveMask(imageId, mask: UserMask) {
      await labels().saveMask(userName(), imageId, mask, async () => {
        const { georef, area } = await maskGeoreference(imageId);
        return maskCog(georef, area, mask);
      });
    },

    loadNotes: (imageId) => labels().loadNotes(userName(), imageId),
    saveNotes: (imageId, notes) => labels().saveNotes(userName(), imageId, notes),

    async loadPreferences(allBands): Promise<Preferences> {
      const config = loaded();
      const projectModel = config.segmentation.ai_model === false ? {} : config.segmentation.ai_model;
      const aiModel = { ...projectModel, ...readSettings(projectFile, config.name) } as AIModelConfig;
      if (!aiModel.bands?.length) aiModel.bands = allBands;
      const current = session();
      return {
        config: { segmentation: { ai_model: aiModel }, classes: config.classes },
        allBands,
        // Admins can edit the project
        isAdmin: current?.role === 'admin' && !current.guest,
      };
    },

    async savePreferences(config) {
      try {
        localStorage.setItem(settingsKey(projectFile), JSON.stringify(config.segmentation.ai_model));
      } catch {
        throw new Error('This browser does not let IRIS keep settings');
      }
    },

    async loadProfile(): Promise<Profile> {
      const masks = await myMasks();
      const current = session();
      return {
        id: 0,
        name: userName(),
        admin: current?.role === 'admin' && !current.guest,
        tested: false,
        created: '',
        image_seed: 0,
        segmentation: {
          rank: null,
          score: 0,
          score_unverified: 0,
          n_masks: masks.length,
          last_masks: masks.slice(0, 10).map((entry) => ({
            image_id: entry.imageId,
            score: 0,
            score_unverified: true,
            last_modification: entry.modified,
            time_spent: '',
          })),
        },
        is_current_user: true,
        canSignOut: hasLogin,
      };
    },

    async signOut() {
      await labels().flush().catch(() => {});
      clearSession(siteKey);
    },

    async downloadMasks(onProgress = () => {}) {
      const config = loaded();
      const masks = await myMasks();
      if (!masks.length) return null;
      const files: Record<string, [Uint8Array, { level: 0 }]> = {};
      for (const [i, entry] of masks.entries()) {
        onProgress(i, masks.length);
        const { georef, area } = await maskGeoreference(entry.imageId);
        const mask = await labels().loadMask(entry.user, entry.imageId, (area[2] - area[0]) * (area[3] - area[1]));
        if (!mask) continue;
        // The layout of the masks on the Hub: segmentation/<image>/<user>_mask.tif
        files[`segmentation/${entry.imageId}/${entry.user}_mask.tif`] = [maskCog(georef, area, mask), { level: 0 }];
      }
      onProgress(masks.length, masks.length);
      return { bytes: zipSync(files), name: `${config.name}_masks.zip` };
    },

    flush: () => labels().flush(),

    async loadProjectFile() {
      requireAdmin();
      const response = await fetchFile(projectFile, token(), { cache: 'no-store' });
      if (!response.ok) throw new Error(`Could not read the project ${site.project} (${response.status})`);
      return {
        config: await response.json(),
        location: projectFile,
        savesTo: isHfPath(projectFile) && token() ? 'hub' as const : 'download' as const,
      };
    },

    async saveProjectFile(config) {
      requireAdmin();
      const text = `${JSON.stringify(config, null, 2)}\n`;
      if (isHfPath(projectFile) && token()) {
        const location = parseHfPath(projectFile);
        const { uploadFiles } = await hub();
        await uploadFiles({
          repo: hubRepo(location),
          accessToken: token() ?? undefined,
          branch: location.revision,
          files: [{ path: location.path, content: new Blob([text], { type: 'application/json' }) }],
          commitTitle: 'Edit the project in IRIS',
        });
        return 'hub';
      }
      downloadFile(new TextEncoder().encode(text), projectFile.split('/').pop() || 'project.json', 'application/json');
      return 'download';
    },

    review() {
      const current = session();
      if (!current || current.role !== 'admin' || current.guest) return null;
      return {
        list: async () => ({ entries: await labels().list(), shared: labels().shared }),
        loadMask: (user, imageId, length) => labels().loadMask(user, imageId, length),
        loadNotes: (user, imageId) => labels().loadNotes(user, imageId),
      };
    },
  };
  return backend;
};
