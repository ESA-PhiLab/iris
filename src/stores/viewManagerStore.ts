/**
 * Views of the segmentation page
 *
 * Which views exist, which group of them is shown, and the map the views
 * share: the camera, where the current image lies, and the layers that can be
 * switched off. The layout of the groups is remembered across reloads.
 */

import { create } from 'zustand';
import { Georef } from '../utils/georef';
import type { ImageFileSource } from '../raster/cog';
import { rasterEngine } from '../raster/engine';
import { useUiStore } from './uiStore';

export interface ViewConfig {
  name: string;
  type: 'image';
  description: string;
  /** Band expressions, one (with cmap) or three (red, green, blue) */
  data: string | string[];
  cmap?: string;
  clip?: number | null;
  vmin?: number | null;
  vmax?: number | null;
}

export interface ViewGroup {
  [groupName: string]: string[];
}

/** Center and zoom shared by all map views */
export interface MapCamera {
  center: [number, number];
  zoom: number;
}

export interface ViewManagerState {
  views: { [name: string]: ViewConfig };
  viewGroups: ViewGroup;
  currentGroup: string;
  /** View the user last clicked */
  currentView: string | null;
  imageId: string | null;
  imageDimensions: { width: number; height: number } | null;
  showControls: boolean;
  isInitialized: boolean;
  /** Camera of the map views, carried across remounts (null: fit the image) */
  camera: MapCamera | null;
  /** Incremented to make all map views fit the image again */
  resetViewsCount: number;
  /** Where the current image lies on the map */
  georef: Georef | null;
  /** Layers of the map views that can be switched off (the mask is in segmentationStore) */
  showImage: boolean;
  showSatellite: boolean;
  /** Stable project identity used to isolate persisted layouts */
  storageScope: string;

  setViews: (views: { [name: string]: ViewConfig }) => void;
  setStorageScope: (scope: string) => void;
  setViewGroups: (groups: ViewGroup) => void;
  setCurrentGroup: (group: string) => void;
  showNextGroup: () => void;
  setCurrentView: (viewName: string | null) => void;
  getCurrentViews: () => ViewConfig[];
  addView: (name: string, position?: number) => void;
  removeView: (position: number) => void;
  replaceView: (position: number, name: string) => void;
  setImage: (imageId: string) => void;
  setImageDimensions: (width: number, height: number) => void;
  setShowControls: (show: boolean) => void;
  toggleControls: () => void;
  setInitialized: (initialized: boolean) => void;
  setCamera: (camera: MapCamera) => void;
  resetCanvas: () => void;
  /** Read an image in the browser and place it on the map */
  openImage: (imageId: string, sources: Record<string, ImageFileSource>) => Promise<void>;
  toggleImage: () => void;
  toggleSatellite: () => void;
}

const viewStateKey = (scope: string) => `iris-view-state|${scope}`;

/** Remember the current group and the layout of the groups */
const persistViewState = ({ currentGroup, viewGroups, storageScope }: ViewManagerState) => {
  try {
    localStorage.setItem(viewStateKey(storageScope), JSON.stringify({ currentGroup, viewLayouts: viewGroups }));
  } catch { /* ignore */ }
};

export const useViewManagerStore = create<ViewManagerState>((set, get) => {
  const updateGroup = (update: (views: string[]) => string[]) => {
    const { viewGroups, currentGroup } = get();
    set({ viewGroups: { ...viewGroups, [currentGroup]: update([...(viewGroups[currentGroup] || [])]) } });
    persistViewState(get());
  };

  return {
    views: {},
    viewGroups: { default: [] },
    currentGroup: 'default',
    currentView: null,
    imageId: null,
    imageDimensions: null,
    showControls: false,
    isInitialized: false,
    camera: null,
    resetViewsCount: 0,
    georef: null,
    showImage: true,
    showSatellite: true,
    storageScope: 'default',

    setViews: (views) => set({ views }),
    setStorageScope: (storageScope) => set({ storageScope }),

    setViewGroups: (viewGroups) => {
      set({ viewGroups });
      // Restore the layout the user left, for the groups that still exist
      try {
        const saved = JSON.parse(localStorage.getItem(viewStateKey(get().storageScope)) || 'null');
        if (!saved) return;
        const groups = { ...viewGroups };
        for (const [group, layout] of Object.entries(saved.viewLayouts || {})) {
          if (groups[group] && Array.isArray(layout)) groups[group] = layout as string[];
        }
        set({
          viewGroups: groups,
          ...(saved.currentGroup && groups[saved.currentGroup] ? { currentGroup: saved.currentGroup } : {}),
        });
      } catch { /* ignore */ }
    },

    setCurrentGroup: (currentGroup) => {
      set({ currentGroup });
      persistViewState(get());
    },

    showNextGroup: () => {
      const groups = Object.keys(get().viewGroups);
      const next = groups[(groups.indexOf(get().currentGroup) + 1) % groups.length];
      get().setCurrentGroup(next);
      useUiStore.getState().notify(`Group: ${next}`);
    },

    setCurrentView: (currentView) => set({ currentView }),

    getCurrentViews: () => {
      const { views, viewGroups, currentGroup } = get();
      return (viewGroups[currentGroup] || []).map((name) => views[name]).filter(Boolean);
    },

    addView: (name, position = -1) => updateGroup((views) => {
      if (position === -1) views.push(name);
      else views.splice(position, 0, name);
      return views;
    }),

    removeView: (position) => updateGroup((views) => {
      // A group keeps at least one view
      if (views.length > 1) views.splice(position, 1);
      return views;
    }),

    replaceView: (position, name) => updateGroup((views) => {
      views[position] = name;
      return views;
    }),

    setImage: (imageId) => set({ imageId }),

    setImageDimensions: (width, height) => set({ imageDimensions: { width, height } }),

    setShowControls: (showControls) => set({ showControls }),
    toggleControls: () => set((state) => ({ showControls: !state.showControls })),
    setInitialized: (isInitialized) => set({ isInitialized }),

    setCamera: (camera) => set({ camera }),

    resetCanvas: () => set((state) => ({ camera: null, resetViewsCount: state.resetViewsCount + 1 })),

    openImage: async (imageId, sources) => {
      const georef = await rasterEngine().open(imageId, sources);
      set({ georef, imageDimensions: { width: georef.width, height: georef.height } });
    },

    toggleImage: () => set((state) => ({ showImage: !state.showImage })),
    toggleSatellite: () => set((state) => ({ showSatellite: !state.showSatellite })),
  };
});
