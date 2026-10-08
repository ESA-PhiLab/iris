/**
 * Check a project file before saving it
 *
 * Errors make the project unusable, warnings are likely mistakes.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const isColour = (colour: unknown) =>
  Array.isArray(colour) && colour.length === 4
  && colour.every((value) => Number.isInteger(value) && value >= 0 && value <= 255);

export const validateProject = (config: Record<string, any>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of ['images', 'classes', 'views']) {
    if (!(field in config)) errors.push(`Missing required field: ${field}`);
  }

  const path = config.images?.path;
  if (config.images && !path) errors.push('images.path is required');
  const paths: string[] = typeof path === 'string' ? [path] : path && typeof path === 'object' ? Object.values(path) : [];
  for (const file of paths) {
    if (typeof file !== 'string' || !file.includes('{id}')) warnings.push('images.path should contain {id} placeholder');
    else if (!/\.tiff?$/i.test(file)) errors.push(`images.path must point to COG files (.tif): ${file}`);
  }

  if ('classes' in config) {
    if (!Array.isArray(config.classes)) {
      errors.push('classes must be an array');
    } else {
      if (!config.classes.length) errors.push('At least one class is required');
      config.classes.forEach((klass: any, i: number) => {
        if (!klass?.name) errors.push(`Class ${i}: name is required`);
        if (!('colour' in (klass ?? {}))) errors.push(`Class ${i}: colour is required`);
        else if (!isColour(klass.colour)) errors.push(`Class ${i}: colour must be 4 integers from 0 to 255 (RGBA)`);
        if ('user_colour' in (klass ?? {}) && !isColour(klass.user_colour)) {
          errors.push(`Class ${i}: user_colour must be 4 integers from 0 to 255 (RGBA)`);
        }
      });
    }
  }

  const views = config.views;
  if ('views' in config) {
    if (!views || typeof views !== 'object' || Array.isArray(views)) {
      errors.push('views must be an object');
    } else {
      if (!Object.keys(views).length) errors.push('At least one view is required');
      for (const [name, view] of Object.entries<any>(views)) {
        if (view?.type && view.type !== 'image') errors.push(`View ${name}: type must be "image"`);
        if (!view?.data || (Array.isArray(view.data) && !view.data.length)) {
          errors.push(`View ${name}: data is required`);
        } else if (Array.isArray(view.data) && ![1, 3, 4].includes(view.data.length)) {
          errors.push(`View ${name}: data needs one, three or four expressions`);
        }
      }
    }
  }

  const groups = config.view_groups;
  if (groups !== undefined) {
    if (!groups || typeof groups !== 'object' || Array.isArray(groups)) {
      errors.push('view_groups must be an object');
    } else {
      if (!groups.default) warnings.push('view_groups should have a group "default"');
      for (const [name, group] of Object.entries<any>(groups)) {
        if (!Array.isArray(group)) {
          errors.push(`View group ${name}: must be an array of view names`);
          continue;
        }
        for (const view of group) {
          if (views && !(view in views)) errors.push(`View group ${name}: references non-existent view "${view}"`);
        }
      }
    }
  }

  const segmentation = config.segmentation ?? {};
  const area = segmentation.mask_area;
  if (area !== undefined && area !== null
    && !(Array.isArray(area) && area.length === 4 && area.every(Number.isInteger))) {
    errors.push('segmentation.mask_area must be an array of 4 integers or null');
  } else if (Array.isArray(area) && (area[2] <= area[0] || area[3] <= area[1])) {
    errors.push('segmentation.mask_area must be [x0, y0, x1, y1] with x1 > x0 and y1 > y0');
  }
  if (segmentation.ai_model !== undefined && segmentation.ai_model !== false
    && (typeof segmentation.ai_model !== 'object' || segmentation.ai_model === null)) {
    errors.push('segmentation.ai_model must be an object or false');
  }
  if (segmentation.score && !['f1', 'jaccard', 'accuracy'].includes(segmentation.score)) {
    errors.push('segmentation.score must be f1, jaccard or accuracy');
  }

  return { valid: !errors.length, errors, warnings };
};
