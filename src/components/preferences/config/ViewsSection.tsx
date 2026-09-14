import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import ViewListEditor from './ViewListEditor';
import { useConfigStyles } from './useConfigStyles';

const ViewsSection = forwardRef<any, {}>((_props, ref) => {
  const editorRef = useRef<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const s = useConfigStyles();

  useImperativeHandle(ref, () => ({
    getData: () => editorRef.current?.getData() || {},
    setData: (data: any) => { if (editorRef.current?.setData) editorRef.current.setData(data); },
  }));

  return (
    <div style={{ marginBottom: '8px' }}>
      <button onClick={() => setIsOpen(!isOpen)}
        style={{ ...s.accordionStyle, ...(isOpen ? s.accordionOpenStyle : {}) }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = s.theme.panelHeaderBg)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = s.theme.bgTertiary)}
      >
        <span>Views</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.theme.gray500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={s.panelStyle}>
          <small style={s.descriptionStyle}>
            Configure how multi-spectral images are presented. Each view defines band mappings and display settings.
          </small>
          <ViewListEditor ref={editorRef} />
        </div>
      )}
    </div>
  );
});

ViewsSection.displayName = 'ViewsSection';
export default ViewsSection;
