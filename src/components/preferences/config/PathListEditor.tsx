import { useState, useImperativeHandle, forwardRef } from 'react';
import { useConfigStyles } from './useConfigStyles';

interface PathEntry {
  id: number;
  key: string;
  value: string;
}

const PathListEditor = forwardRef<any, {}>((_props, ref) => {
  const [paths, setPaths] = useState<PathEntry[]>([{ id: 1, key: '', value: 'images/{id}.tif' }]);
  const [nextId, setNextId] = useState(2);
  const s = useConfigStyles();

  const getData = () => {
    if (paths.length === 1 && !paths[0].key.trim()) return paths[0].value;
    return paths.reduce((acc, path) => {
      const key = path.key.trim() || `path${path.id}`;
      acc[key] = path.value;
      return acc;
    }, {} as Record<string, string>);
  };

  const setData = (data: string | Record<string, string>) => {
    if (typeof data === 'string') {
      setPaths([{ id: 1, key: '', value: data }]);
      setNextId(2);
    } else if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data).map(([key, value], index) => ({ id: index + 1, key, value }));
      setPaths(entries);
      setNextId(entries.length + 1);
    }
  };

  useImperativeHandle(ref, () => ({ getData, setData }));

  const addPath = () => {
    setPaths([...paths, { id: nextId, key: '', value: '' }]);
    setNextId(nextId + 1);
  };

  const removePath = (id: number) => {
    if (paths.length > 1) setPaths(paths.filter((p) => p.id !== id));
  };

  const updatePath = (id: number, field: 'key' | 'value', value: string) => {
    setPaths(paths.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  return (
    <div>
      {paths.map((path, index) => (
        <div key={path.id} style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, color: s.theme.gray900, fontSize: '14px' }}>Path-{index + 1} *</span>
            {paths.length > 1 && (
              <button onClick={() => removePath(path.id)} style={s.buttonDanger}>Remove</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
            <input type="text" placeholder="optional key (e.g. Sentinel2)" value={path.key}
              onChange={(e) => updatePath(path.id, 'key', e.target.value)}
              style={{ ...s.inputStyle, flex: '0 0 300px' }} />
            <input type="text" placeholder="images/{id}.tif" value={path.value}
              onChange={(e) => updatePath(path.id, 'value', e.target.value)}
              style={{ ...s.inputStyle, flex: 1 }} />
          </div>
          <small style={{ display: 'block', color: s.theme.gray600, marginLeft: '308px', fontSize: '12px' }}>
            Full or relative path to set of image files. Must use "{'{id}'}" placeholder.
          </small>
        </div>
      ))}
      <button onClick={addPath} style={s.buttonDashed}>+ Add path</button>
      <small style={{ display: 'block', marginTop: '8px', color: s.theme.gray600, fontSize: '12px' }}>
        Use {'{id}'} as placeholder for image identifiers
      </small>
    </div>
  );
});

PathListEditor.displayName = 'PathListEditor';
export default PathListEditor;
