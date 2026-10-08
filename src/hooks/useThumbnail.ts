import { useEffect, useState } from 'react';
import { chosenBackend } from '../services/backend';

/** Address of the thumbnail of an image, null while unknown or when there is none */
export const useThumbnail = (imageId: string | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    const source = chosenBackend();
    if (!source || !imageId) return;
    let cancelled = false;
    source.thumbnailUrl(imageId)
      .then((found) => { if (!cancelled) setUrl(found); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [imageId]);
  return url;
};
