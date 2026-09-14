import React from 'react';
import { FormInput, FormSlider, FormCheckbox, FormSelect } from './FormField';

export interface AIModelConfigData {
  unverifiedThreshold: number;
  aiModel: string;
  bands: string;
  trainRatio: number;
  maxTrainPixels: number;
  nEstimators: number;
  maxDepth: number;
  nLeaves: number;
  suppressionThreshold: number;
  suppressionFilterSize: number;
  suppressionDefaultClass: number;
  useEdgeFilter: boolean;
  useSuperpixels: boolean;
  useMeshgrid: boolean;
  meshgridCells: string;
}

interface AIModelConfigProps {
  config: AIModelConfigData;
  onChange: (config: AIModelConfigData) => void;
}

const AIModelConfig: React.FC<AIModelConfigProps> = ({ config, onChange }) => {
  const updateField = <K extends keyof AIModelConfigData>(field: K, value: AIModelConfigData[K]) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <>
      <FormInput
        label="Unverified Threshold"
        value={config.unverifiedThreshold}
        onChange={(value) => updateField('unverifiedThreshold', parseInt(value) || 0)}
        type="number"
        description="TODO Number of unverified users contributing masks above which to tag an image 'unverified'."
      />

      <FormSelect
        label="AI Model *"
        options={['IrisSegAIModel*']}
        value={config.aiModel}
        onChange={(value) => updateField('aiModel', value)}
        required
      />

      <FormInput
        label="Bands"
        value={config.bands}
        onChange={(value) => updateField('bands', value)}
        type="text"
        required
      />

      <FormSlider
        label="Train Ratio"
        value={config.trainRatio}
        onChange={(value) => updateField('trainRatio', value)}
        min={0}
        max={1}
        step={0.01}
      />

      <FormSlider
        label="Max Train Pixels"
        value={config.maxTrainPixels}
        onChange={(value) => updateField('maxTrainPixels', value)}
        min={0}
        max={100000}
        step={1000}
      />

      <FormSlider
        label="N Estimators"
        value={config.nEstimators}
        onChange={(value) => updateField('nEstimators', value)}
        min={1}
        max={200}
        step={1}
      />

      <FormSlider
        label="Max Depth"
        value={config.maxDepth}
        onChange={(value) => updateField('maxDepth', value)}
        min={1}
        max={100}
        step={1}
      />

      <FormSlider
        label="N Leaves"
        value={config.nLeaves}
        onChange={(value) => updateField('nLeaves', value)}
        min={1}
        max={100}
        step={1}
      />

      <FormSlider
        label="Suppression Threshold"
        value={config.suppressionThreshold}
        onChange={(value) => updateField('suppressionThreshold', value)}
        min={0}
        max={100}
        step={1}
      />

      <FormInput
        label="Suppression Filter Size"
        value={config.suppressionFilterSize}
        onChange={(value) => updateField('suppressionFilterSize', parseInt(value) || 5)}
        type="number"
      />

      <FormInput
        label="Suppression Default Class"
        value={config.suppressionDefaultClass}
        onChange={(value) => updateField('suppressionDefaultClass', parseInt(value) || 0)}
        type="number"
      />

      <FormCheckbox
        label="Use Edge Filter"
        checked={config.useEdgeFilter}
        onChange={(value) => updateField('useEdgeFilter', value)}
      />

      <FormCheckbox
        label="Use Superpixels"
        checked={config.useSuperpixels}
        onChange={(value) => updateField('useSuperpixels', value)}
      />

      <FormCheckbox
        label="Use Meshgrid"
        checked={config.useMeshgrid}
        onChange={(value) => updateField('useMeshgrid', value)}
      />

      <FormInput
        label="Meshgrid Cells"
        value={config.meshgridCells}
        onChange={(value) => updateField('meshgridCells', value)}
        type="text"
      />
    </>
  );
};

export default AIModelConfig;
