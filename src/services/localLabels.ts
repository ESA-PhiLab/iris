/**
 * Masks and notes kept in the browser, in IndexedDB
 *
 * For projects without a place on the Hub to write to, and for guests. The
 * masks stay in this browser until they are downloaded.
 */

export interface ImageNotes {
  difficulty: number;
  notes: string;
  complete: boolean;
}

export interface LocalLabel {
  imageId: string;
  mask: Uint8Array | null;
  userMask: Uint8Array | null;
  notes: ImageNotes;
  /** When the mask was last saved, ISO 8601 */
  modified: string;
}

type Stored = LocalLabel & { key: string; project: string; user: string };

export interface PendingUpload {
  scope: string;
  path: string;
  bytes: Uint8Array;
  modified: string;
}

type StoredUpload = PendingUpload & { key: string };

const DATABASE = 'iris';
const STORE = 'labels';
const OUTBOX_STORE = 'outbox';

export const DEFAULT_NOTES: ImageNotes = { difficulty: 3, notes: '', complete: false };

let opening: Promise<IDBDatabase> | null = null;

const openDatabase = () => {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) {
          const store = request.result.createObjectStore(STORE, { keyPath: 'key' });
          store.createIndex('owner', ['project', 'user']);
        }
        if (!request.result.objectStoreNames.contains(OUTBOX_STORE)) {
          const outbox = request.result.createObjectStore(OUTBOX_STORE, { keyPath: 'key' });
          outbox.createIndex('scope', 'scope');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return opening;
};

const done = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

/** Where the labels live: IndexedDB, or memory where there is none (tests) */
interface Backing {
  get(key: string): Promise<Stored | undefined>;
  put(record: Stored): Promise<void>;
  owned(project: string, user: string): Promise<Stored[]>;
  everyone(project: string): Promise<Stored[]>;
  putUpload(record: StoredUpload): Promise<void>;
  deleteUpload(key: string): Promise<void>;
  uploads(scope: string): Promise<StoredUpload[]>;
}

const indexedDbBacking: Backing = {
  async get(key) {
    const db = await openDatabase();
    return done(db.transaction(STORE).objectStore(STORE).get(key)) as Promise<Stored | undefined>;
  },
  async put(record) {
    const db = await openDatabase();
    await done(db.transaction(STORE, 'readwrite').objectStore(STORE).put(record));
  },
  async owned(project, user) {
    const db = await openDatabase();
    const index = db.transaction(STORE).objectStore(STORE).index('owner');
    return done(index.getAll([project, user])) as Promise<Stored[]>;
  },
  async everyone(project) {
    const db = await openDatabase();
    const index = db.transaction(STORE).objectStore(STORE).index('owner');
    return done(index.getAll(IDBKeyRange.bound([project, ''], [project, '\uffff']))) as Promise<Stored[]>;
  },
  async putUpload(record) {
    const db = await openDatabase();
    await done(db.transaction(OUTBOX_STORE, 'readwrite').objectStore(OUTBOX_STORE).put(record));
  },
  async deleteUpload(key) {
    const db = await openDatabase();
    await done(db.transaction(OUTBOX_STORE, 'readwrite').objectStore(OUTBOX_STORE).delete(key));
  },
  async uploads(scope) {
    const db = await openDatabase();
    const index = db.transaction(OUTBOX_STORE).objectStore(OUTBOX_STORE).index('scope');
    return done(index.getAll(scope)) as Promise<StoredUpload[]>;
  },
};

const memory = new Map<string, Stored>();
const memoryUploads = new Map<string, StoredUpload>();
const memoryBacking: Backing = {
  async get(key) { return memory.get(key); },
  async put(record) { memory.set(record.key, record); },
  async owned(project, user) {
    return [...memory.values()].filter((record) => record.project === project && record.user === user);
  },
  async everyone(project) {
    return [...memory.values()].filter((record) => record.project === project);
  },
  async putUpload(record) { memoryUploads.set(record.key, record); },
  async deleteUpload(key) { memoryUploads.delete(key); },
  async uploads(scope) { return [...memoryUploads.values()].filter((record) => record.scope === scope); },
};

const backing = (): Backing => (typeof indexedDB === 'undefined' ? memoryBacking : indexedDbBacking);

/** The labels of one user in one project */
export const localLabels = (project: string, user: string) => {
  const key = (imageId: string) => `${project}|${user}|${imageId}`;

  return {
    async get(imageId: string): Promise<LocalLabel | null> {
      return (await backing().get(key(imageId))) ?? null;
    },

    async put(imageId: string, changes: Partial<Omit<LocalLabel, 'imageId'>>) {
      const current = await backing().get(key(imageId));
      await backing().put({
        mask: null,
        userMask: null,
        notes: DEFAULT_NOTES,
        ...current,
        ...changes,
        key: key(imageId),
        project,
        user,
        imageId,
        modified: changes.modified ?? new Date().toISOString(),
      });
    },

    async all(): Promise<LocalLabel[]> {
      return backing().owned(project, user);
    },

    /** The labels of every user of the project in this browser */
    async everyone(): Promise<Array<LocalLabel & { user: string }>> {
      return backing().everyone(project);
    },
  };
};

/** Files saved locally until their remote upload succeeds */
export const localOutbox = (scope: string) => {
  const key = (path: string) => JSON.stringify([scope, path]);
  return {
    async put(files: Record<string, Uint8Array>) {
      const modified = new Date().toISOString();
      await Promise.all(Object.entries(files).map(([path, bytes]) => backing().putUpload({
        key: key(path), scope, path, bytes: new Uint8Array(bytes), modified,
      })));
    },

    async remove(paths: string[]) {
      await Promise.all(paths.map((path) => backing().deleteUpload(key(path))));
    },

    async all(): Promise<PendingUpload[]> {
      return (await backing().uploads(scope)).map(({ path, bytes, modified }) => ({
        scope, path, bytes: new Uint8Array(bytes), modified,
      }));
    },
  };
};

/** Forget everything kept in memory (tests) */
export const clearMemoryLabels = () => {
  memory.clear();
  memoryUploads.clear();
};
