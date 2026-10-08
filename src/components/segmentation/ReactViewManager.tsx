/**
 * The views of the current group, side by side
 */

import React from 'react';
import { useViewManagerStore } from '../../stores/viewManagerStore';
import ReactViewPort from './ReactViewPort';

interface ReactViewManagerProps {
  className?: string;
  style?: React.CSSProperties;
}

const ReactViewManager: React.FC<ReactViewManagerProps> = ({ className = '', style = {} }) => {
  const currentGroup = useViewManagerStore((state) => state.currentGroup);
  const showControls = useViewManagerStore((state) => state.showControls);
  const imageId = useViewManagerStore((state) => state.imageId);
  const currentView = useViewManagerStore((state) => state.currentView);
  const setCurrentView = useViewManagerStore((state) => state.setCurrentView);
  // Read the views again when the views or the groups change
  useViewManagerStore((state) => state.views);
  useViewManagerStore((state) => state.viewGroups);
  const currentViews = useViewManagerStore.getState().getCurrentViews();

  if (!imageId || currentViews.length === 0) {
    return (
      <div
        className={`react-view-manager ${className}`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: '#666',
          fontSize: '14px',
          ...style,
        }}
      >
        {imageId ? 'No views configured for this group' : 'Loading image...'}
      </div>
    );
  }

  return (
    <div
      className={`react-view-manager ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        width: '100%',
        height: '100%',
        minHeight: 0,
        maxHeight: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {currentViews.map((view, index) => (
        <ReactViewPort
          key={`${currentGroup}-${view.name}-${index}`}
          view={view}
          index={index}
          showControls={showControls}
          imageId={imageId}
          isActive={currentView === view.name}
          onViewActivate={() => setCurrentView(view.name)}
        />
      ))}
    </div>
  );
};

export default ReactViewManager;
