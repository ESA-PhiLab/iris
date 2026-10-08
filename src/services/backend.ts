/**
 * Where IRIS gets the project and keeps the masks
 *
 * Two kinds: the IRIS server, or no server at all, where the project is read
 * from its files and the masks stay in the browser. A file iris.json next to
 * the page means no server; it names the project file.
 */

import type { ImageFileSource } from '../raster/cog';
import type { ImageInfo } from '../stores/segmentationStore';
import type { ProjectConfig, UserConfig, UserInfo, UserProfile } from '../types/iris';
import type { ImageNotes } from './localLabels';
import type { LabelEntry } from './labelStorage';

export interface UserMask {
  mask: Uint8Array;
  userMask: Uint8Array;
}

export interface Preferences {
  config: UserConfig;
  /** Every band of the images, e.g. $Sentinel2.B4 */
  allBands: string[];
  isAdmin: boolean;
}

/** What the page shows of the person using IRIS */
export interface Profile extends UserProfile {
  canChangePassword: boolean;
  canSignOut: boolean;
}

/** What the sign-in form offers */
export interface SignInOptions {
  register: boolean;
  forgotPassword: boolean;
  guest: boolean;
}

/** The masks of every user, for reviewing them */
export interface ReviewSource {
  /** Every saved mask; shared is false when only this browser's are there */
  list(): Promise<{ entries: LabelEntry[]; shared: boolean }>;
  loadMask(user: string, imageId: string, length: number): Promise<UserMask | null>;
  loadNotes(user: string, imageId: string): Promise<ImageNotes | null>;
}

export interface Backend {
  readonly kind: 'server' | 'static';
  /** The person using IRIS, null when they have to sign in first */
  currentUser(): Promise<UserInfo | null>;
  signInOptions(): SignInOptions;
  /** Throws an error that says what is wrong */
  signIn(user: string, password: string): Promise<void>;
  enterAsGuest(): Promise<void>;
  /** The project, with every view and default in place */
  loadProject(): Promise<ProjectConfig>;
  /** Images of the project and whether the user and others annotated them */
  listImages(): Promise<ImageInfo[]>;
  /** Image to open when the address names none */
  startImageId(images: ImageInfo[]): Promise<string | null>;
  /** Address of the page of an image */
  pageUrl(imageId: string): string;
  /** Where the worker reads the COG files of an image */
  imageFiles(project: ProjectConfig, imageId: string): Promise<Record<string, ImageFileSource>>;
  thumbnailUrl(imageId: string): Promise<string | null>;
  loadMetadata(imageId: string): Promise<Record<string, unknown> | null>;
  loadMask(imageId: string, length: number): Promise<UserMask | null>;
  saveMask(imageId: string, mask: UserMask): Promise<void>;
  /** Save while the page closes */
  saveMaskOnUnload(imageId: string, mask: UserMask): void;
  /** Notes about a mask the user saved, null before the first save */
  loadNotes(imageId: string): Promise<ImageNotes | null>;
  saveNotes(imageId: string, notes: ImageNotes): Promise<void>;
  loadPreferences(allBands: string[]): Promise<Preferences>;
  savePreferences(config: UserConfig): Promise<void>;
  /** The profile of the user, or of another user (server only) */
  loadProfile(userId?: string): Promise<Profile>;
  signOut(): Promise<void>;
  /** The user's masks as files, when they are kept in the browser */
  downloadMasks?(onProgress?: (done: number, total: number) => void): Promise<{ bytes: Uint8Array; name: string } | null>;
  /** Write what is still waiting, before the page leaves */
  flush(): Promise<void>;
  /** The masks of all users, for those who review them; the server has its admin pages */
  review?(): ReviewSource | null;
}

let current: Backend | null = null;

/** The backend of the page, chosen once at start */
export const backend = (): Backend => {
  if (!current) throw new Error('The backend is not chosen yet');
  return current;
};

export const setBackend = (chosen: Backend) => {
  current = chosen;
};

/** The backend, or null before one is chosen */
export const chosenBackend = (): Backend | null => current;

/** iris.json next to the page, or null when a server runs IRIS */
export const loadSiteConfig = async (): Promise<{ project: string } | null> => {
  try {
    const response = await fetch(new URL('iris.json', window.location.href).href, { cache: 'no-store' });
    if (!response.ok) return null;
    const site = await response.json();
    return typeof site?.project === 'string' ? site : null;
  } catch {
    return null;
  }
};
