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

const DATABASE = 'iris';
const STORE = 'labels';

export const DEFAULT_NOTES: ImageNotes = { difficulty: 3, notes: '', complete: false };

let opening: Promise<IDBDatabase> | null = null;

const openDatabase = () => {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('owner', ['project', 'user']);
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
};

const memory = new Map<string, Stored>();
const memoryBacking: Backing = {
  async get(key) { return memory.get(key); },
  async put(record) { memory.set(record.key, record); },
  async owned(project, user) {
    return [...memory.values()].filter((record) => record.project === project && record.user === user);
  },
  async everyone(project) {
    return [...memory.values()].filter((record) => record.project === project);
  },
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

/** Forget everything kept in memory (tests) */
export const clearMemoryLabels = () => memory.clear();
