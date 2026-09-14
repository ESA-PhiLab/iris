import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import ClassListEditor from './ClassListEditor';
import { useConfigStyles } from './useConfigStyles';

const ClassesSection = forwardRef<any, {}>((_props, ref) => {
  const editorRef = useRef<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const s = useConfigStyles();

  useImperativeHandle(ref, () => ({
    getData: () => editorRef.current?.getData() || [],
    setData: (data: any) => { if (editorRef.current?.setData) editorRef.current.setData(data); },
  }));

  return (
    <div style={{ marginBottom: '8px' }}>
      <button onClick={() => setIsOpen(!isOpen)}
        style={{ ...s.accordionStyle, ...(isOpen ? s.accordionOpenStyle : {}) }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = s.theme.panelHeaderBg)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = s.theme.bgTertiary)}
      >
        <span>Classes</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.theme.gray500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={s.panelStyle}>
          <small style={s.descriptionStyle}>
            List of classes for segmentation labeling. Each class needs a name, colour (RGBA), and optional description.
          </small>
          <ClassListEditor ref={editorRef} />
        </div>
      )}
    </div>
  );
});

ClassesSection.displayName = 'ClassesSection';
export default ClassesSection;
