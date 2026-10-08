/**
 * Masks, AI predictions and notes of the current user, kept by the server
 *
 * A mask travels as bytes: 254, the class of each pixel, whether the user drew
 * each pixel (1) or the AI predicted it (0), 254.
 */

const SEGMENTATION = '/segmentation/';
const MAGIC = 254;

export interface UserMask {
  mask: Uint8Array;
  userMask: Uint8Array;
}

export interface ActionInfo {
  id: number;
  difficulty: number;
  notes: string;
  complete: boolean;
}

export const encodeMask = ({ mask, userMask }: UserMask): Uint8Array<ArrayBuffer> => {
  const data = new Uint8Array(2 * mask.length + 2);
  data[0] = MAGIC;
  data.set(mask, 1);
  data.set(userMask, mask.length + 1);
  data[data.length - 1] = MAGIC;
  return data;
};

export const decodeMask = (data: Uint8Array, length: number): UserMask => {
  if (data.length !== 2 * length + 2 || data[0] !== MAGIC || data[data.length - 1] !== MAGIC) {
    throw new Error('The mask from the server does not have the size of the mask area');
  }
  return {
    mask: data.slice(1, length + 1),
    userMask: data.slice(length + 1, 2 * length + 1),
  };
};

const failure = async (response: Response, what: string) => {
  const text = await response.text().catch(() => '');
  return new Error(`Could not ${what} (${response.status}${text ? `: ${text}` : ''})`);
};

/** The user's mask of an image, or null if there is none yet */
export const fetchMask = async (imageId: string, length: number): Promise<UserMask | null> => {
  const response = await fetch(`${SEGMENTATION}load_mask/${encodeURIComponent(imageId)}`, {
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw await failure(response, 'load the mask');
  return decodeMask(new Uint8Array(await response.arrayBuffer()), length);
};

export const saveMask = async (imageId: string, mask: UserMask) => {
  const response = await fetch(`${SEGMENTATION}save_mask/${encodeURIComponent(imageId)}`, {
    method: 'POST',
    body: encodeMask(mask),
    headers: { 'Content-Type': 'application/octet-stream' },
    credentials: 'same-origin',
  });
  if (!response.ok) throw await failure(response, 'save the mask');
};

/** Save while the page closes, when fetch may be cancelled */
export const saveMaskOnUnload = (imageId: string, mask: UserMask) =>
  navigator.sendBeacon(
    `${SEGMENTATION}save_mask/${encodeURIComponent(imageId)}`,
    new Blob([encodeMask(mask)], { type: 'application/octet-stream' })
  );

/** Class of every pixel of the mask area, predicted from the training pixels */
export const requestPrediction = async (
  imageId: string,
  pixels: number[],
  labels: number[],
  length: number
): Promise<Uint8Array> => {
  const response = await fetch(`${SEGMENTATION}predict_mask/${encodeURIComponent(imageId)}`, {
    method: 'POST',
    body: JSON.stringify({ user_pixels: pixels, user_labels: labels }),
    credentials: 'same-origin',
  });
  if (!response.ok) throw await failure(response, 'predict the mask');
  const predictions = new Uint8Array(await response.arrayBuffer());
  if (predictions.length !== length) {
    throw new Error('The prediction does not have the size of the mask area');
  }
  return predictions;
};

/** The notes of the user about an image, null if the user has not saved a mask */
export const fetchActionInfo = async (imageId: string): Promise<ActionInfo | null> => {
  const response = await fetch(`/get_action_info/${encodeURIComponent(imageId)}/segmentation`, {
    credentials: 'same-origin',
  });
  if (!response.ok) return null;
  return response.json();
};

export const saveActionInfo = async (
  actionId: number,
  info: Pick<ActionInfo, 'difficulty' | 'notes' | 'complete'>
) => {
  const response = await fetch(`/set_action_info/${actionId}`, {
    method: 'POST',
    body: JSON.stringify(info),
    credentials: 'same-origin',
  });
  if (!response.ok) throw await failure(response, 'save the notes');
};
