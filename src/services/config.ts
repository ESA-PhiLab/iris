/**
 * Configuration API Service
 * 
 * Handles communication with the backend for project configuration management.
 */

const API_BASE_URL = '/api/config';

export interface ProjectConfig {
  name: string;
  host?: string;
  port?: number;
  images: {
    path: string | Record<string, string>;
    shape: [number, number];
    thumbnails?: string | false;
    metadata?: string | false;
  };
  classes: Array<{
    name: string;
    colour: [number, number, number, number];
    description?: string;
    user_colour?: [number, number, number, number];
  }>;
  views: Record<string, {
    type: 'image' | 'bingmap';
    description?: string;
    data?: string | string[];
    cmap?: string;
    clip?: number;
    vmin?: number;
    vmax?: number;
  }>;
  view_groups: Record<string, string[]>;
  segmentation: {
    path: string;
    mask_encoding?: string;
    mask_area?: [number, number, number, number] | null;
    score?: string;
    prioritise_unmarked_images?: boolean;
    unverified_threshold?: number;
    test_images?: string[] | null;
    ai_model: AIModelConfig | false;
  };
  chat?: {
    enabled: boolean;
    github_repo: string;
    utterances_theme: string;
  };
}

export interface AIModelConfig {
  bands: number[] | null;
  train_ratio: number;
  max_train_pixels: number;
  n_estimators: number;
  max_depth: number;
  n_leaves: number;
  suppression_threshold: number;
  suppression_filter_size: number;
  suppression_default_class: number;
  use_edge_filter: boolean;
  use_superpixels: boolean;
  use_meshgrid: boolean;
  meshgrid_cells: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Get the current project configuration
 */
export async function getProjectConfig(): Promise<{ config: ProjectConfig; config_file: string }> {
  const response = await fetch(`${API_BASE_URL}/project`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin', // Include cookies for Flask session auth
  });
  
  if (!response.ok) {
    // Check if response is JSON or HTML
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      // Check for JWT token issues
      if (response.status === 422 && error.message && error.message.includes('segment')) {
        throw new Error('Invalid authentication token. Please logout and login again.');
      }
      throw new Error(error.message || 'Failed to fetch project configuration');
    } else {
      // Got HTML instead of JSON - likely 404 or server error
      throw new Error(`API endpoint not found (${response.status}). Please restart the server.`);
    }
  }
  
  return response.json();
}

/**
 * Update the project configuration
 */
export async function updateProjectConfig(config: ProjectConfig): Promise<{ message: string; config_file: string }> {
  const response = await fetch(`${API_BASE_URL}/project`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin', // Include cookies for Flask session auth
    body: JSON.stringify(config),
  });
  
  if (!response.ok) {
    // Check if response is JSON or HTML
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update project configuration');
    } else {
      throw new Error(`API endpoint not found (${response.status}). Please restart the server.`);
    }
  }
  
  return response.json();
}

/**
 * Validate a project configuration without saving
 */
export async function validateProjectConfig(config: ProjectConfig): Promise<ValidationResult> {
  const response = await fetch(`${API_BASE_URL}/project/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin', // Include cookies for Flask session auth
    body: JSON.stringify(config),
  });
  
  if (!response.ok) {
    // Check if response is JSON or HTML
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate configuration');
    } else {
      throw new Error(`API endpoint not found (${response.status}). Please restart the server.`);
    }
  }
  
  return response.json();
}
