/**
 * Settings of the current user, kept by the server
 */

import type { AIModelConfig } from '../types/iris';

/** The AI settings of the user, which take precedence over the project's */
export const fetchAiModel = async (projectModel: Partial<AIModelConfig>): Promise<Partial<AIModelConfig>> => {
  try {
    const response = await fetch('/segmentation/api/user-config', { credentials: 'same-origin' });
    if (!response.ok) return projectModel;
    const { config } = await response.json();
    return { ...projectModel, ...config?.segmentation?.ai_model };
  } catch {
    return projectModel;
  }
};
