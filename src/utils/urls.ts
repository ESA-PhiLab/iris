/** Address of the segmentation page of an image */
export const segmentationUrl = (imageId: string) =>
  `/segmentation/?image_id=${encodeURIComponent(imageId)}`;
