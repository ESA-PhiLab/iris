/**
 * Debug Panel Component
 * 
 * Shows debugging information about the legacy vars and React store state
 * to help troubleshoot initialization issues.
 */

import React, { useState, useEffect } from 'react';
import { useViewManagerStore } from '../../stores/viewManagerStore';
import { useSegmentationStore } from '../../stores/segmentationStore';

const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [legacyVars, setLegacyVars] = useState<any>(null);
  
  // Use store hooks instead of direct window access
  const viewManagerState = useViewManagerStore();
  const segmentationState = useSegmentationStore();
  
  const { getDebugInfo, retryInitialization } = viewManagerState;
  const debugInfo = getDebugInfo();
  const segmentationDebugInfo = segmentationState.getDebugInfo();
  
  // Update legacy vars periodically (only for comparison)
  useEffect(() => {
    const updateLegacyVars = () => {
      const w = window as any;
      
      const views = w.getConfigSectionFromStore ? w.getConfigSectionFromStore('views') : null;
      const viewGroups = w.getConfigSectionFromStore ? w.getConfigSectionFromStore('view_groups') : null;
      
      setLegacyVars({
        hasVars: true,
        hasConfig: !!views || !!viewGroups,
        hasViews: !!views,
        viewsType: typeof views,
        viewsKeys: views ? (Array.isArray(views) ? views.map((v: any) => v.name) : Object.keys(views)) : [],
        viewGroups: viewGroups,
        imageId: segmentationState.currentImageId,
        imageLocation: viewManagerState.imageLocation,
        hasVm: !!w.getViewManagerFromStore,
        vmFilters: w.getViewManagerFromStore ? w.getViewManagerFromStore()?.filters : null,
      });
    };
    
    updateLegacyVars();
    const interval = setInterval(updateLegacyVars, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!isOpen) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 10000,
        }}
      >
        <button
          onClick={() => setIsOpen(true)}
          style={{
            padding: '8px 12px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          🐛 Debug
        </button>
      </div>
    );
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: '400px',
        maxHeight: '500px',
        backgroundColor: 'white',
        border: '2px solid #2196f3',
        borderRadius: '8px',
        padding: '10px',
        fontSize: '11px',
        fontFamily: 'monospace',
        overflow: 'auto',
        zIndex: 10000,
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px',
          paddingBottom: '5px',
          borderBottom: '1px solid #ddd',
        }}
      >
        <h4 style={{ margin: 0, color: '#2196f3' }}>🐛 Debug Panel</h4>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            padding: '2px 6px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <h5 style={{ margin: '0 0 5px 0', color: '#d32f2f' }}>Legacy Vars:</h5>
        <pre style={{ 
          margin: 0, 
          padding: '5px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '2px',
          fontSize: '9px',
          overflow: 'auto',
          maxHeight: '150px',
        }}>
          {JSON.stringify(legacyVars, null, 2)}
        </pre>
      </div>
      
      <div>
        <h5 style={{ margin: '0 0 5px 0', color: '#4caf50' }}>React Store:</h5>
        <pre style={{ 
          margin: 0, 
          padding: '5px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '2px',
          fontSize: '9px',
          overflow: 'auto',
          maxHeight: '150px',
        }}>
          {JSON.stringify({
            viewManager: debugInfo,
            segmentation: segmentationDebugInfo,
          }, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginTop: '10px', fontSize: '10px', color: '#666' }}>
        <button
          onClick={() => {
            const w = window as any;
            console.log('Legacy vars:', w.vars);
            console.log('React store:', viewManagerState);
          }}
          style={{
            padding: '4px 8px',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '10px',
            marginRight: '5px',
          }}
        >
          Log to Console
        </button>
        
        <button
          onClick={retryInitialization}
          style={{
            padding: '4px 8px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '10px',
          }}
        >
          Retry Init
        </button>
      </div>
    </div>
  );
};

export default DebugPanel;