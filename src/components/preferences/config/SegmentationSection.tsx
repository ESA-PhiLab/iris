import { useState, useImperativeHandle, forwardRef } from 'react';
import { FormInput, FormRadioGroup, FormCheckbox } from './FormField';
import MaskAreaConfig from './MaskAreaConfig';
import AIModelConfig, { AIModelConfigData } from './AIModelConfig';
import { useConfigStyles } from './useConfigStyles';

const SegmentationSection = forwardRef<any, {}>((_props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const s = useConfigStyles();
  const [path, setPath] = useState('');
  const [maskEnum, setMaskEnum] = useState('rgb');
  const [maskAreaEnabled, setMaskAreaEnabled] = useState(false);
  const [maskAreaCoords, setMaskAreaCoords] = useState<number[]>([0, 0, 0, 0]);
  const [scoreEnum, setScoreEnum] = useState('f1');
  const [prioritiseUnmarked, setPrioritiseUnmarked] = useState(true);
  const [aiModelEnabled, setAiModelEnabled] = useState(true);
  const [aiConfig, setAiConfig] = useState<AIModelConfigData>({
    unverifiedThreshold: 1,
    aiModel: 'IrisSegAIModel*',
    bands: '',
    trainRatio: 0.8,
    maxTrainPixels: 20000,
    nEstimators: 20,
    maxDepth: 10,
    nLeaves: 10,
    suppressionThreshold: 0,
    suppressionFilterSize: 5,
    suppressionDefaultClass: 0,
    useEdgeFilter: false,
    useSuperpixels: false,
    useMeshgrid: false,
    meshgridCells: '3x3',
  });

  const getData = () => ({
    path,
    mask_encoding: maskEnum,
    mask_area: maskAreaEnabled ? maskAreaCoords : null,
    score: scoreEnum,
    prioritise_unmarked_images: prioritiseUnmarked,
    unverified_threshold: aiConfig.unverifiedThreshold,
    test_images: null,
    ai_model: aiModelEnabled
      ? {
          bands: aiConfig.bands.trim() ? aiConfig.bands : null,
          train_ratio: aiConfig.trainRatio,
          max_train_pixels: aiConfig.maxTrainPixels,
          n_estimators: aiConfig.nEstimators,
          max_depth: aiConfig.maxDepth,
          n_leaves: aiConfig.nLeaves,
          suppression_threshold: aiConfig.suppressionThreshold,
          suppression_filter_size: aiConfig.suppressionFilterSize,
          suppression_default_class: aiConfig.suppressionDefaultClass,
          use_edge_filter: aiConfig.useEdgeFilter,
          use_superpixels: aiConfig.useSuperpixels,
          use_meshgrid: aiConfig.useMeshgrid,
          meshgrid_cells: aiConfig.meshgridCells,
        }
      : false,
  });

  const setData = (data: any) => {
    if (!data || typeof data !== 'object') return;
    if (data.path !== undefined) setPath(data.path);
    if (data.mask_encoding !== undefined) setMaskEnum(data.mask_encoding);
    if (data.score !== undefined) setScoreEnum(data.score);
    if (data.prioritise_unmarked_images !== undefined) {
      setPrioritiseUnmarked(data.prioritise_unmarked_images);
    }
    if (data.mask_area !== undefined) {
      if (data.mask_area === null) {
        setMaskAreaEnabled(false);
        setMaskAreaCoords([0, 0, 0, 0]);
      } else if (Array.isArray(data.mask_area) && data.mask_area.length === 4) {
        setMaskAreaEnabled(true);
        setMaskAreaCoords(data.mask_area);
      }
    }
    if (data.ai_model !== undefined) {
      if (data.ai_model === false) {
        setAiModelEnabled(false);
      } else if (typeof data.ai_model === 'object' && data.ai_model !== null) {
        setAiModelEnabled(true);
        const m = data.ai_model;
        setAiConfig({
          unverifiedThreshold: data.unverified_threshold ?? 1,
          aiModel: 'IrisSegAIModel*',
          bands: m.bands !== null ? String(m.bands) : '',
          trainRatio: m.train_ratio ?? 0.8,
          maxTrainPixels: m.max_train_pixels ?? 20000,
          nEstimators: m.n_estimators ?? 20,
          maxDepth: m.max_depth ?? 10,
          nLeaves: m.n_leaves ?? 10,
          suppressionThreshold: m.suppression_threshold ?? 0,
          suppressionFilterSize: m.suppression_filter_size ?? 5,
          suppressionDefaultClass: m.suppression_default_class ?? 0,
          useEdgeFilter: m.use_edge_filter ?? false,
          useSuperpixels: m.use_superpixels ?? false,
          useMeshgrid: m.use_meshgrid ?? false,
          meshgridCells: m.meshgrid_cells ?? '3x3',
        });
      }
    }
  };

  useImperativeHandle(ref, () => ({ getData, setData }));

  return (
    <div style={{ marginBottom: '8px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...s.accordionStyle,
          ...(isOpen ? s.accordionOpenStyle : {}),
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = s.theme.panelHeaderBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = s.theme.bgTertiary;
        }}
      >
        <span>Segmentation</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={s.theme.gray500}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={s.panelStyle}>
          <FormInput
            label="Path"
            value={path}
            onChange={setPath}
            required
            description="This directory will contain the mask files from the segmentation. Four different mask formats are allowed: *.npy* *tif*, *png* or *jpeg*."
            codeExample={'"path": "masks/{id}.png"'}
          />
          <FormRadioGroup
            label="SegMaskEnum"
            options={['integer', 'binary', 'rgb', 'rgba']}
            value={maskEnum}
            onChange={setMaskEnum}
            description="Allowed encodings for final masks. Not all mask formats support all encodings."
          />
          <MaskAreaConfig
            maskAreaEnabled={maskAreaEnabled}
            setMaskAreaEnabled={setMaskAreaEnabled}
            maskAreaCoords={maskAreaCoords}
            setMaskAreaCoords={setMaskAreaCoords}
          />
          <FormRadioGroup
            label="SegScoreEnum"
            options={['f1', 'jaccard', 'accuracy']}
            value={scoreEnum}
            onChange={setScoreEnum}
            description="Allowed score measure."
          />
          <FormCheckbox
            label="Prioritise Unmarked Images"
            checked={prioritiseUnmarked}
            onChange={setPrioritiseUnmarked}
            description="Mode to serve up images with the lowest number of annotations when user asks for next image."
          />
          <div style={s.sectionBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={aiModelEnabled}
                onChange={(e) => setAiModelEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: s.theme.primary }}
              />
              <label
                style={{ cursor: 'pointer', fontWeight: 600, color: s.theme.gray900, fontSize: '14px' }}
                onClick={() => setAiModelEnabled(!aiModelEnabled)}
              >
                Enable AI Model
              </label>
            </div>
            <small style={{ display: 'block', color: s.theme.gray600, lineHeight: '1.5', fontSize: '12px' }}>
              {aiModelEnabled
                ? 'AI-assisted segmentation is enabled. Configure the model parameters below.'
                : 'AI-assisted segmentation is disabled. The ai_model field will be set to false.'}
            </small>
          </div>
          {aiModelEnabled && <AIModelConfig config={aiConfig} onChange={setAiConfig} />}
        </div>
      )}
    </div>
  );
});

SegmentationSection.displayName = 'SegmentationSection';
export default SegmentationSection;
