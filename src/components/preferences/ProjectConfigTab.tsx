import React, { useRef, useState, useEffect } from 'react';
import GeneralSection from './config/GeneralSection';
import ClassesSection from './config/ClassesSection';
import ViewsSection from './config/ViewsSection';
import ViewGroupsSection from './config/ViewGroupsSection';
import SegmentationSection from './config/SegmentationSection';
import { backend } from '../../services/backend';
import { validateProject } from '../../project/validate';
import { useTheme } from '../../contexts/ThemeContext';

type ProjectConfig = Record<string, any>;

/**
 * SectionRef Interface
 */
export interface SectionRef {
  getData: () => any;
  setData?: (data: any) => void;
}

interface ProjectConfigTabProps {
  onStateChange?: (state: { hasUnsavedChanges: boolean }) => void;
}

/**
 * Project Configuration Tab Component
 * 
 * Orchestrates the entire IRIS project configuration form.
 * Contains accordion sections for editing different parts of the config.
 * Only visible to admin users.
 */
const ProjectConfigTab: React.FC<ProjectConfigTabProps> = ({ onStateChange }) => {
  const generalRef = useRef<SectionRef>(null);
  const classesRef = useRef<SectionRef>(null);
  const viewsRef = useRef<SectionRef>(null);
  const viewGroupsRef = useRef<SectionRef>(null);
  const segmentationRef = useRef<SectionRef>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadedConfig, setLoadedConfig] = useState<ProjectConfig | null>(null);
  const [originalConfigJson, setOriginalConfigJson] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  /** The project is saved to its dataset on the Hub, or downloaded */
  const [savesTo, setSavesTo] = useState<'hub' | 'download'>('download');

  const { theme } = useTheme();

  useEffect(() => {
    loadConfiguration();
  }, []);

  useEffect(() => {
    if (!loading && loadedConfig) {
      populateSections(loadedConfig);
      setTimeout(() => {
        try {
          setOriginalConfigJson(JSON.stringify(formConfig()));
          setHasUnsavedChanges(false);
        } catch (err) {
          console.error('[ProjectConfigTab] Error capturing initial state:', err);
        }
      }, 200);
    }
  }, [loading, loadedConfig]);

  useEffect(() => {
    if (onStateChange) onStateChange({ hasUnsavedChanges });
  }, [hasUnsavedChanges, onStateChange]);

  useEffect(() => {
    if (loading || !originalConfigJson) return;
    const interval = setInterval(() => { checkForChanges(); }, 500);
    return () => clearInterval(interval);
  }, [loading, originalConfigJson]);

  const loadConfiguration = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await backend().loadProjectFile();
      const config = response.config;
      setSavesTo(response.savesTo);
      setLoadedConfig(config);
      setHasUnsavedChanges(false);
      setSuccess('Configuration loaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('[ProjectConfigTab] Failed to load configuration:', err);
      setError(err.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const populateSections = (config: ProjectConfig) => {
    if (generalRef.current?.setData) {
      generalRef.current.setData({ name: config.name, images: config.images });
    }
    if (classesRef.current?.setData) classesRef.current.setData(config.classes);
    if (viewsRef.current?.setData) viewsRef.current.setData(config.views);
    if (viewGroupsRef.current?.setData) viewGroupsRef.current.setData(config.view_groups);
    if (segmentationRef.current?.setData) segmentationRef.current.setData(config.segmentation);
  };

  /** The project as the form shows it */
  const formConfig = (): ProjectConfig => ({
    ...generalRef.current?.getData(),
    classes: classesRef.current?.getData(),
    views: viewsRef.current?.getData(),
    view_groups: viewGroupsRef.current?.getData(),
    segmentation: segmentationRef.current?.getData(),
  });

  const getAvailableViews = (): string[] => {
    const viewsData = viewsRef.current?.getData();
    return viewsData ? Object.keys(viewsData) : [];
  };

  const checkForChanges = () => {
    if (!originalConfigJson) return;
    try {
      const changed = JSON.stringify(formConfig()) !== originalConfigJson;
      setHasUnsavedChanges(changed);
      if (onStateChange) onStateChange({ hasUnsavedChanges: changed });
    } catch (err) {
      console.error('[ProjectConfigTab] Error checking for changes:', err);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const form = formConfig();
      // What the form does not show, e.g. the ids of the images, stays as it was
      const config: ProjectConfig = {
        ...loadedConfig,
        ...form,
        images: { ...loadedConfig?.images, ...form.images },
        segmentation: { ...loadedConfig?.segmentation, ...form.segmentation },
      };
      const validationResult = validateProject(config);
      if (!validationResult.valid) {
        setError(`Validation failed: ${validationResult.errors.join(', ')}`);
        return;
      }
      const savedTo = await backend().saveProjectFile(config);
      setSuccess(savedTo === 'hub'
        ? 'Project saved to its dataset, reload the page to use it'
        : 'Project downloaded: replace the project file with it to use it');
      setLoadedConfig(config);
      setOriginalConfigJson(JSON.stringify(form));
      setHasUnsavedChanges(false);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('[ProjectConfigTab] Failed to save configuration:', err);
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.gray500, fontSize: '13px' }}>
        Loading configuration...
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
          backgroundColor: theme.alertPale, color: theme.gray900,
          fontSize: '13px', fontWeight: 500, border: `1px solid ${theme.alert}`,
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
          backgroundColor: theme.successDark ?? theme.success, color: theme.bgPrimary,
          fontSize: '13px', fontWeight: 500, border: `1px solid ${theme.success}`,
        }}>
          ✓ {success}
        </div>
      )}

      <GeneralSection ref={generalRef} />
      <ClassesSection ref={classesRef} />
      <ViewsSection ref={viewsRef} />
      <ViewGroupsSection ref={viewGroupsRef} getAvailableViews={getAvailableViews} />
      <SegmentationSection ref={segmentationRef} />

      <div style={{
        padding: '16px', borderTop: `1px solid ${theme.separatorColor}`, marginTop: '16px',
      }}>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          style={{
            width: '100%', padding: '10px 20px', borderRadius: '8px', border: 'none',
            fontSize: '14px', fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            backgroundColor: saving ? theme.gray400 : theme.buttonPrimaryBg,
            color: theme.buttonPrimaryText,
            opacity: saving ? 0.7 : 1,
          }}
          onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = theme.buttonPrimaryHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = saving ? theme.gray400 : theme.buttonPrimaryBg; }}
        >
          {saving ? 'Saving...' : savesTo === 'hub' ? 'Save the project to its dataset' : 'Download the project file'}
        </button>
      </div>
    </div>
  );
};

export default ProjectConfigTab;
