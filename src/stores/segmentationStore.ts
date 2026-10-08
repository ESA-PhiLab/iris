/**
 * State of the segmentation page
 *
 * The project, the image list, the mask of the current image and how the user
 * edits it: drawing, erasing, undo and redo, the AI, saving. The mask covers
 * the mask area of the image and is kept as two arrays of one byte per pixel,
 * row by row: the class of each pixel, and whether the user drew it (1) or the
 * AI predicted it (0). A hidden canvas holds the mask in colour; the map views
 * show it.
 */

import { create } from 'zustand';
import type { ClassConfig, ConfusionMatrix, ProjectConfig, UserInfo } from '../types/iris';
import { Rect, brushMaskRect, fillRect, strokePositions, unionRect } from '../segmentation/brush';
import { MaskType, maskPixels } from '../segmentation/maskColours';
import { MIN_CLASS_PIXELS, splitTrainingPixels, testPredictions } from '../segmentation/training';
import { fetchMask, saveMask } from '../services/masks';
import { fetchAiModel } from '../services/userConfig';
import { rasterEngine } from '../raster/engine';
import type { AiModelSettings } from '../ai/segment';
import { useUiStore } from './uiStore';
import { useViewManagerStore } from './viewManagerStore';

export type Tool = 'move' | 'draw' | 'eraser';
export type { MaskType };

export interface PixelCounts {
  [classId: number]: number;
  total: number;
}

export interface ImageInfo {
  image_id: string;
  has_user_annotation: boolean;
  has_any_annotation: boolean;
  annotation_count: number;
}

/** Steps of undo and redo kept */
const HISTORY_LENGTH = 30;

const countUserPixels = (
  mask: Uint8Array | null,
  userMask: Uint8Array | null,
  classCount: number
): PixelCounts => {
  const counts: PixelCounts = { total: 0 };
  for (let c = 0; c < classCount; c++) counts[c] = 0;
  if (!mask || !userMask) return counts;
  for (let i = 0; i < userMask.length; i++) {
    if (userMask[i] && mask[i] < classCount) {
      counts[mask[i]]++;
      counts.total++;
    }
  }
  return counts;
};

const classesWithEnoughPixels = (counts: PixelCounts, classCount: number) => {
  let classes = 0;
  for (let c = 0; c < classCount; c++) if (counts[c] > MIN_CLASS_PIXELS) classes++;
  return classes;
};

const drawingRecommendation = (counts: PixelCounts, classCount: number) =>
  classesWithEnoughPixels(counts, classCount) >= 2
    ? 'Start the training!'
    : 'Draw at least 10 pixels from two classes!';

export interface SegmentationState {
  // Project and user
  config: ProjectConfig | null;
  user: UserInfo | null;
  classes: ClassConfig[];
  setConfig: (config: ProjectConfig) => void;
  setUser: (user: UserInfo) => void;
  setClasses: (classes: ClassConfig[]) => void;

  // Images
  images: ImageInfo[];
  currentImageId: string | null;
  setImages: (images: ImageInfo[]) => void;
  setCurrentImage: (imageId: string) => void;
  getNextImageId: () => string | null;
  getPrevImageId: () => string | null;

  // Mask
  /** Part of the image the mask covers, [x0, y0, x1, y1] */
  maskArea: [number, number, number, number] | null;
  maskDimensions: { width: number; height: number } | null;
  maskData: Uint8Array | null;
  userMaskData: Uint8Array | null;
  errorsMaskData: Uint8Array | null;
  hiddenMaskCanvas: HTMLCanvasElement | null;
  /** Incremented whenever the hidden canvas changes */
  maskVersion: number;
  maskType: MaskType;
  showMask: boolean;
  setMaskArea: (area: [number, number, number, number]) => void;
  /** Start editing a mask, empty when none is given */
  initMask: (mask?: Uint8Array, userMask?: Uint8Array) => void;
  clearMask: () => void;
  /** Colour the hidden canvas again, all of it or a part of the mask */
  redrawMask: (rect?: Rect) => void;
  setMaskType: (type: MaskType) => void;
  setShowMask: (visible: boolean) => void;
  toggleMask: () => void;

  // Drawing
  currentTool: Tool;
  /** Size of the brush in use */
  toolSize: number;
  /** Each brush keeps its own size */
  brushSizes: { draw: number; eraser: number };
  currentClass: number;
  /** Image pixel under the mouse, with decimals */
  cursorImage: [number, number];
  /** Last cursor of the stroke being drawn */
  strokeCursor: [number, number] | null;
  strokePainted: boolean;
  userPixelCounts: PixelCounts;
  aiRecommendation: string;
  setCurrentTool: (tool: Tool) => void;
  setToolSize: (size: number) => void;
  setBrushSize: (tool: 'draw' | 'eraser', size: number) => void;
  setCurrentClass: (classId: number) => void;
  setCursorImage: (cursor: [number, number]) => void;
  startStroke: (cursor: [number, number]) => void;
  continueStroke: (cursor: [number, number]) => void;
  endStroke: () => void;
  resetMask: () => void;

  // Undo and redo
  maskHistory: Uint8Array[];
  userMaskHistory: Uint8Array[];
  historyCurrentEpoch: number;
  updateHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Adjustments of the image
  brightness: number;
  saturation: number;
  contrast: boolean;
  invert: boolean;
  setBrightness: (value: number) => void;
  setSaturation: (value: number) => void;
  setContrast: (enabled: boolean) => void;
  setInvert: (enabled: boolean) => void;
  changeBrightness: (up: boolean) => void;
  changeSaturation: (up: boolean) => void;
  resetFilters: () => void;
  resetViews: () => void;

  // Saving and the AI
  /** Unsaved changes */
  maskChanged: boolean;
  /** The user edited the mask: ask about it before leaving the image */
  showDialogueBeforeNextImage: boolean;
  isLoading: boolean;
  lastSaveTime: Date | null;
  confusionMatrix: ConfusionMatrix | null;
  setMaskChanged: (changed: boolean) => void;
  setShowDialogueBeforeNextImage: (show: boolean) => void;
  loadMaskForImage: (imageId: string) => Promise<void>;
  saveCurrentMask: () => Promise<void>;
  predictMask: () => Promise<void>;
  createConfusionMatrix: (
    matrix: number[][],
    truePositives: { [classId: number]: number },
    userClasses: number[],
    classNames: string[]
  ) => ConfusionMatrix;
  updateConfusionMatrix: (matrix: ConfusionMatrix) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const useSegmentationStore = create<SegmentationState>((set, get) => {
  /** Paint or erase along the cursor positions, then show it */
  const paint = (positions: Array<[number, number]>) => {
    const { maskData, userMaskData, maskArea, maskDimensions, toolSize, currentTool, currentClass } = get();
    if (!maskData || !userMaskData || !maskArea || !maskDimensions || currentTool === 'move') return;

    let changed: Rect | null = null;
    for (const position of positions) {
      const rect = brushMaskRect(position, toolSize, maskArea);
      if (!rect) continue;
      if (currentTool === 'eraser') {
        fillRect(maskData, userMaskData, maskDimensions.width, rect, 0, 0);
      } else {
        fillRect(maskData, userMaskData, maskDimensions.width, rect, currentClass, 1);
      }
      changed = unionRect(changed, rect);
    }
    if (!changed) return;

    const counts = countUserPixels(maskData, userMaskData, get().classes.length);
    set({
      strokePainted: true,
      userPixelCounts: counts,
      aiRecommendation: drawingRecommendation(counts, get().classes.length),
      maskChanged: true,
      showDialogueBeforeNextImage: true,
    });
    get().redrawMask(changed);
  };

  /** Show the mask of a history step */
  const restore = (epoch: number) => {
    const { maskHistory, userMaskHistory, classes } = get();
    const maskData = new Uint8Array(maskHistory[epoch]);
    const userMaskData = new Uint8Array(userMaskHistory[epoch]);
    const counts = countUserPixels(maskData, userMaskData, classes.length);
    set({
      maskData,
      userMaskData,
      historyCurrentEpoch: epoch,
      userPixelCounts: counts,
      aiRecommendation: drawingRecommendation(counts, classes.length),
      maskChanged: true,
      showDialogueBeforeNextImage: true,
    });
    get().redrawMask();
  };

  return {
    // Project and user
    config: null,
    user: null,
    classes: [],

    setConfig: (config) => {
      set({ config });
      if (config.classes) get().setClasses(config.classes);
      if (config.segmentation?.mask_area) get().setMaskArea(config.segmentation.mask_area);
    },

    setUser: (user) => set({ user }),

    setClasses: (classes) => {
      set({ classes });
      if (get().currentClass >= classes.length) set({ currentClass: 0 });
      const counts = countUserPixels(get().maskData, get().userMaskData, classes.length);
      set({ userPixelCounts: counts, aiRecommendation: drawingRecommendation(counts, classes.length) });
      if (get().hiddenMaskCanvas) get().redrawMask();
    },

    // Images
    images: [],
    currentImageId: null,

    setImages: (images) => set({ images }),
    setCurrentImage: (imageId) => set({ currentImageId: imageId }),

    getNextImageId: () => {
      const { images, currentImageId } = get();
      const index = images.findIndex((image) => image.image_id === currentImageId);
      return index >= 0 && index < images.length - 1 ? images[index + 1].image_id : null;
    },

    getPrevImageId: () => {
      const { images, currentImageId } = get();
      const index = images.findIndex((image) => image.image_id === currentImageId);
      return index > 0 ? images[index - 1].image_id : null;
    },

    // Mask
    maskArea: null,
    maskDimensions: null,
    maskData: null,
    userMaskData: null,
    errorsMaskData: null,
    hiddenMaskCanvas: null,
    maskVersion: 0,
    maskType: 'final',
    showMask: true,

    setMaskArea: (area) => set({
      maskArea: area,
      maskDimensions: { width: area[2] - area[0], height: area[3] - area[1] },
    }),

    initMask: (mask, userMask) => {
      const { maskDimensions, classes } = get();
      if (!maskDimensions) throw new Error('The mask area is not known yet');
      const { width, height } = maskDimensions;
      const maskData = mask ? new Uint8Array(mask) : new Uint8Array(width * height);
      const userMaskData = userMask ? new Uint8Array(userMask) : new Uint8Array(width * height);

      let hiddenMaskCanvas = get().hiddenMaskCanvas;
      if (!hiddenMaskCanvas || hiddenMaskCanvas.width !== width || hiddenMaskCanvas.height !== height) {
        hiddenMaskCanvas = document.createElement('canvas');
        hiddenMaskCanvas.width = width;
        hiddenMaskCanvas.height = height;
      }

      const counts = countUserPixels(maskData, userMaskData, classes.length);
      set({
        maskData,
        userMaskData,
        errorsMaskData: new Uint8Array(width * height),
        hiddenMaskCanvas,
        maskHistory: [new Uint8Array(maskData)],
        userMaskHistory: [new Uint8Array(userMaskData)],
        historyCurrentEpoch: 0,
        userPixelCounts: counts,
        aiRecommendation: drawingRecommendation(counts, classes.length),
        confusionMatrix: null,
        maskChanged: false,
        showDialogueBeforeNextImage: false,
      });
      get().redrawMask();
    },

    clearMask: () => set({
      maskData: null,
      userMaskData: null,
      errorsMaskData: null,
      maskHistory: [],
      userMaskHistory: [],
      historyCurrentEpoch: 0,
      userPixelCounts: countUserPixels(null, null, get().classes.length),
    }),

    redrawMask: (rect) => {
      const { hiddenMaskCanvas, maskData, userMaskData, errorsMaskData, maskDimensions, maskType, classes } = get();
      if (!hiddenMaskCanvas || !maskData || !userMaskData || !maskDimensions) return;
      const area: Rect = rect ?? [0, 0, maskDimensions.width, maskDimensions.height];
      const ctx = hiddenMaskCanvas.getContext('2d');
      if (ctx && typeof ImageData !== 'undefined') {
        const pixels = maskPixels(
          { mask: maskData, userMask: userMaskData, errorsMask: errorsMaskData },
          maskType, classes, maskDimensions.width, area
        );
        ctx.putImageData(new ImageData(pixels, area[2] - area[0], area[3] - area[1]), area[0], area[1]);
      }
      set((state) => ({ maskVersion: state.maskVersion + 1 }));
    },

    setMaskType: (maskType) => {
      set({ maskType });
      get().redrawMask();
    },

    setShowMask: (showMask) => set({ showMask }),
    toggleMask: () => set((state) => ({ showMask: !state.showMask })),

    // Drawing
    currentTool: 'draw',
    toolSize: 5,
    brushSizes: { draw: 5, eraser: 5 },
    currentClass: 0,
    cursorImage: [0, 0],
    strokeCursor: null,
    strokePainted: false,
    userPixelCounts: { total: 0 },
    aiRecommendation: 'Draw at least 10 pixels from two classes!',

    setCurrentTool: (tool) => {
      set({ currentTool: tool });
      if (tool !== 'move') set({ toolSize: get().brushSizes[tool] });
    },

    setToolSize: (size) => {
      const toolSize = clamp(Math.round(size), 1, 100);
      set({ toolSize });
      const tool = get().currentTool;
      if (tool !== 'move') set((state) => ({ brushSizes: { ...state.brushSizes, [tool]: toolSize } }));
    },

    setBrushSize: (tool, size) => {
      const brushSize = clamp(Math.round(size), 1, 100);
      set((state) => ({ brushSizes: { ...state.brushSizes, [tool]: brushSize } }));
      if (get().currentTool === tool) set({ toolSize: brushSize });
    },

    setCurrentClass: (classId) => {
      const { classes } = get();
      if (classes.length && (classId < 0 || classId >= classes.length)) return;
      set({ currentClass: classId });
      // Picking a class means drawing with it
      get().setCurrentTool('draw');
    },

    setCursorImage: (cursor) => set({ cursorImage: cursor }),

    startStroke: (cursor) => {
      if (get().currentTool === 'move' || get().isLoading) return;
      set({ strokeCursor: cursor, strokePainted: false });
      paint([cursor]);
    },

    continueStroke: (cursor) => {
      const last = get().strokeCursor;
      if (!last) return;
      set({ strokeCursor: cursor });
      paint(strokePositions(last, cursor));
    },

    endStroke: () => {
      if (!get().strokeCursor) return;
      const painted = get().strokePainted;
      set({ strokeCursor: null, strokePainted: false });
      // One undo step per stroke
      if (painted) get().updateHistory();
    },

    resetMask: () => {
      const { maskData, userMaskData } = get();
      if (!maskData || !userMaskData) return;
      maskData.fill(0);
      userMaskData.fill(0);
      const counts = countUserPixels(maskData, userMaskData, get().classes.length);
      set({
        userPixelCounts: counts,
        aiRecommendation: drawingRecommendation(counts, get().classes.length),
        maskChanged: true,
        showDialogueBeforeNextImage: true,
      });
      get().redrawMask();
      get().updateHistory();
    },

    // Undo and redo
    maskHistory: [],
    userMaskHistory: [],
    historyCurrentEpoch: 0,

    updateHistory: () => {
      const { maskData, userMaskData, maskHistory, userMaskHistory, historyCurrentEpoch } = get();
      if (!maskData || !userMaskData) return;
      // Changing the mask after undoing drops the steps that could be redone
      const masks = [...maskHistory.slice(0, historyCurrentEpoch + 1), new Uint8Array(maskData)];
      const userMasks = [...userMaskHistory.slice(0, historyCurrentEpoch + 1), new Uint8Array(userMaskData)];
      while (masks.length > HISTORY_LENGTH) {
        masks.shift();
        userMasks.shift();
      }
      set({ maskHistory: masks, userMaskHistory: userMasks, historyCurrentEpoch: masks.length - 1 });
    },

    undo: () => {
      if (get().canUndo()) restore(get().historyCurrentEpoch - 1);
    },

    redo: () => {
      if (get().canRedo()) restore(get().historyCurrentEpoch + 1);
    },

    canUndo: () => get().historyCurrentEpoch > 0,
    canRedo: () => get().historyCurrentEpoch < get().maskHistory.length - 1,

    // Adjustments of the image
    brightness: 100,
    saturation: 100,
    contrast: false,
    invert: false,

    setBrightness: (value) => set({ brightness: clamp(value, 0, 800) }),
    setSaturation: (value) => set({ saturation: clamp(value, 0, 800) }),
    setContrast: (contrast) => set({ contrast }),
    setInvert: (invert) => set({ invert }),
    changeBrightness: (up) => get().setBrightness(get().brightness + (up ? 10 : -10)),
    changeSaturation: (up) => get().setSaturation(get().saturation + (up ? 20 : -20)),
    resetFilters: () => set({ brightness: 100, saturation: 100, contrast: false, invert: false }),
    resetViews: () => useViewManagerStore.getState().resetCanvas(),

    // Saving and the AI
    maskChanged: false,
    showDialogueBeforeNextImage: false,
    isLoading: false,
    lastSaveTime: null,
    confusionMatrix: null,

    setMaskChanged: (maskChanged) => set({ maskChanged }),
    setShowDialogueBeforeNextImage: (show) => set({ showDialogueBeforeNextImage: show }),

    loadMaskForImage: async (imageId) => {
      const { maskDimensions } = get();
      if (!maskDimensions) throw new Error('The mask area is not known yet');
      const ui = useUiStore.getState();
      ui.setBusy('Loading mask...');
      set({ isLoading: true });
      try {
        const saved = await fetchMask(imageId, maskDimensions.width * maskDimensions.height);
        get().initMask(saved?.mask, saved?.userMask);
      } finally {
        set({ isLoading: false });
        ui.setBusy(null);
      }
    },

    saveCurrentMask: async () => {
      const { currentImageId, maskData, userMaskData, isLoading } = get();
      if (isLoading || !currentImageId || !maskData || !userMaskData) return;
      const ui = useUiStore.getState();
      set({ isLoading: true });
      ui.notify('Saving mask...');
      try {
        await saveMask(currentImageId, { mask: maskData, userMask: userMaskData });
        set({ maskChanged: false, lastSaveTime: new Date() });
        ui.notify('Mask saved', 1000);
      } catch (error) {
        ui.showErrorModal(error instanceof Error ? error.message : String(error), 'Could not save the mask');
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    predictMask: async () => {
      const { currentImageId, maskData, userMaskData, classes, config, isLoading, userPixelCounts } = get();
      if (isLoading || !currentImageId || !maskData || !userMaskData) return;
      if (classesWithEnoughPixels(userPixelCounts, classes.length) < 2) {
        throw new Error('You need to draw at least 10 pixels for more than one class to use the AI.');
      }

      const ui = useUiStore.getState();
      set({ isLoading: true });
      ui.setBusy('Train AI...');
      try {
        const model = await fetchAiModel(config?.segmentation?.ai_model ?? {});
        const split = splitTrainingPixels(maskData, userMaskData, classes.length, {
          trainRatio: model.train_ratio ?? 0.8,
          maxTrainPixels: model.max_train_pixels ?? 20000,
        });
        // The AI learns in the browser, next to the pixels of the image
        const predictions = await rasterEngine().predict(currentImageId, {
          maskArea: get().maskArea!,
          trainPixels: split.trainPixels,
          trainLabels: split.trainLabels,
          model: {
            n_estimators: 20,
            max_depth: 10,
            n_leaves: 10,
            ...model,
          } as AiModelSettings,
        });
        const result = testPredictions(split, predictions, classes.length);
        const confusionMatrix = get().createConfusionMatrix(
          result.matrix, result.truePositives, split.classes, classes.map((c) => c.name)
        );

        // The AI fills in the pixels the user did not draw
        const current = get();
        const merged = new Uint8Array(current.maskData!);
        for (let i = 0; i < merged.length; i++) {
          if (!current.userMaskData![i]) merged[i] = predictions[i];
        }

        const worst = confusionMatrix.accuracyStats.worstClass;
        set({
          maskData: merged,
          errorsMaskData: result.errorsMask,
          confusionMatrix,
          aiRecommendation: worst === null
            ? 'Draw more training pixels!'
            : `Could you provide more training pixels for ${classes[worst]?.name ?? `Class ${worst}`}?`,
          maskChanged: true,
          showDialogueBeforeNextImage: true,
        });
        get().redrawMask();
        get().updateHistory();
      } finally {
        set({ isLoading: false });
        ui.setBusy(null);
      }
    },

    createConfusionMatrix: (matrix, truePositives, userClasses, classNames) => {
      let totalSamples = 0;
      for (const row of matrix) for (const count of row) totalSamples += count;

      // Accuracy of each class on its test pixels; the score is the harmonic
      // mean of them, n * product / sum as IRIS always computed it
      const perClass: number[] = [];
      let worstClass: number | null = null;
      let worstAccuracy = 1;
      let sum = 0;
      let product = userClasses.length;
      for (const classId of userClasses) {
        const tested = Math.max(1, (matrix[classId] ?? []).reduce((a, b) => a + b, 0));
        const accuracy = (truePositives[classId] || 0) / tested;
        perClass[classId] = accuracy;
        sum += accuracy;
        product *= accuracy;
        if (accuracy < worstAccuracy) {
          worstAccuracy = accuracy;
          worstClass = classId;
        }
      }

      return {
        matrix,
        classCount: matrix.length,
        totalSamples,
        accuracyStats: {
          overall: userClasses.length && sum > 0 ? product / sum : 0,
          perClass,
          worstClass,
          worstAccuracy,
          truePositives,
        },
        timestamp: new Date(),
        classes: classNames,
      };
    },

    updateConfusionMatrix: (confusionMatrix) => set({ confusionMatrix }),
  };
});
