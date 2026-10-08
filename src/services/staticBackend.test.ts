import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { staticBackend } from './staticBackend';
import { clearMemoryLabels } from './localLabels';
import { unzipSync } from 'fflate';
import { readMaskCog } from '../export/maskFiles';

vi.mock('../raster/engine', () => ({
  rasterEngine: () => ({
    open: async () => ({
      width: 2, height: 2, crs: 'EPSG:32633', epsg: 32633, corners: [],
      transform: [10, 0, 500000, 0, -10, 4000000],
    }),
  }),
}));

const project = {
  name: 'clouds',
  images: { path: { S2: 'images/{id}/s2.tif' }, thumbnails: 'images/{id}/thumb.png', ids: ['coast', 'mountains'] },
  classes: [{ name: 'Clear', colour: [0, 0, 0, 0] }, { name: 'Cloud', colour: [255, 255, 0, 70] }],
  views: { RGB: { data: ['$S2.B4', '$S2.B3', '$S2.B2'] } },
};

const mask = (value: number) => ({ mask: new Uint8Array(4).fill(value), userMask: Uint8Array.from([1, 0, 0, 1]) });

describe('staticBackend', () => {
  beforeEach(async () => {
    clearMemoryLabels();
    localStorage.clear();
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      if (String(url).endsWith('/demo/clouds.json')) return new Response(JSON.stringify(project));
      if (String(url).endsWith('/demo/images/coast/meta.json')) return new Response('{"spacecraft": "S2"}');
      return new Response('', { status: 404 });
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  const open = async () => {
    const source = staticBackend({ project: 'demo/clouds.json' });
    await source.loadProject();
    return source;
  };

  it('reads the project and its image files next to it', async () => {
    const source = staticBackend({ project: 'demo/clouds.json' });
    const config = await source.loadProject();
    expect(config.name).toBe('clouds');
    expect((await source.imageFiles(config, 'coast')).S2.url).toBe(new URL('demo/images/coast/s2.tif', window.location.href).href);
    expect(await source.thumbnailUrl('coast')).toBe(new URL('demo/images/coast/thumb.png', window.location.href).href);
    expect(source.pageUrl('a b')).toBe(`${window.location.pathname}?image_id=a%20b`);
  });

  it('keeps the masks and notes in the browser', async () => {
    const source = await open();
    expect(await source.loadMask('coast', 4)).toBeNull();
    expect(await source.loadNotes('coast')).toBeNull();

    await source.saveMask('coast', mask(1));
    expect(await source.loadMask('coast', 4)).toEqual(mask(1));
    // A mask of another size belongs to another mask area
    expect(await source.loadMask('coast', 9)).toBeNull();

    expect(await source.loadNotes('coast')).toEqual({ difficulty: 3, notes: '', complete: false });
    await source.saveNotes('coast', { difficulty: 5, notes: 'hard', complete: true });
    expect(await source.loadNotes('coast')).toEqual({ difficulty: 5, notes: 'hard', complete: true });
    expect(await source.loadMask('coast', 4)).toEqual(mask(1));
  });

  it('lists the images with the ones annotated, and starts at the last one', async () => {
    const source = await open();
    await source.saveMask('mountains', mask(1));

    const images = await source.listImages();
    expect(images.map((image) => [image.image_id, image.has_user_annotation])).toEqual([
      ['coast', false], ['mountains', true],
    ]);
    expect(await source.startImageId(images)).toBe('mountains');
    expect((await source.currentUser())!.segmentation.n_masks).toBe(1);
    expect((await source.loadProfile()).segmentation.last_masks[0].image_id).toBe('mountains');
  });

  it('keeps the AI settings of the user', async () => {
    const source = await open();
    const preferences = await source.loadPreferences(['$S2.B1', '$S2.B2']);
    expect(preferences.isAdmin).toBe(false);
    expect(preferences.config.segmentation.ai_model.bands).toEqual(['$S2.B1', '$S2.B2']);

    preferences.config.segmentation.ai_model.n_estimators = 99;
    await source.savePreferences(preferences.config);
    expect((await source.loadPreferences([])).config.segmentation.ai_model.n_estimators).toBe(99);
  });

  it('downloads the masks as the files of the server', async () => {
    const source = await open();
    expect(await source.downloadMasks!()).toBeNull();
    await source.saveMask('coast', mask(1));

    const file = await source.downloadMasks!();

    expect(file!.name).toBe('clouds_masks.zip');
    const files = unzipSync(file!.bytes);
    const cog = files['segmentation/coast/local_mask.tif'];
    expect(await readMaskCog(cog.buffer.slice(cog.byteOffset, cog.byteOffset + cog.byteLength) as ArrayBuffer, 4))
      .toEqual(mask(1));
  });

  it('reads metadata files', async () => {
    const source = staticBackend({ project: 'demo/clouds.json' });
    vi.mocked(global.fetch).mockImplementation(async (url) => (String(url).endsWith('clouds.json')
      ? new Response(JSON.stringify({ ...project, images: { ...project.images, metadata: 'images/{id}/meta.json' } }))
      : String(url).endsWith('/demo/images/coast/meta.json') ? new Response('{"spacecraft": "S2"}') : new Response('', { status: 404 })));
    await source.loadProject();
    expect(await source.loadMetadata('coast')).toEqual({ spacecraft: 'S2' });
    expect(await source.loadMetadata('mountains')).toBeNull();
  });
});
