import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadImageIds, mergeDeep, normalizeProject } from './project';

describe('normalizeProject', () => {
  it('fills in the defaults', () => {
    const config = normalizeProject({
      images: { path: 'images/{id}.tif' },
      classes: [{ name: 'Clear', colour: [0, 0, 0, 0] }],
      views: { RGB: { data: ['$B4', '$B3', '$B2'] }, SWIR: { data: '$B11' } },
    }, 'https://example.org/projects/clouds.json');

    expect(config.name).toBe('clouds');
    expect(config.images.path).toEqual({ pictures: 'images/{id}.tif' });
    expect(config.segmentation.ai_model && config.segmentation.ai_model.n_estimators).toBe(20);
    expect(config.segmentation.score).toBe('f1');
    expect(config.views.RGB.name).toBe('RGB');
    expect(config.view_groups).toEqual({ default: ['RGB', 'SWIR'] });
  });

  it('keeps what the project gives', () => {
    const config = normalizeProject({
      name: 'mine',
      images: { path: { S2: 'a/{id}.tif' } },
      classes: [{ name: 'Cloud', colour: [255, 255, 0, 70] }],
      segmentation: { ai_model: { n_estimators: 50 } },
      view_groups: { default: ['RGB'] },
      views: { RGB: { data: '$S2.B1' } },
    }, 'p.json');
    expect(config.name).toBe('mine');
    expect(config.segmentation.ai_model).toMatchObject({ n_estimators: 50, n_leaves: 10 });
    expect(config.view_groups).toEqual({ default: ['RGB'] });
  });

  it('refuses projects it cannot show', () => {
    expect(() => normalizeProject({}, 'p.json')).toThrow(/images.path/);
    expect(() => normalizeProject({ images: { path: 'x/{id}.tif' }, views: { Map: { type: 'bingmap' } } }, 'p.json'))
      .toThrow(/only 'image' views/);
  });

  it('merges nested objects', () => {
    expect(mergeDeep({ a: { b: 1, c: 2 }, d: [1] }, { a: { c: 3 }, d: [2] })).toEqual({ a: { b: 1, c: 3 }, d: [2] });
  });
});

describe('project files', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('lists the images given in the project', async () => {
    expect(await loadImageIds({ images: { ids: ['a', 2] } }, 'p.json')).toEqual(['a', '2']);
  });

  it('lists the images of images.json', async () => {
    const fetch = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(['x', 'y'])));
    expect(await loadImageIds({ images: {} }, 'https://example.org/demo/p.json')).toEqual(['x', 'y']);
    expect(fetch.mock.calls[0][0]).toBe('https://example.org/demo/images.json');
  });

  it('says how to list the images', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
    await expect(loadImageIds({ images: {} }, 'p.json')).rejects.toThrow(/images.ids/);
  });

  it('rejects duplicate and path-traversing image ids', async () => {
    await expect(loadImageIds({ images: { ids: ['a', 'a'] } }, 'p.json')).rejects.toThrow(/duplicate/);
    await expect(loadImageIds({ images: { ids: ['../secret'] } }, 'p.json')).rejects.toThrow(/safe path/);
  });
});
