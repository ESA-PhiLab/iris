import { useState, useImperativeHandle, forwardRef, useRef } from 'react';
import PathListEditor from './PathListEditor';
import { useConfigStyles } from './useConfigStyles';

const GeneralSection = forwardRef<any, {}>((_props, ref) => {
  const [name, setName] = useState('');
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
      name,
      images: {
        path: pathData,
        thumbnails: thumbnailsEnabled ? thumbnailsPath : false,
        metadata: metadataEnabled ? metadataPath : false,
      },
    };
  };

  const setData = (data: any) => {
    if (data.name !== undefined) setName(data.name);
    if (data.images) {
      if (data.images.path !== undefined && pathListRef.current?.setData) pathListRef.current.setData(data.images.path);
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
      {/* Hidden rather than removed, so a folded section keeps its data */}
      <div style={{ ...s.panelStyle, display: isOpen ? undefined : 'none' }}>
        {/* Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={s.labelStyle}>Name</label>
          <small style={s.descriptionStyle}>Optional name for this project. (e.g., <code style={s.codeStyle}>cloud-segmentation</code>)</small>
          <input type="text" placeholder="cloud-segmentation" value={name} onChange={(e) => setName(e.target.value)} style={s.inputStyle} />
          <small style={{ ...s.descriptionStyle, marginTop: '4px', marginBottom: 0 }}>This will be used as the project identifier</small>
        </div>
        {/* Images Path */}
        <div style={{ marginBottom: '16px' }}>
          <label style={s.labelStyle}>Images Path *</label>
          <small style={s.descriptionStyle}>
            The COG file(s) of the images, relative to the project file or hf:// paths. Paths should use the placeholder <code style={s.codeStyle}>{'{id}'}</code>, which will be replaced by the unique id of the current image.
          </small>
          <pre style={s.preStyle}>{`"path": {\n    "Sentinel1": "images/{id}/S1.tif",\n    "Sentinel2": "images/S2-{id}.tif"\n}`}</pre>
          <PathListEditor ref={pathListRef} />
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
    </div>
  );
});

GeneralSection.displayName = 'GeneralSection';
export default GeneralSection;
