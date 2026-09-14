import { useState, useImperativeHandle, forwardRef } from 'react';
import { useConfigStyles } from './useConfigStyles';

interface ViewGroupEntry { id: number; key: string; views: string[]; }
interface ViewGroupListEditorProps { getAvailableViews: () => string[]; }

const ViewGroupListEditor = forwardRef<any, ViewGroupListEditorProps>(({ getAvailableViews }, ref) => {
  const [groups, setGroups] = useState<ViewGroupEntry[]>([]);
  const [nextId, setNextId] = useState(1);
  const [selectedView, setSelectedView] = useState<Record<number, string>>({});
  const s = useConfigStyles();

  const getData = () => groups.reduce((acc, g) => { acc[g.key] = g.views; return acc; }, {} as Record<string, string[]>);

  const setData = (data: Record<string, string[]>) => {
    if (typeof data !== 'object' || data === null) return;
    const loaded = Object.entries(data).map(([key, views], i) => ({ id: i + 1, key, views: Array.isArray(views) ? views : [] }));
    setGroups(loaded); setNextId(loaded.length + 1);
  };

  useImperativeHandle(ref, () => ({ getData, setData }));

  const addGroup = () => { setGroups([...groups, { id: nextId, key: '', views: [] }]); setNextId(nextId + 1); };
  const removeGroup = (id: number) => setGroups(groups.filter((g) => g.id !== id));
  const updateGroupKey = (id: number, key: string) => setGroups(groups.map((g) => (g.id === id ? { ...g, key } : g)));

  const addViewToGroup = (groupId: number, viewName: string) => {
    if (!viewName.trim()) return;
    setGroups(groups.map((g) => (g.id === groupId && !g.views.includes(viewName.trim()) ? { ...g, views: [...g.views, viewName.trim()] } : g)));
  };
  const removeViewFromGroup = (groupId: number, viewName: string) =>
    setGroups(groups.map((g) => (g.id === groupId ? { ...g, views: g.views.filter((v) => v !== viewName) } : g)));

  return (
    <div>
      {groups.map((group, index) => (
        <div key={group.id} style={{ ...s.sectionBox, marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600, color: s.theme.gray900, fontSize: '14px' }}>Group {index + 1}</span>
            <button onClick={() => removeGroup(group.id)} style={{ ...s.buttonDanger, marginLeft: 'auto' }}>Remove</button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>Group Name *</label>
            <small style={s.descriptionStyle}>Name for this view group (e.g., "default", "radar", "optical")</small>
            <input type="text" placeholder="e.g., default" value={group.key}
              onChange={(e) => updateGroupKey(group.id, e.target.value)} style={s.inputStyle} />
          </div>

          <div>
            <label style={s.labelStyle}>Views in this Group</label>
            <small style={s.descriptionStyle}>Add view names from the Views section above</small>

            {/* View tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', minHeight: '32px' }}>
              {group.views.length === 0 && (
                <small style={{ color: s.theme.gray500, fontStyle: 'italic', fontSize: '12px' }}>No views added yet</small>
              )}
              {group.views.map((viewName) => (
                <div key={viewName} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px',
                  background: s.theme.primary, color: '#fff', borderRadius: '6px', fontSize: '12px',
                }}>
                  <span>{viewName}</span>
                  <button onClick={() => removeViewFromGroup(group.id, viewName)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0', fontSize: '14px', lineHeight: '1' }}
                    title="Remove view">×</button>
                </div>
              ))}
            </div>

            {/* Dropdown to add */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={selectedView[group.id] || ''}
                onChange={(e) => setSelectedView({ ...selectedView, [group.id]: e.target.value })}
                style={{ ...s.selectStyle, flex: 1, fontSize: '12px' }}>
                <option value="">-- Select a view to add --</option>
                {getAvailableViews().filter((v) => !group.views.includes(v)).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <button onClick={() => { const v = selectedView[group.id]; if (v) { addViewToGroup(group.id, v); setSelectedView({ ...selectedView, [group.id]: '' }); } }}
                disabled={!selectedView[group.id]}
                style={{ ...s.buttonPrimary, opacity: selectedView[group.id] ? 1 : 0.5, cursor: selectedView[group.id] ? 'pointer' : 'not-allowed', fontSize: '12px' }}>
                Add
              </button>
            </div>
            {getAvailableViews().length === 0 && (
              <small style={{ display: 'block', marginTop: '8px', color: s.theme.alert, fontStyle: 'italic', fontSize: '12px' }}>
                ⚠️ No views available. Please add views in the Views section above first.
              </small>
            )}
          </div>
        </div>
      ))}
      <button onClick={addGroup} style={{ ...s.buttonDashed, marginBottom: '16px' }}>+ Add</button>
      <small style={{ display: 'block', color: s.theme.gray600, marginBottom: '12px', fontSize: '12px' }}>
        The 'default' group is required and will be shown first
      </small>
    </div>
  );
});

ViewGroupListEditor.displayName = 'ViewGroupListEditor';
export default ViewGroupListEditor;
