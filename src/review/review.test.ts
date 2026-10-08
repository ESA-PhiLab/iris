import { describe, it, expect } from 'vitest';
import { collectReview, scoreImage } from './review';
import type { ReviewSource } from '../services/backend';

const masks: Record<string, number[]> = {
  'alice|coast': [0, 1, 1, 0],
  'bob|coast': [0, 1, 0, 0],
  'carol|coast': [0, 1, 1, 1],
  'alice|mountains': [2, 2, 2, 2],
};

const source: ReviewSource = {
  list: async () => ({
    shared: true,
    entries: Object.keys(masks).map((key) => {
      const [user, imageId] = key.split('|');
      return { user, imageId, modified: '2026-10-01' };
    }),
  }),
  loadMask: async (user, imageId, length) => {
    const mask = masks[`${user}|${imageId}`];
    return mask && mask.length === length ? { mask: Uint8Array.from(mask), userMask: new Uint8Array(length) } : null;
  },
  loadNotes: async (user) => ({ difficulty: user === 'bob' ? 5 : 2, notes: '', complete: user !== 'carol' }),
};

describe('review', () => {
  it('lists who annotated each image', async () => {
    const { images } = await collectReview(source, ['coast', 'mountains', 'empty'], 1);
    expect(images.map((image) => [image.imageId, image.annotations.map((a) => a.user), image.unverified])).toEqual([
      ['coast', ['alice', 'bob', 'carol'], false],
      ['mountains', ['alice'], true],
      ['empty', [], true],
    ]);
    expect(images[0].annotations[1].notes).toEqual({ difficulty: 5, notes: '', complete: true });
  });

  it('scores each user against the merged mask', async () => {
    const { images } = await collectReview(source, ['coast'], 1);
    const { merged, scores } = await scoreImage(source, images[0], 4, 'accuracy');
    expect(Array.from(merged!)).toEqual([0, 1, 1, 0]);
    expect(scores).toEqual({ alice: 100, bob: 75, carol: 75 });
  });
});
