import { useState, useImperativeHandle, forwardRef } from 'react';
import { useConfigStyles } from './useConfigStyles';

interface ClassEntry {
  id: number;
  name: string;
  description: string;
  colour: [number, number, number, number];
  hasUserColour: boolean;
  userColour: [number, number, number, number];
}

const ClassListEditor = forwardRef<any, {}>((_props, ref) => {
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [nextId, setNextId] = useState(1);
  const s = useConfigStyles();

  const getData = () => classes.map((cls) => {
    const d: any = { name: cls.name, colour: cls.colour };
    if (cls.description.trim()) d.description = cls.description;
    if (cls.hasUserColour) d.user_colour = cls.userColour;
    return d;
  });

  const setData = (data: any[]) => {
    if (!Array.isArray(data)) return;
    const loaded = data.map((cls, i) => ({
      id: i + 1, name: cls.name || '', description: cls.description || '',
      colour: cls.colour || [255, 255, 255, 0], hasUserColour: !!cls.user_colour,
      userColour: cls.user_colour || [0, 255, 255, 70],
    }));
    setClasses(loaded);
    setNextId(loaded.length + 1);
  };

  useImperativeHandle(ref, () => ({ getData, setData }));

  const addClass = () => {
    setClasses([...classes, { id: nextId, name: '', description: '', colour: [255, 255, 255, 0], hasUserColour: false, userColour: [0, 255, 255, 70] }]);
    setNextId(nextId + 1);
  };
  const removeClass = (id: number) => setClasses(classes.filter((c) => c.id !== id));
  const updateClass = (id: number, field: 'name' | 'description', value: string) =>
    setClasses(classes.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const updateColour = (id: number, index: number, value: number) => {
    setClasses(classes.map((c) => {
      if (c.id !== id) return c;
      const newColour = [...c.colour] as [number, number, number, number];
      newColour[index] = Math.max(0, Math.min(255, value));
      return { ...c, colour: newColour };
    }));
  };

  const updateUserColour = (id: number, index: number, value: number) => {
    setClasses(classes.map((c) => {
      if (c.id !== id) return c;
      const nc = [...c.userColour] as [number, number, number, number];
      nc[index] = Math.max(0, Math.min(255, value));
      return { ...c, userColour: nc };
    }));
  };

  const toggleUserColour = (id: number) =>
    setClasses(classes.map((c) => (c.id === id ? { ...c, hasUserColour: !c.hasUserColour } : c)));

  const rgbaLabels = ['Red', 'Green', 'Blue', 'Alpha'];
  const numInput: React.CSSProperties = { ...s.inputStyle, padding: '6px', fontSize: '12px' };

  return (
    <div>
      {classes.map((cls) => (
        <div key={cls.id} style={{ ...s.sectionBox, marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, color: s.theme.gray900, fontSize: '14px' }}>{cls.name || 'New Class'}</span>
            <button onClick={() => removeClass(cls.id)} style={{ ...s.buttonDanger, marginLeft: 'auto' }}>Remove</button>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>Name *</label>
            <small style={s.descriptionStyle}>Name of the class.</small>
            <input type="text" value={cls.name} onChange={(e) => updateClass(cls.id, 'name', e.target.value)} style={s.inputStyle} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>Description</label>
            <small style={s.descriptionStyle}>Optional description explaining the class.</small>
            <input type="text" placeholder="Optional description" value={cls.description}
              onChange={(e) => updateClass(cls.id, 'description', e.target.value)} style={s.inputStyle} />
          </div>

          {/* Colour RGBA */}
          <div style={{ marginBottom: '12px' }}>
            <label style={s.labelStyle}>Colour (RGBA) *</label>
            <small style={s.descriptionStyle}>Required color. RGBA values (0-255). Example: [255, 255, 0, 70] = yellow with transparency</small>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              {rgbaLabels.map((lbl, i) => (
                <div key={lbl}>
                  <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px', color: s.theme.gray600 }}>{lbl}</label>
                  <input type="number" value={cls.colour[i]} min="0" max="255"
                    onChange={(e) => updateColour(cls.id, i, parseInt(e.target.value) || 0)} style={numInput} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: '8px', height: '30px', borderRadius: '6px', border: `1px solid ${s.theme.modalBorder}`,
              background: `rgba(${cls.colour[0]}, ${cls.colour[1]}, ${cls.colour[2]}, ${cls.colour[3] / 255})` }} />
          </div>

          {/* User Colour */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <input type="checkbox" checked={cls.hasUserColour} onChange={() => toggleUserColour(cls.id)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: s.theme.primary }} />
              <label style={{ cursor: 'pointer', fontWeight: 600, color: s.theme.gray900, fontSize: '14px' }}
                onClick={() => toggleUserColour(cls.id)}>User Colour (Optional)</label>
            </div>
            <small style={s.descriptionStyle}>Optional alternative color for user display.</small>
            {cls.hasUserColour && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                  {rgbaLabels.map((lbl, i) => (
                    <div key={lbl}>
                      <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px', color: s.theme.gray600 }}>{lbl}</label>
                      <input type="number" value={cls.userColour[i]} min="0" max="255"
                        onChange={(e) => updateUserColour(cls.id, i, parseInt(e.target.value) || 0)} style={numInput} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', height: '30px', borderRadius: '6px', border: `1px solid ${s.theme.modalBorder}`,
                  background: `rgba(${cls.userColour[0]}, ${cls.userColour[1]}, ${cls.userColour[2]}, ${cls.userColour[3] / 255})` }} />
              </>
            )}
          </div>
        </div>
      ))}
      <button onClick={addClass} style={s.buttonDashed}>+ Add</button>
    </div>
  );
});

ClassListEditor.displayName = 'ClassListEditor';
export default ClassListEditor;
