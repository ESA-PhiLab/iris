import { describe, expect, it } from 'vitest';
import { maskAreaBoundsError, validateProject } from './validate';

const validProject = () => ({
  images: { path: { S2: 'images/{id}.tif' } },
  classes: [
    { name: 'Clear', colour: [0, 0, 0, 0] },
    { name: 'Cloud', colour: [255, 255, 255, 255] },
  ],
  views: { RGB: { data: ['$S2.B3', '$S2.B2', '$S2.B1'] } },
  view_groups: { default: ['RGB'] },
  segmentation: {
    score: 'f1',
    unverified_threshold: 1,
    ai_model: {
      bands: ['$S2.B1'], train_ratio: 0.8, max_train_pixels: 20000,
      n_estimators: 20, max_depth: 10, n_leaves: 10,
      suppression_threshold: 25, suppression_filter_size: 5, suppression_default_class: 0,
      use_edge_filter: false, use_superpixels: false, use_meshgrid: true, meshgrid_cells: '3x2',
    },
  },
});

describe('validateProject', () => {
  it('accepts a complete browser project', () => {
    expect(validateProject(validProject())).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('rejects invalid AI values before they reach the worker', () => {
    const project = validProject();
    project.segmentation.ai_model.bands = '$S2.B1' as any;
    project.segmentation.ai_model.suppression_threshold = 120;
    project.segmentation.ai_model.suppression_filter_size = 4;
    const result = validateProject(project);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/bands/);
    expect(result.errors.join('\n')).toMatch(/percentage/);
    expect(result.errors.join('\n')).toMatch(/must be odd/);
  });

  it('rejects more classes than a byte mask can represent', () => {
    const project = validProject();
    project.classes = Array.from({ length: 257 }, (_, i) => ({ name: `Class ${i}`, colour: [0, 0, 0, 0] }));
    expect(validateProject(project).errors).toContain('At most 256 classes are supported');
  });

  it('returns useful errors instead of throwing for malformed JSON values', () => {
    const project = validProject() as any;
    project.images.path = { S2: 42 };
    project.images.ids = ['coast', 'coast'];
    project.classes = [1];
    project.view_groups.default = [1];
    project.segmentation = [];

    const result = validateProject(project);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Every images.path value must be a string',
      'images.ids cannot contain duplicates',
      'Class 0: must be an object',
      'View group default: view names must be strings',
      'segmentation must be an object',
    ]));
  });
});

describe('maskAreaBoundsError', () => {
  it('checks an area against the image dimensions', () => {
    expect(maskAreaBoundsError([0, 0, 100, 80], 100, 80)).toBeNull();
    expect(maskAreaBoundsError([0, 0, 101, 80], 100, 80)).toMatch(/outside/);
  });
});
