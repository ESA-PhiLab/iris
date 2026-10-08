/**
 * Map view of one IRIS view
 *
 * Each view is a MapLibre map showing the view of the image, rendered in the
 * browser from the COG, the mask, the brush and the mask area at their place
 * on the map, over satellite imagery. All map views share one camera, so
 * zooming or panning one moves the others.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CanvasSource, GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Feature } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import './ReactMapView.css';
import { ViewConfig, useViewManagerStore } from '../../stores/viewManagerStore';
import { useSegmentationStore } from '../../stores/segmentationStore';
import { useTheme } from '../../contexts/ThemeContext';
import { Georef, areaCorners, cornersBounds, lngLatToPixel, pixelToLngLat } from '../../utils/georef';
import { rasterEngine } from '../../raster/engine';

const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

/** Maps on screen, kept on the same camera */
const maps = new Set<MapLibreMap>();
let syncing = false;

/** Same rounding as the legacy round_number() */
const roundNumber = (x: number) => (x + 0.5) | 0;

/** Footprint of the brush around the cursor, in image pixels */
const brushPolygon = (
  georef: Georef,
  cursor: [number, number],
  size: number,
  shape: string
): Feature => {
  // Same offset as the legacy get_tool_offset()
  const offset = size === 1 ? 0 : roundNumber(-size / 2);
  const x = cursor[0] + offset;
  const y = cursor[1] + offset;

  let pixels: [number, number][];
  if (shape === 'round') {
    const radius = size / 2;
    pixels = Array.from({ length: 48 }, (_, i) => {
      const angle = (2 * Math.PI * i) / 48;
      return [x + radius + radius * Math.cos(angle), y + radius + radius * Math.sin(angle)];
    });
  } else {
    pixels = [[x, y], [x + size, y], [x + size, y + size], [x, y + size]];
  }

  const ring = pixels.map((pixel) => pixelToLngLat(georef, pixel));
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
  };
};

/** CSS filter of the image, set in the right panel */
const imageFilter = () => {
  const { brightness, saturation, contrast, invert } = useSegmentationStore.getState();
  return [
    invert ? 'invert(1)' : '',
    `brightness(${brightness}%)`,
    contrast ? 'contrast(200%)' : '',
    `saturate(${saturation}%)`,
  ].filter(Boolean).join(' ');
};

/** Copy the current pixels of a canvas source to the map */
const refreshCanvasSource = (map: MapLibreMap, id: string) => {
  const source = map.getSource(id) as CanvasSource | undefined;
  if (!source) return;
  source.play();
  map.once('render', () => source.pause());
};

const addCanvasSource = (
  map: MapLibreMap,
  id: string,
  canvas: HTMLCanvasElement,
  coordinates: CanvasSourceCoordinates,
  layout: { visibility: 'visible' | 'none' } = { visibility: 'visible' }
) => {
  map.addSource(id, { type: 'canvas', canvas, coordinates, animate: false });
  // Pin the canvas bilinearly to its corners, as georef.ts expects
  (map.getSource(id) as CanvasSource).setWarp?.('flat');
  map.addLayer(
    {
      id,
      type: 'raster',
      source: id,
      layout,
      paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0 },
    },
    // Layers go from bottom to top: satellite, image, mask, brush, mask area
    // outline.
    // The image may finish loading after the mask was added.
    id === 'image' && map.getLayer('mask') ? 'mask' : 'brush'
  );
};

type CanvasSourceCoordinates = [[number, number], [number, number], [number, number], [number, number]];

interface ReactMapViewProps {
  view: ViewConfig;
  imageId: string;
  /** Number of views shown, the mask area outline is thinner with several */
  viewCount: number;
}

const ReactMapView: React.FC<ReactMapViewProps> = ({ view, imageId, viewCount }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  /** Callbacks waiting for the style and our layers to be loaded */
  const pendingRef = useRef<Set<(map: MapLibreMap) => void> | null>(new Set());
  const { theme } = useTheme();
  /** Error of the view, e.g. a wrong band expression */
  const [viewError, setViewError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);

  const georef = useViewManagerStore((state) => state.georef);
  const hiddenMaskCanvas = useSegmentationStore((state) => state.hiddenMaskCanvas);
  const maskArea = useSegmentationStore((state) => state.maskArea);

  // Create the map
  useEffect(() => {
    if (!containerRef.current || !georef) return;

    const camera = useViewManagerStore.getState().camera;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': theme.bgCanvas } }],
      },
      ...(camera
        ? { center: camera.center, zoom: camera.zoom }
        : { bounds: cornersBounds(georef.corners) }),
      attributionControl: { compact: false },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      keyboard: false,
      doubleClickZoom: false,
      boxZoom: false,
      renderWorldCopies: false,
      maxZoom: 24,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;
    pendingRef.current = new Set();
    maps.add(map);

    // Keep all maps on the same camera
    map.on('move', () => {
      if (syncing) return;
      syncing = true;
      const target = { center: map.getCenter(), zoom: map.getZoom() };
      for (const other of maps) {
        if (other !== map) other.jumpTo(target);
      }
      syncing = false;
    });
    map.on('moveend', () => {
      if (syncing) return;
      useViewManagerStore.getState().setCamera({
        center: map.getCenter().toArray() as [number, number],
        zoom: map.getZoom(),
      });
    });

    map.on('load', () => {
      // Satellite imagery around and below the image
      map.addSource('satellite', {
        type: 'raster',
        tiles: [ESRI_IMAGERY],
        tileSize: 256,
        maxzoom: 19,
        attribution: 'Imagery © Esri',
      });
      map.addLayer({
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        layout: { visibility: useViewManagerStore.getState().showSatellite ? 'visible' : 'none' },
      });

      map.addSource('brush', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'brush',
        type: 'fill',
        source: 'brush',
        paint: { 'fill-color': 'rgb(150, 150, 150)', 'fill-opacity': 0.5 },
      });

      map.addSource('mask-area', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'mask-area',
        type: 'line',
        source: 'mask-area',
        paint: { 'line-color': 'red', 'line-width': 2, 'line-dasharray': [2.5, 7.5] },
      });

      // Let the other effects add their sources now that the style is ready
      const pending = pendingRef.current;
      pendingRef.current = null;
      pending?.forEach((fn) => fn(map));
    });

    return () => {
      maps.delete(map);
      map.remove();
      mapRef.current = null;
    };
    // The background follows the theme without recreating the map (see below)
  }, [georef]);

  /** Run fn once the map can take sources and layers */
  const whenReady = (fn: (map: MapLibreMap) => void) => {
    const map = mapRef.current;
    if (!map) return () => {};
    const pending = pendingRef.current;
    if (!pending) {
      fn(map);
      return () => {};
    }
    pending.add(fn);
    return () => { pending.delete(fn); };
  };

  // Switch the image and the satellite imagery on and off
  useEffect(() => {
    return useViewManagerStore.subscribe((state, previous) => {
      const map = mapRef.current;
      if (!map) return;
      if (state.showImage !== previous.showImage && map.getLayer('image')) {
        map.setLayoutProperty('image', 'visibility', state.showImage ? 'visible' : 'none');
      }
      if (state.showSatellite !== previous.showSatellite && map.getLayer('satellite')) {
        map.setLayoutProperty('satellite', 'visibility', state.showSatellite ? 'visible' : 'none');
      }
    });
  }, []);

  // Background colour of the theme
  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer('background')) {
      map.setPaintProperty('background', 'background-color', theme.bgCanvas);
    }
  }, [theme.bgCanvas]);

  // Outline of the mask area
  useEffect(() => {
    if (!georef || !maskArea) return;
    return whenReady((map) => {
      const ring = areaCorners(georef, maskArea);
      (map.getSource('mask-area') as GeoJSONSource).setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [...ring, ring[0]] },
      });
      map.setPaintProperty('mask-area', 'line-width', viewCount < 2 ? 3 : 2);
    });
  }, [georef, maskArea, viewCount]);

  // The view, rendered in the browser from the pixels of the COG
  const viewKey = JSON.stringify([view.data, view.cmap, view.clip, view.vmin, view.vmax]);
  useEffect(() => {
    if (!georef) return;

    // The rendered view, and the canvas the map shows: the view with the
    // filters of the right panel
    const rendered = document.createElement('canvas');
    rendered.width = georef.width;
    rendered.height = georef.height;
    const canvas = document.createElement('canvas');
    canvas.width = georef.width;
    canvas.height = georef.height;
    let cancelled = false;
    let cancelReady = () => {};

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = imageFilter();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(rendered, 0, 0);
      if (mapRef.current) refreshCanvasSource(mapRef.current, 'image');
    };

    setRendering(true);
    setViewError(null);
    rasterEngine().render(imageId, view).then((image) => {
      if (cancelled) return;
      const ctx = rendered.getContext('2d');
      ctx?.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
      draw();
      setRendering(false);
      cancelReady = whenReady((map) => {
        if (!map.getSource('image')) {
          addCanvasSource(
            map, 'image', canvas, georef.corners as CanvasSourceCoordinates,
            { visibility: useViewManagerStore.getState().showImage ? 'visible' : 'none' }
          );
        }
      });
    }).catch((error: Error) => {
      if (cancelled) return;
      console.error(`Could not render view ${view.name}:`, error);
      setRendering(false);
      setViewError(error.message);
    });

    // Brightness, contrast, saturation and invert are applied to the image only
    const unsubscribe = useSegmentationStore.subscribe((state, previous) => {
      if (
        state.brightness !== previous.brightness
        || state.saturation !== previous.saturation
        || state.contrast !== previous.contrast
        || state.invert !== previous.invert
      ) {
        draw();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      cancelReady();
      const map = mapRef.current;
      if (map?.getLayer('image')) map.removeLayer('image');
      if (map?.getSource('image')) map.removeSource('image');
    };
    // view is read through viewKey and its name
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [georef, imageId, view.name, viewKey]);

  // Mask, drawn by the legacy code into the hidden mask canvas
  useEffect(() => {
    if (!georef || !hiddenMaskCanvas || !maskArea) return;

    const cancelReady = whenReady((map) => {
      if (map.getSource('mask')) return;
      addCanvasSource(
        map, 'mask', hiddenMaskCanvas, areaCorners(georef, maskArea) as CanvasSourceCoordinates,
        { visibility: useSegmentationStore.getState().showMask ? 'visible' : 'none' }
      );
    });

    const refresh = () => {
      if (mapRef.current) refreshCanvasSource(mapRef.current, 'mask');
    };
    window.addEventListener('react-mask-render', refresh);
    window.addEventListener('iris-mask-loaded', refresh);

    const unsubscribe = useSegmentationStore.subscribe((state, previous) => {
      const map = mapRef.current;
      if (state.showMask !== previous.showMask && map?.getLayer('mask')) {
        map.setLayoutProperty('mask', 'visibility', state.showMask ? 'visible' : 'none');
      }
    });

    return () => {
      cancelReady();
      unsubscribe();
      window.removeEventListener('react-mask-render', refresh);
      window.removeEventListener('iris-mask-loaded', refresh);
    };
  }, [georef, hiddenMaskCanvas, maskArea]);

  // Brush preview, follows the cursor of whichever view the mouse is on
  useEffect(() => {
    if (!georef) return;

    const update = () => {
      const map = mapRef.current;
      const source = map?.getSource('brush') as GeoJSONSource | undefined;
      if (!source) return;
      const { cursorImage, toolSize, toolShape } = useSegmentationStore.getState();
      source.setData(brushPolygon(georef, cursorImage, toolSize, toolShape));
    };

    const cancelReady = whenReady(update);
    const unsubscribe = useSegmentationStore.subscribe((state, previous) => {
      if (
        state.cursorImage !== previous.cursorImage
        || state.toolSize !== previous.toolSize
        || state.toolShape !== previous.toolShape
      ) {
        update();
      }
    });

    return () => {
      cancelReady();
      unsubscribe();
    };
  }, [georef]);

  // Drawing: the legacy mouse handlers get the image pixel under the mouse
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !georef) return;

    const forward = (handler: 'mouse_down' | 'mouse_move' | 'mouse_up') => (e: MapMouseEvent) => {
      const legacyHandler = (window as any)[handler];
      if (!legacyHandler) return;
      const [x, y] = lngLatToPixel(georef, [e.lngLat.lng, e.lngLat.lat]);
      const event = e.originalEvent as MouseEvent & { irisCursorImage?: [number, number] };
      event.irisCursorImage = [roundNumber(x), roundNumber(y)];
      legacyHandler.call(map.getCanvas(), event);
    };
    const onMouseDown = forward('mouse_down');
    const onMouseMove = forward('mouse_move');
    const onMouseUp = forward('mouse_up');
    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);

    return () => {
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
    };
  }, [georef]);

  // Panning: the move tool drags the map, the right and middle buttons always do
  useEffect(() => {
    const map = mapRef.current;
    const wrapper = wrapperRef.current;
    if (!map || !wrapper) return;

    const applyTool = (tool: string) => {
      if (tool === 'move') {
        map.dragPan.enable();
        map.getCanvas().style.cursor = '';
      } else {
        map.dragPan.disable();
        map.getCanvas().style.cursor = 'crosshair';
      }
    };
    applyTool(useSegmentationStore.getState().currentTool);
    const unsubscribe = useSegmentationStore.subscribe((state, previous) => {
      if (state.currentTool !== previous.currentTool) applyTool(state.currentTool);
    });

    let panFrom: [number, number] | null = null;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || e.button === 2) {
        panFrom = [e.clientX, e.clientY];
        e.preventDefault();
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!panFrom) return;
      map.panBy([panFrom[0] - e.clientX, panFrom[1] - e.clientY], { animate: false });
      panFrom = [e.clientX, e.clientY];
    };
    const onMouseUp = () => { panFrom = null; };
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    // Shift + wheel resizes the brush instead of zooming
    const onWheel = (e: WheelEvent) => {
      if (!useSegmentationStore.getState().toolResizingMode) return;
      e.preventDefault();
      e.stopPropagation();
      (window as any).mouse_wheel?.call(map.getCanvas(), e);
    };

    wrapper.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    wrapper.addEventListener('contextmenu', onContextMenu);
    wrapper.addEventListener('wheel', onWheel, { capture: true, passive: false });

    return () => {
      unsubscribe();
      wrapper.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      wrapper.removeEventListener('contextmenu', onContextMenu);
      wrapper.removeEventListener('wheel', onWheel, { capture: true });
    };
  }, [georef]);

  // Reset views: fit the image again
  useEffect(() => {
    let previous = useViewManagerStore.getState().resetViewsCount;
    return useViewManagerStore.subscribe((state) => {
      if (state.resetViewsCount === previous) return;
      previous = state.resetViewsCount;
      if (mapRef.current && state.georef) {
        mapRef.current.fitBounds(cornersBounds(state.georef.corners), { animate: false });
      }
    });
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {(!georef || rendering || viewError) && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '80%',
            padding: viewError ? '8px 12px' : 0,
            borderRadius: '6px',
            backgroundColor: viewError ? theme.panelBg : 'transparent',
            color: viewError ? theme.alert : theme.gray500,
            fontSize: '12px',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {viewError ? `View ${view.name}: ${viewError}` : 'Loading...'}
        </div>
      )}
    </div>
  );
};

export default ReactMapView;
