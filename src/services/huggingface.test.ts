import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchFile, formatHfPath, hfResolveUrl, huggingFaceUser, parseHfPath, readableUrl, resolvePath } from './huggingface';

describe('Hugging Face paths', () => {
  it('reads datasets, revisions and buckets', () => {
    expect(parseHfPath('hf://datasets/org/clouds/demo/p.json'))
      .toEqual({ type: 'dataset', name: 'org/clouds', revision: 'main', path: 'demo/p.json' });
    expect(parseHfPath('hf://datasets/org/clouds@v1.0/p.json').revision).toBe('v1.0');
    expect(parseHfPath('hf://buckets/org/masks/segmentation/a/b.tif'))
      .toEqual({ type: 'bucket', name: 'org/masks', revision: undefined, path: 'segmentation/a/b.tif' });
    expect(parseHfPath('hf://buckets/org/masks')).toMatchObject({ path: '' });
    expect(() => parseHfPath('hf://datasets/clouds')).toThrow(/not a Hugging Face path/);
  });

  it('writes them back', () => {
    expect(formatHfPath(parseHfPath('hf://datasets/org/clouds@v1/x/y.tif'))).toBe('hf://datasets/org/clouds@v1/x/y.tif');
    expect(formatHfPath(parseHfPath('hf://datasets/org/clouds/x'))).toBe('hf://datasets/org/clouds/x');
  });

  it('finds files next to a project on the Hub', () => {
    expect(resolvePath('images/a/s2.tif', 'hf://datasets/org/clouds@v1/demo/p.json'))
      .toBe('hf://datasets/org/clouds@v1/demo/images/a/s2.tif');
    expect(resolvePath('../shared/x.tif', 'hf://datasets/org/clouds/demo/p.json'))
      .toBe('hf://datasets/org/clouds/shared/x.tif');
    expect(resolvePath('hf://buckets/o/b/c.tif', 'hf://datasets/org/clouds/p.json')).toBe('hf://buckets/o/b/c.tif');
    expect(resolvePath('images/a.tif', 'https://example.org/demo/p.json')).toBe('https://example.org/demo/images/a.tif');
  });

  it('builds the addresses of the files', () => {
    expect(hfResolveUrl(parseHfPath('hf://datasets/org/clouds/a b/c.tif')))
      .toBe('https://huggingface.co/datasets/org/clouds/resolve/main/a%20b/c.tif');
    expect(hfResolveUrl(parseHfPath('hf://buckets/org/masks/x.tif')))
      .toBe('https://huggingface.co/buckets/org/masks/resolve/x.tif');
  });
});

describe('reading files of the Hub', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('sends the token to the Hub only', async () => {
    const fetch = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));
    await fetchFile('hf://datasets/org/clouds/p.json', 'hf_secret');
    await fetchFile('https://example.org/p.json', 'hf_secret');
    expect((fetch.mock.calls[0][1]!.headers as Record<string, string>).Authorization).toBe('Bearer hf_secret');
    expect(fetch.mock.calls[1][1]!.headers).toBeUndefined();
  });

  it('uses a token to identify its Hugging Face account', async () => {
    const fetch = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{"name":"alice"}'));
    expect(await huggingFaceUser('hf_alice')).toBe('alice');
    expect(fetch).toHaveBeenCalledWith('https://huggingface.co/api/whoami-v2', expect.objectContaining({
      cache: 'no-store', headers: { Authorization: 'Bearer hf_alice' },
    }));
  });

  it('rejects an invalid Hugging Face token', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));
    await expect(huggingFaceUser('hf_invalid')).rejects.toThrow(/invalid or expired/);
  });

  it('asks once for the signed address of a file', async () => {
    const response = new Response(null, { status: 200 });
    Object.defineProperty(response, 'url', { value: 'https://cdn.hf.co/signed' });
    const fetch = vi.spyOn(global, 'fetch').mockResolvedValue(response);
    expect(await readableUrl('hf://datasets/org/clouds/a.tif', 'hf_x')).toBe('https://cdn.hf.co/signed');
    expect(await readableUrl('hf://datasets/org/clouds/a.tif', 'hf_x')).toBe('https://cdn.hf.co/signed');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await readableUrl('demo/a.tif')).toBe('demo/a.tif');
  });

  it('says when the file cannot be read', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));
    await expect(readableUrl('hf://datasets/org/private/a.tif')).rejects.toThrow(/sign in/);
  });
});
