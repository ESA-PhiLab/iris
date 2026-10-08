/**
 * The IRIS server keeps the users, the project and the masks
 *
 * A mask travels as bytes: 254, the class of each pixel, whether the user drew
 * each pixel (1) or the AI predicted it (0), 254.
 */

import type { UserConfig, UserProfile } from '../types/iris';
import type { Backend, Preferences, UserMask } from './backend';
import type { ImageNotes } from './localLabels';

const SEGMENTATION = '/segmentation/';
const MAGIC = 254;

export const encodeMask = ({ mask, userMask }: UserMask): Uint8Array<ArrayBuffer> => {
  const data = new Uint8Array(2 * mask.length + 2);
  data[0] = MAGIC;
  data.set(mask, 1);
  data.set(userMask, mask.length + 1);
  data[data.length - 1] = MAGIC;
  return data;
};

export const decodeMask = (data: Uint8Array, length: number): UserMask => {
  if (data.length !== 2 * length + 2 || data[0] !== MAGIC || data[data.length - 1] !== MAGIC) {
    throw new Error('The mask from the server does not have the size of the mask area');
  }
  return {
    mask: data.slice(1, length + 1),
    userMask: data.slice(length + 1, 2 * length + 1),
  };
};

const failure = async (response: Response, what: string) => {
  const text = await response.text().catch(() => '');
  return new Error(`Could not ${what} (${response.status}${text ? `: ${text}` : ''})`);
};

const getJson = async (url: string) => {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) throw await failure(response, `load ${url}`);
  return response.json();
};

export const serverBackend = (): Backend => {
  /** Ids of the server's records of the notes, by image */
  const noteIds = new Map<string, number>();

  return {
    kind: 'server',

    async currentUser() {
      const response = await fetch('/user/get/current', { credentials: 'same-origin' });
      return response.ok ? response.json() : null;
    },

    loadProject: () => getJson('/segmentation/api/config'),

    async listImages() {
      return (await getJson('/segmentation/api/images/list')).images;
    },

    // The server sends pages without an image to the right one
    async startImageId() {
      return null;
    },

    pageUrl: (imageId) => `/segmentation/?image_id=${encodeURIComponent(imageId)}`,

    imageFiles(project, imageId) {
      const path = (project.images as any)?.path;
      const fileIds = path && typeof path === 'object' ? Object.keys(path) : ['pictures'];
      return Object.fromEntries(fileIds.map((fileId) => [fileId, {
        // Absolute, the worker would resolve it against its own location
        url: new URL(
          `/segmentation/api/file/${encodeURIComponent(imageId)}/${encodeURIComponent(fileId)}`,
          window.location.href
        ).href,
      }]));
    },

    thumbnailUrl: (imageId) => `/thumbnail/${encodeURIComponent(imageId)}`,

    async loadMetadata(imageId) {
      const response = await fetch(`/metadata/${encodeURIComponent(imageId)}?safe_html=True`, {
        credentials: 'same-origin',
      });
      if (response.status === 404) return null;
      if (!response.ok) throw await failure(response, 'load the metadata');
      return response.json();
    },

    async loadMask(imageId, length) {
      const response = await fetch(`${SEGMENTATION}load_mask/${encodeURIComponent(imageId)}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (response.status === 404) return null;
      if (!response.ok) throw await failure(response, 'load the mask');
      return decodeMask(new Uint8Array(await response.arrayBuffer()), length);
    },

    async saveMask(imageId, mask) {
      const response = await fetch(`${SEGMENTATION}save_mask/${encodeURIComponent(imageId)}`, {
        method: 'POST',
        body: encodeMask(mask),
        headers: { 'Content-Type': 'application/octet-stream' },
        credentials: 'same-origin',
      });
      if (!response.ok) throw await failure(response, 'save the mask');
    },

    saveMaskOnUnload(imageId, mask) {
      navigator.sendBeacon(
        `${SEGMENTATION}save_mask/${encodeURIComponent(imageId)}`,
        new Blob([encodeMask(mask)], { type: 'application/octet-stream' })
      );
    },

    async loadNotes(imageId) {
      const response = await fetch(`/get_action_info/${encodeURIComponent(imageId)}/segmentation`, {
        credentials: 'same-origin',
      });
      if (!response.ok) return null;
      const { id, difficulty, notes, complete } = await response.json();
      noteIds.set(imageId, id);
      return { difficulty, notes, complete };
    },

    async saveNotes(imageId, notes: ImageNotes) {
      if (!noteIds.has(imageId)) await this.loadNotes(imageId);
      const id = noteIds.get(imageId);
      if (id === undefined) throw new Error('Save the mask before its notes');
      const response = await fetch(`/set_action_info/${id}`, {
        method: 'POST',
        body: JSON.stringify(notes),
        credentials: 'same-origin',
      });
      if (!response.ok) throw await failure(response, 'save the notes');
    },

    async loadPreferences(): Promise<Preferences> {
      const data = await getJson('/segmentation/api/user-config');
      return { config: data.config, allBands: data.all_bands, isAdmin: data.is_admin || false };
    },

    async savePreferences(config: UserConfig) {
      const response = await fetch('/segmentation/api/user-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        credentials: 'same-origin',
      });
      if (!response.ok) throw await failure(response, 'save the preferences');
    },

    async loadProfile(userId = 'current') {
      const profile: UserProfile = await getJson(`/user/api/profile/${encodeURIComponent(userId)}`);
      return { ...profile, canChangePassword: true, canSignOut: true };
    },

    async signOut() {
      await fetch('/user/logout', { credentials: 'same-origin' });
    },
  };
};
