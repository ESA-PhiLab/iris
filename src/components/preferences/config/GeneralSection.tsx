import { useState, useImperativeHandle, forwardRef, useRef } from 'react';
import PathListEditor from './PathListEditor';
import { useConfigStyles } from './useConfigStyles';

const GeneralSection = forwardRef<any, {}>((_props, ref) => {
  const [name, setName] = useState('');
  const [port, setPort] = useState(5000);
  const [host, setHost] = useState('127.0.0.1');
  const [shape1, setShape1] = useState('');
  const [shape2, setShape2] = useState('');
  const [thumbnailsEnabled, setThumbnailsEnabled] = useState(false);
  const [thumbnailsPath, setThumbnailsPath] = useState('');
  const [metadataEnabled, setMetadataEnabled] = useState(false);
  const [metadataPath, setMetadataPath] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const pathListRef = useRef<any>(null);
  const s = useConfigStyles();

  const getData = () => {
    const pathData = pathListRef.current?.getData();
    return {
      name, port, host,
      images: {
        path: pathData,
        shape: [parseInt(shape1) || 0, parseInt(shape2) || 0],
        thumbnails: thumbnailsEnabled ? thumbnailsPath : false,
        metadata: metadataEnabled ? metadataPath : false,
      },
    };
  };

  const setData = (data: any) => {
    if (data.name !== undefined) setName(data.name);
    if (data.port !== undefined) setPort(data.port);
    if (data.host !== undefined) setHost(data.host);
    if (data.images) {
      if (data.images.path !== undefined && pathListRef.current?.setData) pathListRef.current.setData(data.images.path);
      if (data.images.shape && Array.isArray(data.images.shape)) {
        setShape1(String(data.images.shape[0] || ''));
        setShape2(String(data.images.shape[1] || ''));
      }
      if (data.images.thumbnails !== undefined) {
        if (data.images.thumbnails === false) { setThumbnailsEnabled(false); setThumbnailsPath(''); }
        else { setThumbnailsEnabled(true); setThumbnailsPath(data.images.thumbnails); }
      }
      if (data.images.metadata !== undefined) {
        if (data.images.metadata === false) { setMetadataEnabled(false); setMetadataPath(''); }
        else { setMetadataEnabled(true); setMetadataPath(data.images.metadata); }
      }
    }
  };

  useImperativeHandle(ref, () => ({ getData, setData }));

  return (
    <div style={{ marginBottom: '8px' }}>
      <button onClick={() => setIsOpen(!isOpen)}
        style={{ ...s.accordionStyle, ...(isOpen ? s.accordionOpenStyle : {}) }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = s.theme.panelHeaderBg)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = s.theme.bgTertiary)}
      >
        <span>General</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.theme.gray500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={s.panelStyle}>
          {/* Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={s.labelStyle}>Name</label>
            <small style={s.descriptionStyle}>Optional name for this project. (e.g., <code style={s.codeStyle}>cloud-segmentation</code>)</small>
            <input type="text" placeholder="cloud-segmentation" value={name} onChange={(e) => setName(e.target.value)} style={s.inputStyle} />
            <small style={{ ...s.descriptionStyle, marginTop: '4px', marginBottom: 0 }}>This will be used as the project identifier</small>
          </div>
          {/* Port */}
          <div style={{ marginBottom: '16px' }}>
            <label style={s.labelStyle}>Port</label>
            <small style={s.descriptionStyle}>Set the port on which IRIS is served. Example: <code style={s.codeStyle}>6060</code></small>
            <input type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value) || 5000)} min="0" max="65535" style={s.inputStyle} />
          </div>
          {/* Host */}
          <div style={{ marginBottom: '16px' }}>
            <label style={s.labelStyle}>Host</label>
            <small style={s.descriptionStyle}>
              Set the host IP address for IRIS. The default value 127.0.0.1 means IRIS will only be visible on the local machine.
              If you want to expose IRIS publicly, set the host to 0.0.0.0.
            </small>
            <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" style={s.inputStyle} />
          </div>
          {/* Images Path */}
          <div style={{ marginBottom: '16px' }}>
            <label style={s.labelStyle}>Images Path *</label>
            <small style={s.descriptionStyle}>
              The input path(s) to the images. Paths should use the placeholder <code style={s.codeStyle}>{'{id}'}</code>, which will be replaced by the unique id of the current image.
            </small>
            <pre style={s.preStyle}>{`"path": {\n    "Sentinel1": "images/{id}/S1.tif",\n    "Sentinel2": "images/S2-{id}.tif"\n}`}</pre>
            <PathListEditor ref={pathListRef} />
          </div>
          {/* Shape */}
          <div style={{ marginBottom: '16px' }}>
            <label style={s.labelStyle}>Shape *</label>
            <small style={s.descriptionStyle}>The shape of the images [width, height]. Example: <code style={s.codeStyle}>[512, 512]</code></small>
            <div style={{ display: 'flex', gap: '12px', maxWidth: '300px' }}>
              <input type="number" placeholder="512" value={shape1} onChange={(e) => setShape1(e.target.value)} style={s.inputStyle} />
              <input type="number" placeholder="512" value={shape2} onChange={(e) => setShape2(e.target.value)} style={s.inputStyle} />
            </div>
          </div>
          {/* Thumbnails */}
          <div style={{ marginBottom: '16px' }}>
            <label style={s.labelStyle}>Thumbnails</label>
            <small style={s.descriptionStyle}>Optional thumbnail files. Path must contain <code style={s.codeStyle}>{'{id}'}</code>.</small>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
              <input type="checkbox" checked={thumbnailsEnabled} onChange={(e) => setThumbnailsEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: s.theme.primary, cursor: 'pointer' }} />
              <span style={{ fontSize: '13px', color: s.theme.gray900 }}>Enable</span>
            </label>
            {thumbnailsEnabled && (
              <input type="text" placeholder="thumbnails/{id}.png" value={thumbnailsPath} onChange={(e) => setThumbnailsPath(e.target.value)} style={s.inputStyle} />
            )}
          </div>
          {/* Metadata */}
          <div>
            <label style={s.labelStyle}>Metadata</label>
            <small style={s.descriptionStyle}>Optional metadata files (json/yaml). Path must contain <code style={s.codeStyle}>{'{id}'}</code>.</small>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
              <input type="checkbox" checked={metadataEnabled} onChange={(e) => setMetadataEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: s.theme.primary, cursor: 'pointer' }} />
              <span style={{ fontSize: '13px', color: s.theme.gray900 }}>Enable</span>
            </label>
            {metadataEnabled && (
              <input type="text" placeholder="metadata/{id}.json" value={metadataPath} onChange={(e) => setMetadataPath(e.target.value)} style={s.inputStyle} />
            )}
          </div>
        </div>
      )}
    </div>
  );
});

GeneralSection.displayName = 'GeneralSection';
export default GeneralSection;
