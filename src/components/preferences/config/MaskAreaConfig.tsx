import React from 'react';
import { useConfigStyles } from './useConfigStyles';

interface MaskAreaConfigProps {
  maskAreaEnabled: boolean;
  setMaskAreaEnabled: (enabled: boolean) => void;
  maskAreaCoords: number[];
  setMaskAreaCoords: (coords: number[]) => void;
}

const MaskAreaConfig: React.FC<MaskAreaConfigProps> = ({ maskAreaEnabled, setMaskAreaEnabled, maskAreaCoords, setMaskAreaCoords }) => {
  const s = useConfigStyles();

  const updateMaskCoord = (index: number, value: number) => {
    const newCoords = [...maskAreaCoords];
    newCoords[index] = value;
    setMaskAreaCoords(newCoords);
  };

  const coordLabels = ['X1 (left)', 'Y1 (top)', 'X2 (right)', 'Y2 (bottom)'];

  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={s.labelStyle}>Mask Area</label>
      <small style={s.descriptionStyle}>
        Limit the segmentation area to a specific region of the image. When disabled, users can label the entire image.
        When enabled, provide 4 coordinates: [x1, y1, x2, y2] defining the top-left and bottom-right corners.
        <br />Example: <code style={s.codeStyle}>[64, 64, 448, 448]</code>
      </small>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={maskAreaEnabled} onChange={(e) => setMaskAreaEnabled(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: s.theme.primary }} />
          <span style={{ marginLeft: '8px', color: s.theme.gray900, fontSize: '13px' }}>
            {maskAreaEnabled ? 'Enabled - Limit segmentation area' : 'Disabled - Allow full image segmentation'}
          </span>
        </label>
      </div>

      {maskAreaEnabled && (
        <div style={s.sectionBox}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontWeight: 600, color: s.theme.gray900, fontSize: '14px' }}>Coordinates (must be exactly 4 values)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {coordLabels.map((lbl, i) => (
              <div key={lbl}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: s.theme.gray900 }}>{lbl} *</label>
                <input type="number" value={maskAreaCoords[i] || 0} min="0"
                  onChange={(e) => updateMaskCoord(i, parseInt(e.target.value) || 0)} style={s.inputStyle} />
              </div>
            ))}
          </div>
          <small style={{ display: 'block', marginTop: '8px', color: s.theme.gray600, fontSize: '12px' }}>
            Coordinates define a rectangle: top-left corner (X1, Y1) to bottom-right corner (X2, Y2)
          </small>
        </div>
      )}
    </div>
  );
};

export default MaskAreaConfig;
