/**
 * React ViewManager Component
 * 
 * This component displays the React ViewManager for image segmentation.
 * The legacy ViewManager has been removed as part of the migration to React.
 */

import React from 'react';
import ReactViewManager from './ReactViewManager';
import ErrorBoundary from './ErrorBoundary';
import { useViewManagerStore } from '../../stores/viewManagerStore';
import { useSegmentationStore } from '../../stores/segmentationStore';

interface ViewerComparisonProps {
  // Props interface kept for future extensibility
}

const ViewerComparison: React.FC<ViewerComparisonProps> = () => {
  // Use store hooks instead of direct window access
  const { isInitialized } = useViewManagerStore();
  const { config } = useSegmentationStore();

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%', // Use full available height
    minHeight: '0', // Allow shrinking
    maxHeight: '100%', // Don't exceed parent
    backgroundColor: 'var(--color-bg-canvas)',
    overflow: 'hidden', // Prevent overflow
    padding: '10px',
    boxSizing: 'border-box', // Include padding in dimensions
    display: 'flex', // Use flexbox for proper sizing
    flexDirection: 'column', // Stack children vertically
  };
  
  return (
    <div style={containerStyle}>
      {isInitialized ? (
        <ErrorBoundary
          onError={(error, errorInfo) => {
            console.error('React ViewManager crashed:', error, errorInfo);
          }}
        >
          <ReactViewManager style={{ flex: 1 }} />
        </ErrorBoundary>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            color: '#666',
            fontSize: '14px',
          }}
        >
          {config ? 'Initializing React ViewManager...' : 'Loading configuration...'}
        </div>
      )}
    </div>
  );
};

export default ViewerComparison;