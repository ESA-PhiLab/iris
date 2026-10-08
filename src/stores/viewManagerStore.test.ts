import { describe, it, expect, beforeEach } from 'vitest';
import { useViewManagerStore } from './viewManagerStore';
import { useUiStore } from './uiStore';

const view = (name: string) => ({ name, type: 'image' as const, description: '', data: '$B1' });
const store = () => useViewManagerStore.getState();

describe('viewManagerStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useViewManagerStore.setState({ currentGroup: 'default', camera: null, storageScope: 'project-a' });
    store().setViews({ RGB: view('RGB'), SWIR: view('SWIR'), Snow: view('Snow') });
    store().setViewGroups({ default: ['RGB', 'SWIR'], radar: ['Snow'] });
  });

  it('shows the views of the current group', () => {
    expect(store().getCurrentViews().map((v) => v.name)).toEqual(['RGB', 'SWIR']);
    store().showNextGroup();
    expect(store().getCurrentViews().map((v) => v.name)).toEqual(['Snow']);
    expect(useUiStore.getState().notice?.text).toBe('Group: radar');
    store().showNextGroup();
    expect(store().currentGroup).toBe('default');
  });

  it('adds, replaces and removes views, keeping at least one', () => {
    store().addView('Snow', 1);
    expect(store().viewGroups.default).toEqual(['RGB', 'Snow', 'SWIR']);
    store().replaceView(0, 'SWIR');
    expect(store().viewGroups.default).toEqual(['SWIR', 'Snow', 'SWIR']);
    store().removeView(0);
    store().removeView(0);
    store().removeView(0);
    expect(store().viewGroups.default).toEqual(['SWIR']);
  });

  it('remembers the layout the user left', () => {
    store().replaceView(1, 'Snow');
    store().setCurrentGroup('radar');

    store().setViewGroups({ default: ['RGB', 'SWIR'], radar: ['Snow'], gone: ['RGB'] });

    expect(store().viewGroups.default).toEqual(['RGB', 'Snow']);
    expect(store().currentGroup).toBe('radar');
  });

  it('keeps layouts separate for each project', () => {
    store().replaceView(1, 'Snow');
    store().setStorageScope('project-b');
    store().setViewGroups({ default: ['RGB', 'SWIR'] });
    expect(store().viewGroups.default).toEqual(['RGB', 'SWIR']);
  });

  it('fits the image again when the views are reset', () => {
    store().setCamera({ center: [1, 2], zoom: 10 });
    const count = store().resetViewsCount;
    store().resetCanvas();
    expect(store().camera).toBeNull();
    expect(store().resetViewsCount).toBe(count + 1);
  });

  it('switches the layers of the map', () => {
    const { showImage, showSatellite } = store();
    store().toggleImage();
    store().toggleSatellite();
    expect(store().showImage).toBe(!showImage);
    expect(store().showSatellite).toBe(!showSatellite);
  });
});
