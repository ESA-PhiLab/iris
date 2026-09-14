/**
 * React Bing Layer Component
 * 
 * This component replaces the legacy BingLayer class.
 * It handles Bing Maps iframe embedding with geographic coordinates from React store.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import ReactBaseLayer, { ReactBaseLayerProps } from './ReactBaseLayer';
import { useViewManagerStore } from '../../../stores/viewManagerStore';

interface ReactBingLayerProps extends Omit<ReactBaseLayerProps, 'children'> {
  onLocationChange?: (location: [number, number]) => void;
  zoomLevel?: number;
  panOffset?: { x: number; y: number };
}

const ReactBingLayer: React.FC<ReactBingLayerProps> = ({
  view,
  width,
  height,
  zIndex,
  className = '',
  style = {},
  zoomLevel: _zoomLevel = 1.0,
  panOffset: _panOffset = { x: 0, y: 0 },
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Get image location from React store
  const imageLocation = useViewManagerStore(state => state.imageLocation);
  const validateImageLocation = useViewManagerStore(state => state.validateImageLocation);
  
  // Update Bing Maps URL
  const updateBingMap = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    
    // Validate coordinates before using them
    if (!validateImageLocation(imageLocation)) {
      console.warn('[IRIS] ReactBingLayer: Invalid image location coordinates, skipping map update', imageLocation);
      return;
    }
    
    // Format location for Bing Maps
    const location = `${imageLocation[0]}~${imageLocation[1]}`;
    
    let url = "https://www.bing.com/maps/embed?";
    url += `h=${height}`;
    url += `&w=${width}`;
    url += `&cp=${location}`;
    url += "&lvl=12&typ=d&sty=a&src=SHELL&FORM=MBEDV8";
    
    iframe.src = url;
  }, [imageLocation, width, height, validateImageLocation]);
  
  // Update when size changes
  useEffect(() => {
    updateBingMap();
  }, [updateBingMap]);
  
  // Update when image location changes
  useEffect(() => {
    updateBingMap();
  }, [imageLocation, updateBingMap]);
  
  // Expose update function for legacy compatibility
  useEffect(() => {
    const w = window as any;
    if (!w.reactBingLayers) {
      w.reactBingLayers = [];
    }
    
    const layerInterface = {
      update: updateBingMap,
      view: view,
      type: 'bingmap',
      container: iframeRef.current,
      imageLocationChanged: updateBingMap,
      sizeChanged: updateBingMap,
    };
    
    w.reactBingLayers.push(layerInterface);
    
    return () => {
      const index = w.reactBingLayers.indexOf(layerInterface);
      if (index > -1) {
        w.reactBingLayers.splice(index, 1);
      }
    };
  }, [updateBingMap, view]);
  
  const iframeStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    border: '1px solid #ccc',
    ...style,
  };
  
  return (
    <ReactBaseLayer
      view={view}
      width={width}
      height={height}
      zIndex={zIndex}
      className={`react-bing-layer ${className}`}
    >
      <iframe
        ref={iframeRef}
        style={iframeStyle}
        frameBorder="0"
        title={`Bing Map - ${view.name}`}
      />
    </ReactBaseLayer>
  );
};

export default ReactBingLayer;