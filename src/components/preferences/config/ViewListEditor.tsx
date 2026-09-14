import { useState, useImperativeHandle, forwardRef } from 'react';
import { useConfigStyles } from './useConfigStyles';

interface ViewEntry {
  id: number; key: string; type: string; description: string;
  data: string; dataR: string; dataG: string; dataB: string;
  cmap: string; clip: string; vmin: string; vmax: string;
}

const ViewListEditor = forwardRef<any, {}>((_props, ref) => {
  const [views, setViews] = useState<ViewEntry[]>([]);
  const [nextId, setNextId] = useState(1);
  const s = useConfigStyles();

  const mapViewType = (uiType: string): string => {
    switch (uiType) { case 'Monochrome': case 'RGB': return 'image'; case 'Bing Map': return 'bingmap'; default: return 'image'; }
  };

  const getData = () => views.reduce((acc, view) => {
    const d: any = { type: mapViewType(view.type) };
    if (view.description.trim()) d.description = view.description;
    if (view.type === 'RGB') d.data = [view.dataR, view.dataG, view.dataB];
    else if (view.type === 'Monochrome') d.data = view.data;
    if (view.cmap.trim()) d.cmap = view.cmap;
    if (view.clip.trim()) d.clip = parseFloat(view.clip) || view.clip;
    if (view.vmin.trim()) d.vmin = parseFloat(view.vmin);
    if (view.vmax.trim()) d.vmax = parseFloat(view.vmax);
    acc[view.key] = d;
    return acc;
  }, {} as Record<string, any>);

  const setData = (data: Record<string, any>) => {
    if (typeof data !== 'object' || data === null) return;
    const loaded = Object.entries(data).map(([key, v], i) => {
      let uiType = 'Monochrome';
      if (v.type === 'bingmap') uiType = 'Bing Map';
      else if (Array.isArray(v.data) && v.data.length === 3) uiType = 'RGB';
      let mono = '';
      if (typeof v.data === 'string') mono = v.data;
      else if (Array.isArray(v.data) && v.data.length === 1) mono = v.data[0] || '';
      return {
        id: i + 1, key, type: uiType, description: v.description || '', data: mono,
        dataR: Array.isArray(v.data) && v.data.length === 3 ? v.data[0] || '' : '',
        dataG: Array.isArray(v.data) && v.data.length === 3 ? v.data[1] || '' : '',
        dataB: Array.isArray(v.data) && v.data.length === 3 ? v.data[2] || '' : '',
        cmap: v.cmap || '', clip: v.clip !== undefined ? String(v.clip) : '',
        vmin: v.vmin !== undefined ? String(v.vmin) : '', vmax: v.vmax !== undefined ? String(v.vmax) : '',
      };
    });
    setViews(loaded); setNextId(loaded.length + 1);
  };

  useImperativeHandle(ref, () => ({ getData, setData }));

  const addView = () => {
    setViews([...views, { id: nextId, key: '', type: 'Monochrome', description: '', data: '', dataR: '', dataG: '', dataB: '', cmap: 'jet', clip: '', vmin: '', vmax: '' }]);
    setNextId(nextId + 1);
  };
  const removeView = (id: number) => setViews(views.filter((v) => v.id !== id));
  const updateView = (id: number, field: keyof ViewEntry, value: string) =>
    setViews(views.map((v) => (v.id === id ? { ...v, [field]: value } : v)));

  return (
    <div>
      {views.map((view) => (
        <div key={view.id} style={{ ...s.sectionBox, marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600, color: s.theme.gray900, fontSize: '14px' }}>{view.key || 'New View'}</span>
            <button onClick={() => removeView(view.id)} style={{ ...s.buttonDanger, marginLeft: 'auto' }}>Remove</button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>View Name *</label>
            <input type="text" placeholder="e.g., RGB, Cirrus, NDVI" value={view.key}
              onChange={(e) => updateView(view.id, 'key', e.target.value)} style={s.inputStyle} />
            <small style={{ ...s.descriptionStyle, marginTop: '4px' }}>Unique identifier for this view (used in view groups)</small>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>View Type *</label>
            <select value={view.type} onChange={(e) => updateView(view.id, 'type', e.target.value)} style={s.selectStyle}>
              <option value="Monochrome">Monochrome (single band)</option>
              <option value="RGB">RGB (3 bands)</option>
              <option value="Bing Map">Bing Map (aerial imagery)</option>
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>Description</label>
            <small style={s.descriptionStyle}>Further description which explains what the user can see in this view.</small>
            <input type="text" placeholder="e.g., Normal RGB image" value={view.description}
              onChange={(e) => updateView(view.id, 'description', e.target.value)} style={s.inputStyle} />
          </div>

          {/* Data field based on type */}
          {view.type === 'Monochrome' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={s.labelStyle}>Data *</label>
              <small style={s.descriptionStyle}>Band expression for monochrome view. Examples: $B1, $Sentinel2.B11**0.8*5, edges($Sentinel2.B2+$Sentinel2.B3)</small>
              <input type="text" placeholder="e.g., $Sentinel2.B11**0.8*5" value={view.data}
                onChange={(e) => updateView(view.id, 'data', e.target.value)} style={s.inputStyle} />
            </div>
          )}

          {view.type === 'RGB' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={s.labelStyle}>Data (RGB Channels) *</label>
              <small style={s.descriptionStyle}>Three band expressions for Red, Green, and Blue channels.</small>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {(['Red Channel', 'Green Channel', 'Blue Channel'] as const).map((lbl, i) => {
                  const field = (['dataR', 'dataG', 'dataB'] as const)[i];
                  return (
                    <div key={lbl}>
                      <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px', color: s.theme.gray600 }}>{lbl}</label>
                      <input type="text" placeholder={`e.g., $Sentinel2.B${5 - i}`} value={view[field]}
                        onChange={(e) => setViews(views.map((v) => (v.id === view.id ? { ...v, [field]: e.target.value } : v)))}
                        style={{ ...s.inputStyle, padding: '6px', fontSize: '12px' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view.type === 'Bing Map' && (
            <div style={{ ...s.infoBox, marginBottom: '12px' }}>
              <small style={{ color: s.theme.gray900 }}>ℹ️ Bing Map views don't require a data field. They use metadata location coordinates.</small>
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>Cmap</label>
            <small style={s.descriptionStyle}>Matplotlib colormap name to render monochrome image.</small>
            <input type="text" value={view.cmap} onChange={(e) => updateView(view.id, 'cmap', e.target.value)} style={s.inputStyle} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>Clip</label>
            <input type="text" placeholder="Clip option 2" value={view.clip} onChange={(e) => updateView(view.id, 'clip', e.target.value)} style={s.inputStyle} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>Vmin</label>
            <input type="text" placeholder="Vmin option 2" value={view.vmin} onChange={(e) => updateView(view.id, 'vmin', e.target.value)} style={s.inputStyle} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>Vmax</label>
            <input type="text" placeholder="Vmax option 2" value={view.vmax} onChange={(e) => updateView(view.id, 'vmax', e.target.value)} style={s.inputStyle} />
          </div>
        </div>
      ))}
      <button onClick={addView} style={s.buttonDashed}>+ Add</button>
    </div>
  );
});

ViewListEditor.displayName = 'ViewListEditor';
export default ViewListEditor;
