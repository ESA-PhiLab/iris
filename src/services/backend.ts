/**
 * Where IRIS gets the project and keeps the masks
 *
 * The file iris.json next to the page names the project file, the accounts
 * and where the masks go (staticBackend.ts). Tests use their own backends.
 */

import type { ImageFileSource } from '../raster/cog';
import type { ImageInfo } from '../stores/segmentationStore';
import type { ProjectConfig, UserConfig, UserInfo, UserProfile } from '../types/iris';
import type { ImageNotes } from './localLabels';
import type { LabelEntry } from './labelStorage';
import type { SiteConfig } from './staticBackend';

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
  canSignOut: boolean;
}

/** What the sign-in form offers */
export interface SignInOptions {
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
  /** Stable identity used to isolate this project's browser state */
  projectId(): string;
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
  /** Notes about a mask the user saved, null before the first save */
  loadNotes(imageId: string): Promise<ImageNotes | null>;
  saveNotes(imageId: string, notes: ImageNotes): Promise<void>;
  loadPreferences(allBands: string[]): Promise<Preferences>;
  savePreferences(config: UserConfig): Promise<void>;
  loadProfile(): Promise<Profile>;
  signOut(): Promise<void>;
  /** The user's masks as files */
  downloadMasks(onProgress?: (done: number, total: number) => void): Promise<{ bytes: Uint8Array; name: string } | null>;
  /** Write what is still waiting, before the page leaves */
  flush(): Promise<void>;
  /** The masks of all users, for the admins who review them; null for the others */
  review(): ReviewSource | null;
  /** The project file as written, for the admins who edit it */
  loadProjectFile(): Promise<{ config: Record<string, any>; location: string; savesTo: 'hub' | 'download' }>;
  /** Save the edited project: to its dataset on the Hub, else as a file to download */
  saveProjectFile(config: Record<string, any>): Promise<'hub' | 'download'>;
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

/** iris.json next to the page; throws an error that says what is wrong */
export const loadSiteConfig = async (): Promise<SiteConfig> => {
  const address = new URL('iris.json', window.location.href).href;
  let response: Response;
  try {
    response = await fetch(address, { cache: 'no-store' });
  } catch {
    throw new Error(`Could not read ${address}`);
  }
  if (!response.ok) throw new Error(`Could not read ${address} (${response.status}): IRIS needs it next to the page`);
  let site: SiteConfig;
  try {
    site = await response.json();
  } catch {
    throw new Error(`${address} is not a JSON file: IRIS needs iris.json next to the page, naming the project file`);
  }
  if (typeof site?.project !== 'string') throw new Error(`${address} has to name the project file in "project"`);
  return site;
};
