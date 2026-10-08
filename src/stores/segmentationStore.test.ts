import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useSegmentationStore } from './segmentationStore';
import { useUiStore } from './uiStore';
import { useViewManagerStore } from './viewManagerStore';
import { encodeMask } from '../services/masks';
import type { ClassConfig, ProjectConfig } from '../types/iris';

const classes: ClassConfig[] = [
  { name: 'Clear', colour: [0, 150, 255, 70] },
  { name: 'Cloud', colour: [255, 255, 0, 70] },
  { name: 'Shadow', colour: [255, 0, 0, 70] },
];

const store = () => useSegmentationStore.getState();

/** A 10 x 8 mask over pixels 100..110 x 200..208 of the image */
const startEditing = () => {
  useSegmentationStore.setState({
    classes,
    currentClass: 1,
    currentTool: 'draw',
    toolSize: 1,
    brushSizes: { draw: 1, eraser: 1 },
    maskType: 'final',
    config: { segmentation: { ai_model: { train_ratio: 0.8, max_train_pixels: 20000 } } } as unknown as ProjectConfig,
    currentImageId: 'coast',
    isLoading: false,
  });
  store().setMaskArea([100, 200, 110, 208]);
  store().initMask();
};

/** Mask value at image pixel x, y */
const maskAt = (x: number, y: number) => store().maskData![(y - 200) * 10 + (x - 100)];
const drawnAt = (x: number, y: number) => store().userMaskData![(y - 200) * 10 + (x - 100)];

const stroke = (...points: Array<[number, number]>) => {
  store().startStroke(points[0]);
  points.slice(1).forEach((point) => store().continueStroke(point));
  store().endStroke();
};

describe('segmentationStore', () => {
  beforeEach(() => {
    startEditing();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('takes the classes and the mask area from the config', () => {
    store().setConfig({
      classes,
      segmentation: { mask_area: [64, 64, 448, 448] },
    } as unknown as ProjectConfig);
    expect(store().classes).toHaveLength(3);
    expect(store().maskDimensions).toEqual({ width: 384, height: 384 });
  });

  it('starts with an empty mask and a step to undo to', () => {
    expect(store().maskData).toHaveLength(80);
    expect(store().maskHistory).toHaveLength(1);
    expect(store().userPixelCounts).toEqual({ 0: 0, 1: 0, 2: 0, total: 0 });
    expect(store().maskChanged).toBe(false);
  });

  it('draws the current class where the brush passes', () => {
    stroke([101.5, 201.5]);
    expect(maskAt(101, 201)).toBe(1);
    expect(drawnAt(101, 201)).toBe(1);
    expect(store().userPixelCounts.total).toBe(1);
    expect(store().maskChanged).toBe(true);
    expect(store().showDialogueBeforeNextImage).toBe(true);
  });

  it('fills the gaps between the points of a stroke', () => {
    stroke([100.5, 200.5], [105.5, 200.5]);
    expect([100, 101, 102, 103, 104, 105].map((x) => maskAt(x, 200))).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('paints a square of the brush size, only inside the mask area', () => {
    useSegmentationStore.setState({ toolSize: 3 });
    stroke([100.5, 200.5]);
    expect(store().userPixelCounts.total).toBe(4);
    expect([maskAt(100, 200), maskAt(101, 201), maskAt(102, 202)]).toEqual([1, 1, 0]);
  });

  it('erases back to the first class and undrawn', () => {
    stroke([103.5, 203.5]);
    store().setCurrentTool('eraser');
    stroke([103.5, 203.5]);
    expect(maskAt(103, 203)).toBe(0);
    expect(drawnAt(103, 203)).toBe(0);
  });

  it('does not draw with the move tool', () => {
    store().setCurrentTool('move');
    stroke([103.5, 203.5]);
    expect(store().userPixelCounts.total).toBe(0);
    expect(store().maskHistory).toHaveLength(1);
  });

  it('undoes and redoes whole strokes', () => {
    stroke([100.5, 200.5], [102.5, 200.5]);
    stroke([105.5, 205.5]);
    expect(store().userPixelCounts.total).toBe(4);

    store().undo();
    expect(store().userPixelCounts.total).toBe(3);
    store().undo();
    expect(store().userPixelCounts.total).toBe(0);
    expect(store().canUndo()).toBe(false);

    store().redo();
    expect(store().userPixelCounts.total).toBe(3);
    // Drawing after undoing drops what could be redone
    stroke([108.5, 207.5]);
    expect(store().canRedo()).toBe(false);
  });

  it('resets the mask in one step that can be undone', () => {
    stroke([101.5, 201.5]);
    store().resetMask();
    expect(store().userPixelCounts.total).toBe(0);
    store().undo();
    expect(store().userPixelCounts.total).toBe(1);
  });

  it('redraws the mask when it changes or is shown differently', () => {
    const version = store().maskVersion;
    stroke([101.5, 201.5]);
    store().setMaskType('user');
    expect(store().maskVersion).toBeGreaterThan(version + 1);
  });

  it('keeps the size of each brush', () => {
    store().setBrushSize('eraser', 20);
    expect(store().toolSize).toBe(1);
    store().setCurrentTool('eraser');
    expect(store().toolSize).toBe(20);
    store().setToolSize(150);
    expect(store().brushSizes.eraser).toBe(100);
  });

  it('switches to drawing when a class is picked', () => {
    store().setCurrentTool('move');
    store().setCurrentClass(2);
    expect(store().currentClass).toBe(2);
    expect(store().currentTool).toBe('draw');
    store().setCurrentClass(7);
    expect(store().currentClass).toBe(2);
  });

  it('recommends to draw until two classes have enough pixels', () => {
    expect(store().aiRecommendation).toBe('Draw at least 10 pixels from two classes!');
    useSegmentationStore.setState({ toolSize: 4 });
    stroke([102, 202]);
    store().setCurrentClass(2);
    useSegmentationStore.setState({ toolSize: 4 });
    stroke([107, 206]);
    expect(store().aiRecommendation).toBe('Start the training!');
  });

  it('loads the mask the user saved', async () => {
    const mask = new Uint8Array(80).fill(2);
    const userMask = new Uint8Array(80);
    userMask[0] = 1;
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(encodeMask({ mask, userMask })));

    await store().loadMaskForImage('coast');

    expect(store().maskData).toEqual(mask);
    expect(store().userPixelCounts).toEqual({ 0: 0, 1: 0, 2: 1, total: 1 });
    expect(store().maskChanged).toBe(false);
  });

  it('starts empty when the user has no mask of the image', async () => {
    stroke([101.5, 201.5]);
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('No user mask available!', { status: 404 }));

    await store().loadMaskForImage('coast');

    expect(store().userPixelCounts.total).toBe(0);
  });

  it('saves the mask', async () => {
    stroke([101.5, 201.5]);
    const fetch = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('Masks successfully saved!'));

    await store().saveCurrentMask();

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/segmentation/save_mask/coast');
    expect(init!.body).toEqual(encodeMask({ mask: store().maskData!, userMask: store().userMaskData! }));
    expect(store().maskChanged).toBe(false);
  });

  it('shows why a mask could not be saved', async () => {
    stroke([101.5, 201.5]);
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('disk full', { status: 500 }));

    await expect(store().saveCurrentMask()).rejects.toThrow(/disk full/);
    expect(useUiStore.getState().errorModal.isOpen).toBe(true);
    expect(store().maskChanged).toBe(true);
    useUiStore.getState().hideErrorModal();
  });

  it('lets the AI fill in the pixels the user did not draw', async () => {
    // Columns 100-104 are class 1, 105-109 class 2
    useSegmentationStore.setState({ toolSize: 2 });
    for (let y = 200.5; y < 208; y += 2) stroke([101, y], [104, y]);
    store().setCurrentClass(2);
    useSegmentationStore.setState({ toolSize: 2 });
    for (let y = 200.5; y < 208; y += 2) stroke([106, y], [109, y]);
    const drawn = new Uint8Array(store().userMaskData!);

    // The AI says class 1 everywhere: right for half the test pixels
    const predictions = new Uint8Array(80).fill(1);
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(predictions));

    await store().predictMask();

    for (let i = 0; i < 80; i++) {
      if (!drawn[i]) expect(store().maskData![i]).toBe(1);
    }
    expect(Array.from(store().userMaskData!)).toEqual(Array.from(drawn));
    const { accuracyStats } = store().confusionMatrix!;
    expect(accuracyStats.perClass[1]).toBe(1);
    expect(accuracyStats.perClass[2]).toBe(0);
    expect(accuracyStats.worstClass).toBe(2);
    expect(store().aiRecommendation).toMatch(/Shadow/);
    expect(Array.from(store().errorsMaskData!).filter((v) => v === 2).length).toBeGreaterThan(0);
  });

  it('needs two classes with enough pixels for the AI', async () => {
    stroke([101.5, 201.5]);
    await expect(store().predictMask()).rejects.toThrow(/at least 10 pixels/);
  });

  it('scores the AI with the harmonic mean of the class accuracies', () => {
    const matrix = store().createConfusionMatrix([[8, 2], [1, 9]], { 0: 8, 1: 9 }, [0, 1], ['A', 'B']);
    expect(matrix.accuracyStats.overall).toBeCloseTo((2 * 0.8 * 0.9) / (0.8 + 0.9));
    expect(matrix.totalSamples).toBe(20);
  });

  it('knows the images before and after the current one', () => {
    useSegmentationStore.setState({
      images: ['a', 'b', 'c'].map((id) => ({
        image_id: id, has_user_annotation: false, has_any_annotation: false, annotation_count: 0,
      })),
      currentImageId: 'b',
    });
    expect(store().getPrevImageId()).toBe('a');
    expect(store().getNextImageId()).toBe('c');
    useSegmentationStore.setState({ currentImageId: 'c' });
    expect(store().getNextImageId()).toBeNull();
  });

  it('resets the views of the map', () => {
    const count = useViewManagerStore.getState().resetViewsCount;
    store().resetViews();
    expect(useViewManagerStore.getState().resetViewsCount).toBe(count + 1);
  });
});
