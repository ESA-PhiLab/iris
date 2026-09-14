import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import ViewGroupListEditor from './ViewGroupListEditor';
import { useConfigStyles } from './useConfigStyles';

interface ViewGroupsSectionProps {
  getAvailableViews: () => string[];
}

const ViewGroupsSection = forwardRef<any, ViewGroupsSectionProps>(({ getAvailableViews }, ref) => {
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
        <span>View Groups</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.theme.gray500} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div style={s.panelStyle}>
          <small style={s.descriptionStyle}>
            Views are displayed in groups. The <code style={s.codeStyle}>default</code> group is required.
          </small>
          <pre style={s.preStyle}>{`"view_groups": {\n  "default": ["Cirrus", "RGB", "Bing"],\n  "clouds": ["Cirrus"]\n}`}</pre>
          <ViewGroupListEditor ref={editorRef} getAvailableViews={getAvailableViews} />
        </div>
      )}
    </div>
  );
});

ViewGroupsSection.displayName = 'ViewGroupsSection';
export default ViewGroupsSection;
