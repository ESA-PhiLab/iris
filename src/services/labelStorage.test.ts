import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { browserStorage, hubStorage } from './labelStorage';
import { clearMemoryLabels } from './localLabels';
import { maskCog } from '../export/maskFiles';

const uploadFiles = vi.fn();
const listFiles = vi.fn();
vi.mock('@huggingface/hub', () => ({
  uploadFiles: (...args: unknown[]) => uploadFiles(...args),
  listFiles: (...args: unknown[]) => listFiles(...args),
}));

const georef = {
  width: 2, height: 2, crs: 'EPSG:32633', epsg: 32633, corners: [] as any,
  transform: [10, 0, 500000, 0, -10, 4000000] as [number, number, number, number, number, number],
};
const mask = { mask: Uint8Array.from([0, 1, 1, 2]), userMask: Uint8Array.from([1, 1, 0, 0]) };
const file = async () => maskCog(georef, [0, 0, 2, 2], mask);

/** The files uploaded so far, read back as a server would serve them */
const uploaded = new Map<string, Uint8Array>();

/** Bytes of a blob of jsdom, which Node's Response does not read */
const bytesOf = (blob: Blob) => new Promise<Uint8Array>((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
  reader.readAsArrayBuffer(blob);
});
const textOf = (path: string) => new TextDecoder().decode(uploaded.get(path));

describe('masks on the Hugging Face Hub', () => {
  beforeEach(() => {
    uploaded.clear();
    uploadFiles.mockReset().mockImplementation(async ({ files }) => {
      for (const { path, content } of files) uploaded.set(path, await bytesOf(content));
    });
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const address = String(url);
      const resolved = address.split('/resolve/')[1] ?? '';
      const path = decodeURIComponent(address.includes('/datasets/') ? resolved.split('/').slice(1).join('/') : resolved);
      const blob = uploaded.get(path);
      return blob ? new Response(blob as Uint8Array<ArrayBuffer>) : new Response('', { status: 404 });
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('writes the mask and the notes to a bucket at once', async () => {
    const storage = hubStorage('hf://buckets/org/masks/project', 'hf_token');
    expect(await storage.loadMask('alice', 'coast', 4)).toBeNull();
    expect(await storage.loadNotes('alice', 'coast')).toBeNull();

    await storage.saveMask('alice', 'coast', mask, file);

    const call = uploadFiles.mock.calls[0][0];
    expect(call.repo).toEqual({ type: 'bucket', name: 'org/masks' });
    expect(call.accessToken).toBe('hf_token');
    expect([...uploaded.keys()].sort()).toEqual([
      'project/segmentation/coast/alice.json', 'project/segmentation/coast/alice_mask.tif',
    ]);
    expect(await storage.loadMask('alice', 'coast', 4)).toEqual(mask);
    expect(await storage.loadNotes('alice', 'coast')).toEqual({ difficulty: 3, notes: '', complete: false });

    await storage.saveNotes('alice', 'coast', { difficulty: 4, notes: 'clouds', complete: true });
    const notes = JSON.parse(textOf('project/segmentation/coast/alice.json'));
    expect(notes).toMatchObject({ difficulty: 4, notes: 'clouds', complete: true, user: 'alice' });
  });

  it('does not report a dataset save until its commit finishes', async () => {
    const storage = hubStorage('hf://datasets/org/clouds@labels', 'hf_token');
    await storage.saveMask('bob', 'coast', mask, file);
    expect(uploadFiles).toHaveBeenCalledTimes(1);
    expect(await storage.loadMask('bob', 'coast', 4)).toEqual(mask);

    await storage.saveNotes('bob', 'coast', { difficulty: 2, notes: '', complete: true });

    expect(uploadFiles).toHaveBeenCalledTimes(2);
    const call = uploadFiles.mock.calls[0][0];
    expect(call.branch).toBe('labels');
    expect(call.files.map((f: { path: string }) => f.path).sort()).toEqual([
      'segmentation/coast/bob.json', 'segmentation/coast/bob_mask.tif',
    ]);
  });

  it('keeps the saves that could not be committed', async () => {
    const storage = hubStorage('hf://datasets/org/clouds', 'hf_token');
    uploadFiles.mockRejectedValueOnce(new Error('rate limited'));
    await expect(storage.saveMask('bob', 'coast', mask, file)).rejects.toThrow('rate limited');

    // A new page can read and retry the durable browser outbox.
    const reopened = hubStorage('hf://datasets/org/clouds', 'hf_token');
    expect(await reopened.loadMask('bob', 'coast', 4)).toEqual(mask);
    await reopened.flush();
    expect(uploadFiles).toHaveBeenCalledTimes(2);
    expect(uploaded.has('segmentation/coast/bob_mask.tif')).toBe(true);
  });

  it('queues note edits when the existing remote notes cannot be read', async () => {
    const storage = hubStorage('hf://datasets/org/clouds', 'hf_token');
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('offline'));

    await storage.saveNotes('bob', 'coast', { difficulty: 5, notes: 'check coast', complete: false });

    expect(JSON.parse(textOf('segmentation/coast/bob.json'))).toMatchObject({
      difficulty: 5, notes: 'check coast', complete: false, user: 'bob',
    });
  });

  it('lists the masks of every user', async () => {
    listFiles.mockImplementation(async function* () {
      yield { type: 'file', path: 'project/segmentation/coast/alice_mask.tif', uploadedAt: '2026-10-01T00:00:00Z' };
      yield { type: 'file', path: 'project/segmentation/coast/alice.json' };
      yield { type: 'file', path: 'project/segmentation/mountains/bob_mask.tif', uploadedAt: '2026-10-02T00:00:00Z' };
    });
    const storage = hubStorage('hf://buckets/org/masks/project', null);
    expect(await storage.list()).toEqual([
      { imageId: 'coast', user: 'alice', modified: '2026-10-01T00:00:00Z' },
      { imageId: 'mountains', user: 'bob', modified: '2026-10-02T00:00:00Z' },
    ]);
    expect(listFiles.mock.calls[0][0]).toMatchObject({ path: 'project/segmentation', recursive: true });
  });

  it('lists nothing in a new bucket', async () => {
    listFiles.mockImplementation(async function* () { throw new Error('Not Found'); });
    expect(await hubStorage('hf://buckets/org/new', null).list()).toEqual([]);
  });
});

describe('masks in the browser', () => {
  beforeEach(() => clearMemoryLabels());

  it('keeps the masks of each user', async () => {
    const storage = browserStorage('clouds');
    await storage.saveMask('alice', 'coast', mask, file);
    await storage.saveMask('bob', 'mountains', mask, file);
    expect(await storage.loadMask('alice', 'coast', 4)).toEqual(mask);
    expect(await storage.loadMask('bob', 'coast', 4)).toBeNull();
    expect((await storage.list()).map(({ user, imageId }) => `${user}/${imageId}`).sort())
      .toEqual(['alice/coast', 'bob/mountains']);
  });

  it('isolates projects with the same display name and reads legacy labels', async () => {
    await browserStorage('clouds').saveMask('alice', 'coast', mask, file);
    const first = browserStorage('https://example.test/a/project.json', 'clouds');
    const second = browserStorage('https://example.test/b/project.json', 'clouds');
    expect(await first.loadMask('alice', 'coast', 4)).toEqual(mask);

    await first.saveMask('alice', 'mountains', mask, file);
    expect(await second.loadMask('alice', 'mountains', 4)).toBeNull();
  });
});
