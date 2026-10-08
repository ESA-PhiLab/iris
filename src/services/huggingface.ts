/**
 * Files on the Hugging Face Hub
 *
 * Projects, images and masks can live in a dataset or a storage bucket,
 * written as hf:// paths:
 *   hf://datasets/<owner>/<name>[@<revision>]/<path>
 *   hf://buckets/<owner>/<name>/<path>
 * Private repositories need the token of the signed-in user.
 */

export interface HfLocation {
  type: 'dataset' | 'bucket' | 'model';
  /** <owner>/<name> */
  name: string;
  revision?: string;
  path: string;
}

const HUB = 'https://huggingface.co';

export const isHfPath = (location: string) => location.startsWith('hf://');

export const parseHfPath = (location: string): HfLocation => {
  const match = /^hf:\/\/(datasets|buckets|models)\/([^/@]+\/[^/@]+)(?:@([^/]+))?(?:\/(.*))?$/.exec(location);
  if (!match) {
    throw new Error(`'${location}' is not a Hugging Face path, write hf://datasets/<owner>/<name>/<path>`);
  }
  const [, kind, name, revision, path = ''] = match;
  return {
    type: kind.slice(0, -1) as HfLocation['type'],
    name,
    revision: kind === 'buckets' ? undefined : decodeURIComponent(revision ?? 'main'),
    path,
  };
};

export const formatHfPath = ({ type, name, revision, path }: HfLocation) =>
  `hf://${type}s/${name}${revision && revision !== 'main' ? `@${encodeURIComponent(revision)}` : ''}${path ? `/${path}` : ''}`;

/** A path relative to a file, both on the Hub or both addresses */
export const resolvePath = (relative: string, base: string): string => {
  if (isHfPath(relative) || /^[a-z]+:\/\//i.test(relative)) return relative;
  if (!isHfPath(base)) return new URL(relative, new URL(base, window.location.href)).href;
  const location = parseHfPath(base);
  const folder = new URL(`https://x/${location.path}`);
  const path = new URL(relative, folder).pathname.slice(1);
  return formatHfPath({ ...location, path: decodeURIComponent(path) });
};

/** Address to read a file of the Hub, which redirects to its content */
export const hfResolveUrl = ({ type, name, revision, path }: HfLocation) => {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const prefix = type === 'model' ? '' : `${type}s/`;
  return `${HUB}/${prefix}${name}/resolve/${revision ? `${encodeURIComponent(revision)}/` : ''}${encoded}`;
};

const authorization = (token?: string | null): Record<string, string> =>
  (token ? { Authorization: `Bearer ${token}` } : {});

/** Read a file, from the Hub with the token or from any address */
export const fetchFile = (location: string, token?: string | null, init: RequestInit = {}) =>
  isHfPath(location)
    ? fetch(hfResolveUrl(parseHfPath(location)), {
      ...init,
      headers: { ...authorization(token), ...(init.headers as Record<string, string>) },
    })
    : fetch(location, init);

/** Signed addresses expire after an hour: use them for less */
const SIGNED_FOR = 45 * 60 * 1000;
const signed = new Map<string, { url: string; until: number }>();

/**
 * An address the browser can read in parts without the token
 *
 * Files of the Hub redirect to a signed address of their CDN. Asking for it
 * once spares a redirect on every range request, and the worker reading the
 * COG then needs no token.
 */
export const readableUrl = async (location: string, token?: string | null): Promise<string> => {
  if (!isHfPath(location)) return location;
  const cached = signed.get(location);
  if (cached && cached.until > Date.now()) return cached.url;
  const response = await fetchFile(location, token, { method: 'HEAD' });
  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403
      ? `No access to ${location}: sign in with an account that can read it`
      : `Could not find ${location} (${response.status})`);
  }
  signed.set(location, { url: response.url, until: Date.now() + SIGNED_FOR });
  return response.url;
};

/** Repository of the Hub as @huggingface/hub names it */
export const hubRepo = ({ type, name }: HfLocation) =>
  ({ type, name } as { type: 'dataset' | 'bucket' | 'model'; name: string });

/** The client of the Hub, loaded only by projects on the Hub */
export const hub = () => import('@huggingface/hub');
