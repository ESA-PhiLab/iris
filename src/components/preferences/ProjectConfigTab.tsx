import React, { useRef, useState, useEffect } from 'react';
import GeneralSection from './config/GeneralSection';
import ClassesSection from './config/ClassesSection';
import ViewsSection from './config/ViewsSection';
import ViewGroupsSection from './config/ViewGroupsSection';
import SegmentationSection from './config/SegmentationSection';
import ChatSection, { type ChatSectionRef } from './config/ChatSection';
import { getProjectConfig, updateProjectConfig, validateProjectConfig } from '../../services/config';
import type { ProjectConfig } from '../../services/config';
import { useTheme } from '../../contexts/ThemeContext';

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
  const chatRef = useRef<ChatSectionRef>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadedConfig, setLoadedConfig] = useState<ProjectConfig | null>(null);
  const [originalConfigJson, setOriginalConfigJson] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { theme } = useTheme();

  useEffect(() => {
    loadConfiguration();
  }, []);

  useEffect(() => {
    if (!loading && loadedConfig) {
      populateSections(loadedConfig);
      setTimeout(() => {
        try {
          const generalData = generalRef.current?.getData();
          const classesData = classesRef.current?.getData();
          const viewsData = viewsRef.current?.getData();
          const viewGroupsData = viewGroupsRef.current?.getData();
          const segmentationData = segmentationRef.current?.getData();
          const chatData = chatRef.current?.getData();
          const currentConfig: ProjectConfig = {
            ...generalData, classes: classesData, views: viewsData,
            view_groups: viewGroupsData, segmentation: segmentationData, chat: chatData,
          };
          setOriginalConfigJson(JSON.stringify(currentConfig));
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
      const response = await getProjectConfig();
      const config = response.config;
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
      generalRef.current.setData({ name: config.name, host: config.host, port: config.port, images: config.images });
    }
    if (classesRef.current?.setData) classesRef.current.setData(config.classes);
    if (viewsRef.current?.setData) viewsRef.current.setData(config.views);
    if (viewGroupsRef.current?.setData) viewGroupsRef.current.setData(config.view_groups);
    if (segmentationRef.current?.setData) segmentationRef.current.setData(config.segmentation);
    if (chatRef.current?.setData) {
      if ((window as any).IRIS_DEBUG) console.log('[ProjectConfigTab] Populating ChatSection with:', config.chat);
      chatRef.current.setData(config.chat);
    }
  };

  const getAvailableViews = (): string[] => {
    const viewsData = viewsRef.current?.getData();
    return viewsData ? Object.keys(viewsData) : [];
  };

  const checkForChanges = () => {
    if (!originalConfigJson) return;
    try {
      const generalData = generalRef.current?.getData();
      const classesData = classesRef.current?.getData();
      const viewsData = viewsRef.current?.getData();
      const viewGroupsData = viewGroupsRef.current?.getData();
      const segmentationData = segmentationRef.current?.getData();
      const chatData = chatRef.current?.getData();
      const currentConfig: ProjectConfig = {
        ...generalData, classes: classesData, views: viewsData,
        view_groups: viewGroupsData, segmentation: segmentationData, chat: chatData,
      };
      const changed = JSON.stringify(currentConfig) !== originalConfigJson;
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
      const generalData = generalRef.current?.getData();
      const classesData = classesRef.current?.getData();
      const viewsData = viewsRef.current?.getData();
      const viewGroupsData = viewGroupsRef.current?.getData();
      const segmentationData = segmentationRef.current?.getData();
      const chatData = chatRef.current?.getData();
      const config: ProjectConfig = {
        ...generalData, classes: classesData, views: viewsData,
        view_groups: viewGroupsData, segmentation: segmentationData, chat: chatData,
      };
      const validationResult = await validateProjectConfig(config);
      if (!validationResult.valid) {
        setError(`Validation failed: ${validationResult.errors.join(', ')}`);
        return;
      }
      const response = await updateProjectConfig(config);
      setSuccess(response.message || 'Configuration saved successfully');
      setLoadedConfig(config);
      setOriginalConfigJson(JSON.stringify(config));
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
      <ChatSection ref={chatRef} />

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
          {saving ? 'Saving...' : 'Save Complete Configuration'}
        </button>
      </div>
    </div>
  );
};

export default ProjectConfigTab;
