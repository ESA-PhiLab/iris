// IRIS Type Definitions

// Preferences/Config Types
export interface AIModelConfig {
  n_estimators: number;
  max_depth: number;
  n_leaves: number;
  train_ratio: number;
  max_train_pixels: number;
  use_edge_filter: boolean;
  use_meshgrid: boolean;
  meshgrid_cells: string;
  use_superpixels: boolean;
  /** Bands used by the model; preferences resolve all bands explicitly */
  bands: string[];
  suppression_filter_size: number;
  suppression_threshold: number;
  suppression_default_class: number;
}

export interface ClassConfig {
  name: string;
  colour: [number, number, number, number]; // RGBA tuple
  css_colour?: string; // Optional CSS color string (computed)
  description?: string;
  user_colour?: [number, number, number, number]; // Optional user-specific color
}

export interface ProjectImagesConfig {
  path: Record<string, string>;
  ids?: string[];
  list?: string;
  thumbnails?: string | false;
  metadata?: string | false;
}

export interface ProjectViewConfig {
  name?: string;
  type?: 'image';
  description?: string;
  data: string | string[];
  cmap?: string;
  clip?: number | null;
  vmin?: number | null;
  vmax?: number | null;
}

export interface ProjectAIModelConfig extends Omit<AIModelConfig, 'bands'> {
  /** Null in a project file means every band */
  bands: string[] | null;
}

export interface ProjectConfig {
  name: string;
  images: ProjectImagesConfig;
  classes: ClassConfig[];
  views: Record<string, ProjectViewConfig>;
  view_groups: Record<string, string[]>;
  segmentation: {
    mask_area?: [number, number, number, number] | null;
    score: 'f1' | 'jaccard' | 'accuracy';
    unverified_threshold: number;
    ai_model: ProjectAIModelConfig | false;
  };
}

export interface UserInfo {
  id: number;
  name: string;
  admin: boolean;
  tested: boolean;
  created: string;
  image_seed: number;
  segmentation: {
    score: number;
    score_unverified: number;
    n_masks: number;
    rank?: number;
    last_masks?: SegmentationMask[];
  };
  config?: any; // Project configuration (only available for current user or admin)
}

export interface ConfusionMatrix {
  matrix: number[][]; // 2D array [actual_class][predicted_class]
  classCount: number;
  totalSamples: number;
  accuracyStats: {
    overall: number; // Overall accuracy (acc_prod / acc_sum)
    perClass: number[]; // Per-class accuracy (tp[class] / test_n_samples[class])
    worstClass: number | null; // Class with lowest accuracy
    worstAccuracy: number; // Lowest accuracy value
    truePositives: { [classId: number]: number }; // tp values from legacy code
  };
  timestamp: Date;
  classes: string[]; // Class names for display
}

export interface UserConfig {
  segmentation: {
    ai_model: AIModelConfig;
  };
  classes: ClassConfig[];
}

// User Profile Types
export interface SegmentationMask {
  image_id: string;
  score: number;
  score_unverified: boolean;
  last_modification: string;
  time_spent: string;
}

// User Pixel Counts Interface (replaces vars.n_user_pixels)
export interface UserPixelCounts {
  total: number;
  [classId: number]: number; // Per-class pixel counts
}

// AI Training Validation Result
export interface AITrainingValidation {
  isValid: boolean;
  classesWithEnoughPixels: number;
  totalPixels: number;
  classPixelCounts: { [classId: number]: number };
  minPixelsRequired: number;
  minClassesRequired: number;
}

export interface UserProfile {
  id: number;
  name: string;
  email?: string; // Optional for backward compatibility
  admin: boolean;
  tested: boolean;
  created: string;
  image_seed: number;
  segmentation: {
    rank: number | null;
    score: number;
    score_unverified: number;
    n_masks: number;
    last_masks: SegmentationMask[];
  };
  is_current_user: boolean;
}
