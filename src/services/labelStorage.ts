/**
 * Where the masks of a project are kept
 *
 * In this browser (IndexedDB), or on the Hugging Face Hub, where every user
 * of the project writes: a storage bucket (recommended, files are simply
 * replaced) or a dataset (each save is a commit). Files first enter a durable
 * browser outbox, so a failed upload can be retried. On the Hub they are:
 *   segmentation/<image>/<user>_mask.tif   the mask (see export/maskFiles.ts)
 *   segmentation/<image>/<user>.json       the notes and when it was saved
 */

import type { UserMask } from './backend';
import { DEFAULT_NOTES, ImageNotes, localLabels, localOutbox } from './localLabels';
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
export const browserStorage = (project: string, legacyProject?: string): LabelStorage => ({
  shared: false,

  async loadMask(user, imageId, length) {
    const label = await localLabels(project, user).get(imageId)
      ?? (legacyProject ? await localLabels(legacyProject, user).get(imageId) : null);
    if (!label?.mask || !label.userMask || label.mask.length !== length) return null;
    return { mask: new Uint8Array(label.mask), userMask: new Uint8Array(label.userMask) };
  },

  async saveMask(user, imageId, { mask, userMask }) {
    await localLabels(project, user).put(imageId, { mask: new Uint8Array(mask), userMask: new Uint8Array(userMask) });
  },

  async loadNotes(user, imageId) {
    const label = await localLabels(project, user).get(imageId)
      ?? (legacyProject ? await localLabels(legacyProject, user).get(imageId) : null);
    return label?.mask ? label.notes : null;
  },

  async saveNotes(user, imageId, notes) {
    await localLabels(project, user).put(imageId, { notes });
  },

  async list() {
    const current = await localLabels(project, '').everyone();
    const legacy = legacyProject ? await localLabels(legacyProject, '').everyone() : [];
    const labels = new Map<string, (typeof current)[number]>();
    for (const label of [...legacy, ...current]) labels.set(`${label.user}|${label.imageId}`, label);
    return [...labels.values()]
      .filter((label) => label.mask)
      .map(({ user, imageId, modified }) => ({ user, imageId, modified }));
  },

  async flush() {},
});

type Notes = ImageNotes & { modified: string; user: string };

const uploadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/authorization error|xet-write-token|\b(?:401|403)\b/i.test(message)) {
    return new Error(
      'Hugging Face rejected the upload. Use a token with the Write role (or fine-grained write access to this bucket), '
      + 'and make sure your account has write access to the bucket organization.'
    );
  }
  return error instanceof Error ? error : new Error(message);
};

const ownerPath = (base: HfLocation, imageId: string, file: string) =>
  [base.path, 'segmentation', imageId, file].filter(Boolean).join('/');

/** Masks on the Hugging Face Hub, in a bucket or a dataset */
export const hubStorage = (location: string, token: string | null): LabelStorage => {
  const base = parseHfPath(location);
  const at = (imageId: string, file: string) => formatHfPath({ ...base, path: ownerPath(base, imageId, file) });
  const outbox = localOutbox(location);

  // Files are durable in IndexedDB before they are uploaded. This map mirrors
  // that outbox while this page is open.
  const pending = new Map<string, Uint8Array>();
  let restoring: Promise<void> | null = null;
  let committing: Promise<void> = Promise.resolve();

  const restore = () => {
    if (!restoring) {
      restoring = outbox.all().then((files) => {
        for (const { path, bytes } of files) if (!pending.has(path)) pending.set(path, bytes);
      });
    }
    return restoring;
  };

  const commit = async () => {
    await restore();
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
      // A newer save of the same path may have arrived during the upload.
      await outbox.remove(files.filter(({ path }) => !pending.has(path)).map(({ path }) => path));
    } catch (error) {
      // Keep them for the next try, unless saved again since
      for (const { path, bytes } of files) if (!pending.has(path)) pending.set(path, bytes);
      throw uploadError(error);
    }
  };

  const flush = async () => {
    const done = committing.then(commit);
    committing = done.catch(() => {});
    await done;
  };

  const write = async (files: Record<string, Uint8Array>) => {
    await restore();
    await outbox.put(files);
    for (const [path, bytes] of Object.entries(files)) pending.set(path, bytes);
    await flush();
  };

  const readNotes = async (user: string, imageId: string): Promise<Notes | null> => {
    await restore();
    const path = ownerPath(base, imageId, `${user}.json`);
    const waiting = pending.get(path);
    if (waiting) return { ...DEFAULT_NOTES, ...JSON.parse(new TextDecoder().decode(waiting)) };
    const response = await fetchFile(at(imageId, `${user}.json`), token, { cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Could not read the notes of ${user} on ${imageId} (${response.status})`);
    return { ...DEFAULT_NOTES, ...(await response.json()) };
  };

  const writeNotes = async (user: string, imageId: string, notes: Notes) => ({
    [ownerPath(base, imageId, `${user}.json`)]: new TextEncoder().encode(JSON.stringify(notes, null, 2)),
  });

  return {
    shared: true,

    async loadMask(user, imageId, length) {
      await restore();
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
      // Editing notes remains durable while temporarily offline, just like a
      // mask save. A pending local note is still returned by readNotes.
      const previous = await readNotes(user, imageId).catch(() => null);
      await write(await writeNotes(user, imageId, {
        ...DEFAULT_NOTES, ...previous, ...notes, user, modified: previous?.modified ?? new Date().toISOString(),
      }));
    },

    async list() {
      await restore();
      const { listFiles } = await hub();
      const folder = [base.path, 'segmentation'].filter(Boolean).join('/');
      const entries = new Map<string, LabelEntry>();
      const escapedFolder = folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const maskPath = new RegExp(`^${escapedFolder}/(.+)/([^/]+)_mask\\.tif$`);
      try {
        for await (const file of listFiles({
          repo: hubRepo(base), path: folder, recursive: true, expand: true,
          revision: base.revision, accessToken: token ?? undefined,
        })) {
          const match = file.type === 'file' && maskPath.exec(file.path);
          if (match) {
            entries.set(`${match[1]}|${match[2]}`, {
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
      for (const { path, modified } of await outbox.all()) {
        const match = maskPath.exec(path);
        if (match) entries.set(`${match[1]}|${match[2]}`, { imageId: match[1], user: match[2], modified });
      }
      if (pending.size) void flush().catch((error) => console.error('Could not retry pending mask uploads:', error));
      return [...entries.values()];
    },

    flush,
  };
};
