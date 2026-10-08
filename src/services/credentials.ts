/**
 * Accounts without a server: credentials.json is a locked box
 *
 * It holds one entry per user, encrypted with a key derived from
 * "user:password" (PBKDF2-SHA256, AES-GCM). An entry is found by a hash of the
 * user name, so the file shows no names. Unlocking it gives the user's role
 * and Hugging Face token, kept for the session of the tab.
 * scripts/credentials.mjs adds and removes users.
 */

export interface Session {
  user: string;
  role: 'admin' | 'annotator';
  /** Token to read the project and write the masks on the Hugging Face Hub */
  hfToken?: string | null;
  /** Entered without an account: masks stay in this browser */
  guest?: boolean;
}

export interface CredentialsFile {
  version: 2;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  /** Salt of the hashes of the user names */
  salt: string;
  users: Record<string, { salt: string; iv: string; ciphertext: string }>;
}

const fromBase64 = (text: string) => Uint8Array.from(atob(text), (character) => character.charCodeAt(0));

const toBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const safeUserName = (user: unknown): user is string =>
  typeof user === 'string' && !!user && user !== '.' && user !== '..' && !/[\\/\u0000-\u001f]/.test(user);

/** Where the entry of a user is: a hash of the salted name */
export const userEntryId = async (salt: string, user: string) => {
  const name = new TextEncoder().encode(user);
  const data = new Uint8Array([...fromBase64(salt), ...name]);
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
};

export const entryKey = async (user: string, password: string, salt: Uint8Array, iterations: number, usage: KeyUsage) => {
  const material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(`${user}:${password}`), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as Uint8Array<ArrayBuffer>, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage]
  );
};

export class WrongCredentials extends Error {
  constructor() {
    super('Wrong user name or password');
  }
}

/** Open the entry of a user; a wrong name or password fails the same way */
export const unlock = async (file: CredentialsFile, user: string, password: string): Promise<Session> => {
  if (file.version !== 2) throw new Error('credentials.json is of an unknown version');
  const entry = file.users[await userEntryId(file.salt, user)];
  if (!entry) throw new WrongCredentials();
  try {
    const key = await entryKey(user, password, fromBase64(entry.salt), file.iterations, 'decrypt');
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(entry.iv) as Uint8Array<ArrayBuffer> },
      key,
      fromBase64(entry.ciphertext) as Uint8Array<ArrayBuffer>
    );
    const payload = JSON.parse(new TextDecoder().decode(plain));
    const openedUser = payload.user ?? user;
    if (!safeUserName(openedUser)) throw new Error('Unsafe user name');
    return { user: openedUser, role: payload.role === 'admin' ? 'admin' : 'annotator', hfToken: payload.hfToken ?? null };
  } catch {
    throw new WrongCredentials();
  }
};

const sessionKey = (site: string) => `iris-session|${site}`;

export const savedSession = (site: string): Session | null => {
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey(site)) || 'null');
  } catch {
    return null;
  }
};

export const saveSession = (site: string, session: Session) => {
  try {
    sessionStorage.setItem(sessionKey(site), JSON.stringify(session));
  } catch { /* the session lasts until the page reloads */ }
};

export const clearSession = (site: string) => {
  try {
    sessionStorage.removeItem(sessionKey(site));
  } catch { /* ignore */ }
};
