/**
 * Where the masks of a project without a server are kept
 *
 * In this browser (IndexedDB), or on the Hugging Face Hub, where every user
 * of the project writes: a storage bucket (recommended, files are simply
 * replaced) or a dataset (each save is a commit, so saves close together go
 * in one commit). On the Hub the masks are laid out like the IRIS server's
 * project folder:
 *   segmentation/<image>/<user>_mask.tif   the mask (see export/maskFiles.ts)
 *   segmentation/<image>/<user>.json       the notes and when it was saved
 */

import type { UserMask } from './backend';
import { DEFAULT_NOTES, ImageNotes, localLabels } from './localLabels';
import { HfLocation, fetchFile, formatHfPath, hub, hubRepo, parseHfPath } from './huggingface';
import { readMaskCog } from '../export/maskFiles';

export interface LabelEntry {
  user: string;
  imageId: string;
  /** When the mask was last saved, ISO 8601 */
  modified: string;
}

export interface LabelStorage {
  /** Whether the masks of other users are there too */
  readonly shared: boolean;
  loadMask(user: string, imageId: string, length: number): Promise<UserMask | null>;
  /** file makes the COG of the mask, for storages that keep files */
  saveMask(user: string, imageId: string, mask: UserMask, file: () => Promise<Uint8Array>): Promise<void>;
  /** Notes of a saved mask, null before the first save */
  loadNotes(user: string, imageId: string): Promise<ImageNotes | null>;
  saveNotes(user: string, imageId: string, notes: ImageNotes): Promise<void>;
  /** Every saved mask */
  list(): Promise<LabelEntry[]>;
  /** Write what is still waiting to be written */
  flush(): Promise<void>;
}

/** Masks in this browser */
export const browserStorage = (project: string): LabelStorage => ({
  shared: false,

  async loadMask(user, imageId, length) {
    const label = await localLabels(project, user).get(imageId);
    if (!label?.mask || !label.userMask || label.mask.length !== length) return null;
    return { mask: new Uint8Array(label.mask), userMask: new Uint8Array(label.userMask) };
  },

  async saveMask(user, imageId, { mask, userMask }) {
    await localLabels(project, user).put(imageId, { mask: new Uint8Array(mask), userMask: new Uint8Array(userMask) });
  },

  async loadNotes(user, imageId) {
    const label = await localLabels(project, user).get(imageId);
    return label?.mask ? label.notes : null;
  },

  async saveNotes(user, imageId, notes) {
    await localLabels(project, user).put(imageId, { notes });
  },

  async list() {
    return (await localLabels(project, '').everyone())
      .filter((label) => label.mask)
      .map(({ user, imageId, modified }) => ({ user, imageId, modified }));
  },

  async flush() {},
});

type Notes = ImageNotes & { modified: string; user: string };

const ownerPath = (base: HfLocation, imageId: string, file: string) =>
  [base.path, 'segmentation', imageId, file].filter(Boolean).join('/');

/** How long a dataset waits for more saves before committing them */
const COMMIT_DELAY = 4000;

/** Masks on the Hugging Face Hub, in a bucket or a dataset */
export const hubStorage = (location: string, token: string | null): LabelStorage => {
  const base = parseHfPath(location);
  const at = (imageId: string, file: string) => formatHfPath({ ...base, path: ownerPath(base, imageId, file) });
  const notesCache = new Map<string, Notes>();

  // Files waiting for the next commit of a dataset, by path
  const pending = new Map<string, Uint8Array>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let committing: Promise<void> = Promise.resolve();

  const commit = async () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending.size) return;
    const files = [...pending.entries()].map(([path, bytes]) => ({ path, bytes }));
    pending.clear();
    try {
      const { uploadFiles } = await hub();
      await uploadFiles({
        repo: hubRepo(base),
        accessToken: token ?? undefined,
        files: files.map(({ path, bytes }) => ({ path, content: new Blob([bytes as Uint8Array<ArrayBuffer>]) })),
        branch: base.revision,
        commitTitle: `Save ${files.length} mask files from IRIS`,
      });
    } catch (error) {
      // Keep them for the next try, unless saved again since
      for (const { path, bytes } of files) if (!pending.has(path)) pending.set(path, bytes);
      throw error;
    }
  };

  const write = async (files: Record<string, Uint8Array>) => {
    if (base.type === 'bucket') {
      const { uploadFiles } = await hub();
      await uploadFiles({
        repo: hubRepo(base),
        accessToken: token ?? undefined,
        files: Object.entries(files).map(([path, bytes]) => ({
          path, content: new Blob([bytes as Uint8Array<ArrayBuffer>]),
        })),
      });
      return;
    }
    for (const [path, bytes] of Object.entries(files)) pending.set(path, bytes);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      committing = committing.then(commit).catch((error) => console.error('Could not commit the masks:', error));
    }, COMMIT_DELAY);
  };

  const readNotes = async (user: string, imageId: string): Promise<Notes | null> => {
    const key = `${user}|${imageId}`;
    if (notesCache.has(key)) return notesCache.get(key)!;
    const response = await fetchFile(at(imageId, `${user}.json`), token, { cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Could not read the notes of ${user} on ${imageId} (${response.status})`);
    const notes: Notes = { ...DEFAULT_NOTES, ...(await response.json()) };
    notesCache.set(key, notes);
    return notes;
  };

  const writeNotes = async (user: string, imageId: string, notes: Notes) => {
    notesCache.set(`${user}|${imageId}`, notes);
    return { [ownerPath(base, imageId, `${user}.json`)]: new TextEncoder().encode(JSON.stringify(notes, null, 2)) };
  };

  return {
    shared: true,

    async loadMask(user, imageId, length) {
      const waiting = pending.get(ownerPath(base, imageId, `${user}_mask.tif`));
      if (waiting) return readMaskCog(waiting.slice().buffer, length);
      const response = await fetchFile(at(imageId, `${user}_mask.tif`), token, { cache: 'no-store' });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Could not read the mask of ${user} on ${imageId} (${response.status})`);
      return readMaskCog(await response.arrayBuffer(), length);
    },

    async saveMask(user, imageId, _mask, file) {
      const previous = await readNotes(user, imageId).catch(() => null);
      const notes: Notes = { ...DEFAULT_NOTES, ...previous, user, modified: new Date().toISOString() };
      await write({
        [ownerPath(base, imageId, `${user}_mask.tif`)]: await file(),
        ...(await writeNotes(user, imageId, notes)),
      });
    },

    async loadNotes(user, imageId) {
      const notes = await readNotes(user, imageId);
      return notes ? { difficulty: notes.difficulty, notes: notes.notes, complete: notes.complete } : null;
    },

    async saveNotes(user, imageId, notes) {
      const previous = await readNotes(user, imageId);
      await write(await writeNotes(user, imageId, {
        ...DEFAULT_NOTES, ...previous, ...notes, user, modified: previous?.modified ?? new Date().toISOString(),
      }));
    },

    async list() {
      const { listFiles } = await hub();
      const folder = [base.path, 'segmentation'].filter(Boolean).join('/');
      const entries: LabelEntry[] = [];
      try {
        for await (const file of listFiles({
          repo: hubRepo(base), path: folder, recursive: true, expand: true,
          revision: base.revision, accessToken: token ?? undefined,
        })) {
          const match = file.type === 'file' && new RegExp(`^${folder}/(.+)/([^/]+)_mask\\.tif$`).exec(file.path);
          if (match) {
            entries.push({
              imageId: match[1],
              user: match[2],
              modified: file.uploadedAt ?? file.lastCommit?.date ?? '',
            });
          }
        }
      } catch (error) {
        // A new bucket or dataset has no segmentation folder yet
        if (!/not found|404/i.test(String(error))) throw error;
      }
      return entries;
    },

    async flush() {
      const done = committing.then(commit);
      committing = done.catch(() => {});
      await done;
    },
  };
};
