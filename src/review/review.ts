/**
 * Review the masks of all users without a server
 *
 * Which users annotated each image, their notes, and how well each mask
 * agrees with the others: the masks of an image are merged by majority and
 * every user is scored like the IRIS server scored them.
 */

import type { ReviewSource, UserMask } from '../services/backend';
import type { ImageNotes } from '../services/localLabels';
import { ScoreKind, mergeMasks, userScores } from '../segmentation/merge';

export interface Annotation {
  user: string;
  modified: string;
  notes: ImageNotes | null;
  /** Agreement with the others, in percent, once computed */
  score?: number;
}

export interface ImageReview {
  imageId: string;
  annotations: Annotation[];
  /** Fewer annotations than the threshold leave the scores unverified */
  unverified: boolean;
}

/** Who annotated each image, with their notes */
export const collectReview = async (
  source: ReviewSource,
  imageIds: string[],
  unverifiedThreshold = 1
): Promise<{ images: ImageReview[]; shared: boolean }> => {
  const { entries, shared } = await source.list();
  const byImage = new Map<string, Annotation[]>(imageIds.map((id) => [id, []]));
  await Promise.all(entries.map(async (entry) => {
    const notes = await source.loadNotes(entry.user, entry.imageId).catch(() => null);
    if (!byImage.has(entry.imageId)) byImage.set(entry.imageId, []);
    byImage.get(entry.imageId)!.push({ user: entry.user, modified: entry.modified, notes });
  }));
  const images = [...byImage.entries()].map(([imageId, annotations]) => ({
    imageId,
    annotations: annotations.sort((a, b) => a.user.localeCompare(b.user)),
    unverified: annotations.length <= unverifiedThreshold,
  }));
  return { images, shared };
};

/** The masks of the users of an image, those of the right size */
export const loadMasks = async (
  source: ReviewSource,
  review: ImageReview,
  length: number
): Promise<Array<{ user: string; mask: UserMask }>> => {
  const masks = await Promise.all(review.annotations.map(async ({ user }) => ({
    user,
    mask: await source.loadMask(user, review.imageId, length),
  })));
  return masks.filter((entry): entry is { user: string; mask: UserMask } => !!entry.mask);
};

/** Merge the masks of an image and score each user */
export const scoreImage = async (
  source: ReviewSource,
  review: ImageReview,
  length: number,
  kind: ScoreKind
): Promise<{ merged: Uint8Array | null; scores: Record<string, number> }> => {
  const masks = await loadMasks(source, review, length);
  if (!masks.length) return { merged: null, scores: {} };
  const merged = mergeMasks(masks.map(({ mask }) => mask.mask));
  const scores = userScores(masks.map(({ mask }) => mask.mask), merged, kind);
  return { merged, scores: Object.fromEntries(masks.map(({ user }, i) => [user, scores[i]])) };
};
