/**
 * Check a project file before saving it
 *
 * Errors make the project unusable, warnings are likely mistakes.
 */

import { parseExpression } from '../raster/expression';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Error when a configured mask area lies outside a particular image */
export const maskAreaBoundsError = (
  area: [number, number, number, number], width: number, height: number
) => area[0] < 0 || area[1] < 0 || area[2] > width || area[3] > height
  ? `segmentation.mask_area [${area.join(', ')}] is outside the ${width}x${height} image`
  : null;

const isColour = (colour: unknown) =>
  Array.isArray(colour) && colour.length === 4
  && colour.every((value) => Number.isInteger(value) && value >= 0 && value <= 255);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const requireInteger = (
  errors: string[], value: unknown, path: string, { min, max }: { min?: number; max?: number } = {}
) => {
  if (!Number.isInteger(value) || (min !== undefined && (value as number) < min)
    || (max !== undefined && (value as number) > max)) {
    const range = min !== undefined && max !== undefined ? ` from ${min} to ${max}`
      : min !== undefined ? ` of at least ${min}` : max !== undefined ? ` of at most ${max}` : '';
    errors.push(`${path} must be an integer${range}`);
  }
};

export const validateProject = (config: Record<string, any>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of ['images', 'classes', 'views']) {
    if (!(field in config)) errors.push(`Missing required field: ${field}`);
  }

  const path = config.images?.path;
  if ('images' in config && (!config.images || typeof config.images !== 'object' || Array.isArray(config.images))) {
    errors.push('images must be an object');
  } else if (config.images && !path) {
    errors.push('images.path is required');
  }
  if (path !== undefined && typeof path !== 'string'
    && (!path || typeof path !== 'object' || Array.isArray(path))) {
    errors.push('images.path must be a string or an object of named paths');
  }
  const paths: unknown[] = typeof path === 'string' ? [path]
    : path && typeof path === 'object' && !Array.isArray(path) ? Object.values(path) : [];
  for (const file of paths) {
    if (typeof file !== 'string') errors.push('Every images.path value must be a string');
    else if (!file.includes('{id}')) warnings.push('images.path should contain {id} placeholder');
    else if (!/\.tiff?$/i.test(file.split(/[?#]/)[0])) errors.push(`images.path must point to COG files (.tif): ${file}`);
  }
  if (config.images?.ids !== undefined) {
    if (!Array.isArray(config.images.ids) || !config.images.ids.length
      || config.images.ids.some((id: unknown) => typeof id !== 'string' || !id)) {
      errors.push('images.ids must be a non-empty array of strings');
    } else if (new Set(config.images.ids).size !== config.images.ids.length) {
      errors.push('images.ids cannot contain duplicates');
    } else if (config.images.ids.some((id: string) => id.includes('\\')
      || id.split('/').some((part: string) => part === '.' || part === '..'))) {
      errors.push('images.ids cannot contain unsafe path segments');
    }
  }
  if (config.images?.list !== undefined && typeof config.images.list !== 'string') {
    errors.push('images.list must be a string');
  }

  if ('classes' in config) {
    if (!Array.isArray(config.classes)) {
      errors.push('classes must be an array');
    } else {
      if (!config.classes.length) errors.push('At least one class is required');
      if (config.classes.length > 256) errors.push('At most 256 classes are supported');
      const names = new Set<string>();
      config.classes.forEach((klass: any, i: number) => {
        if (!klass || typeof klass !== 'object' || Array.isArray(klass)) {
          errors.push(`Class ${i}: must be an object`);
          return;
        }
        if (typeof klass.name !== 'string' || !klass.name.trim()) errors.push(`Class ${i}: name is required`);
        else if (names.has(klass.name)) errors.push(`Class ${i}: name "${klass.name}" is duplicated`);
        else names.add(klass.name);
        if (!('colour' in klass)) errors.push(`Class ${i}: colour is required`);
        else if (!isColour(klass.colour)) errors.push(`Class ${i}: colour must be 4 integers from 0 to 255 (RGBA)`);
        if ('user_colour' in klass && !isColour(klass.user_colour)) {
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
        } else if (typeof view.data !== 'string'
          && (!Array.isArray(view.data) || view.data.some((expression: unknown) => typeof expression !== 'string'))) {
          errors.push(`View ${name}: data must contain band expressions as strings`);
        } else {
          const expressions = Array.isArray(view.data) ? view.data : [view.data];
          for (const expression of expressions) {
            try {
              parseExpression(expression);
            } catch (error) {
              errors.push(`View ${name}: invalid expression: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        }
        if (view.clip !== undefined && view.clip !== null && (!isFiniteNumber(view.clip) || view.clip < 0 || view.clip >= 50)) {
          errors.push(`View ${name}: clip must be a number from 0 up to (but not including) 50`);
        }
        if (view.vmin !== undefined && view.vmin !== null && !isFiniteNumber(view.vmin)) {
          errors.push(`View ${name}: vmin must be a number`);
        }
        if (view.vmax !== undefined && view.vmax !== null && !isFiniteNumber(view.vmax)) {
          errors.push(`View ${name}: vmax must be a number`);
        }
        if (view.clip != null && (view.vmin != null || view.vmax != null)) {
          errors.push(`View ${name}: clip cannot be combined with vmin or vmax`);
        }
        if (isFiniteNumber(view.vmin) && isFiniteNumber(view.vmax) && view.vmin >= view.vmax) {
          errors.push(`View ${name}: vmin must be less than vmax`);
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
          if (typeof view !== 'string') {
            errors.push(`View group ${name}: view names must be strings`);
          } else if (views && typeof views === 'object' && !Array.isArray(views) && !(view in views)) {
            errors.push(`View group ${name}: references non-existent view "${view}"`);
          }
        }
      }
    }
  }

  const rawSegmentation = config.segmentation;
  if (rawSegmentation !== undefined
    && (!rawSegmentation || typeof rawSegmentation !== 'object' || Array.isArray(rawSegmentation))) {
    errors.push('segmentation must be an object');
  }
  const segmentation = rawSegmentation && typeof rawSegmentation === 'object' && !Array.isArray(rawSegmentation)
    ? rawSegmentation : {};
  const area = segmentation.mask_area;
  if (area !== undefined && area !== null
    && !(Array.isArray(area) && area.length === 4 && area.every(Number.isInteger))) {
    errors.push('segmentation.mask_area must be an array of 4 integers or null');
  } else if (Array.isArray(area) && (area[2] <= area[0] || area[3] <= area[1])) {
    errors.push('segmentation.mask_area must be [x0, y0, x1, y1] with x1 > x0 and y1 > y0');
  } else if (Array.isArray(area) && area.some((value) => value < 0)) {
    errors.push('segmentation.mask_area coordinates cannot be negative');
  }
  if (segmentation.ai_model !== undefined && segmentation.ai_model !== false
    && (typeof segmentation.ai_model !== 'object' || segmentation.ai_model === null
      || Array.isArray(segmentation.ai_model))) {
    errors.push('segmentation.ai_model must be an object or false');
  }
  if (segmentation.score && !['f1', 'jaccard', 'accuracy'].includes(segmentation.score)) {
    errors.push('segmentation.score must be f1, jaccard or accuracy');
  }
  if (segmentation.unverified_threshold !== undefined) {
    requireInteger(errors, segmentation.unverified_threshold, 'segmentation.unverified_threshold', { min: 0 });
  }

  const model = segmentation.ai_model;
  if (model && typeof model === 'object' && !Array.isArray(model)) {
    if (model.bands !== undefined && model.bands !== null
      && (!Array.isArray(model.bands) || !model.bands.length
        || model.bands.some((band: unknown) => typeof band !== 'string' || !band.trim()))) {
      errors.push('segmentation.ai_model.bands must be a non-empty array of strings or null');
    } else if (Array.isArray(model.bands)) {
      for (const band of model.bands) {
        try {
          if (parseExpression(band).type !== 'band') {
            errors.push(`segmentation.ai_model.bands must contain bands, not expressions: ${band}`);
          }
        } catch (error) {
          errors.push(`segmentation.ai_model.bands contains an invalid band "${band}": ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    if (model.train_ratio !== undefined
      && (!isFiniteNumber(model.train_ratio) || model.train_ratio <= 0 || model.train_ratio > 1)) {
      errors.push('segmentation.ai_model.train_ratio must be greater than 0 and at most 1');
    }
    for (const field of ['max_train_pixels', 'n_estimators', 'n_leaves'] as const) {
      if (model[field] !== undefined) requireInteger(errors, model[field], `segmentation.ai_model.${field}`, { min: 1 });
    }
    if (model.max_depth !== undefined && model.max_depth !== -1) {
      requireInteger(errors, model.max_depth, 'segmentation.ai_model.max_depth', { min: 1 });
    }
    if (model.suppression_threshold !== undefined
      && (!isFiniteNumber(model.suppression_threshold)
        || model.suppression_threshold < 0 || model.suppression_threshold > 100)) {
      errors.push('segmentation.ai_model.suppression_threshold must be a percentage from 0 to 100');
    }
    if (model.suppression_filter_size !== undefined) {
      requireInteger(errors, model.suppression_filter_size, 'segmentation.ai_model.suppression_filter_size', { min: 1 });
      if (Number.isInteger(model.suppression_filter_size) && model.suppression_filter_size % 2 === 0) {
        errors.push('segmentation.ai_model.suppression_filter_size must be odd');
      }
    }
    if (model.suppression_default_class !== undefined) {
      requireInteger(errors, model.suppression_default_class, 'segmentation.ai_model.suppression_default_class', {
        min: 0, max: Math.max(0, (Array.isArray(config.classes) ? config.classes.length : 1) - 1),
      });
    }
    for (const field of ['use_edge_filter', 'use_superpixels', 'use_meshgrid'] as const) {
      if (model[field] !== undefined && typeof model[field] !== 'boolean') {
        errors.push(`segmentation.ai_model.${field} must be true or false`);
      }
    }
    if (model.meshgrid_cells !== undefined && model.meshgrid_cells !== 'pixelwise'
      && !/^[1-9]\d*x[1-9]\d*$/.test(model.meshgrid_cells)) {
      errors.push('segmentation.ai_model.meshgrid_cells must be <columns>x<rows> or pixelwise');
    }
  }

  return { valid: !errors.length, errors, warnings };
};
