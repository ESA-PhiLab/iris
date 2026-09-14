import { describe, it, expect, beforeEach } from 'vitest';
import { useSegmentationStore } from './segmentationStore';

describe('segmentationStore - apiUrls', () => {
  beforeEach(() => {
    // Reset store state
    useSegmentationStore.setState({ apiUrls: null });
  });

  it('should set and get API URLs', () => {
    const testUrls = {
      main: '/main/',
      segmentation: '/segmentation/',
      user: '/user/',
      admin: '/admin/'
    };
    
    const { setApiUrls, getApiUrl } = useSegmentationStore.getState();
    setApiUrls(testUrls);
    
    // Test setting and getting
    const { apiUrls } = useSegmentationStore.getState();
    expect(apiUrls).toEqual(testUrls);
    
    // Test individual endpoint access
    expect(getApiUrl('main')).toBe('/main/');
    expect(getApiUrl('segmentation')).toBe('/segmentation/');
  });

  it('should handle validation and edge cases', () => {
    const { setApiUrls, getApiUrl, apiUrls } = useSegmentationStore.getState();
    
    // Test invalid endpoint
    const validUrls = {
      main: '/main/',
      segmentation: '/segmentation/',
      user: '/user/',
      admin: '/admin/'
    };
    setApiUrls(validUrls);
    expect(getApiUrl('invalid' as any)).toBeNull();
    
    // Test null when no URLs set
    useSegmentationStore.setState({ apiUrls: null });
    expect(getApiUrl('main')).toBeNull();
    
    // Test invalid inputs
    setApiUrls(null as any);
    expect(apiUrls).toBeNull();
    
    // Test missing endpoints
    setApiUrls({
      main: '/main/',
      user: '/user/'
    } as any);
    expect(apiUrls).toBeNull();
    
    // Test invalid endpoint values
    setApiUrls({
      main: '/main/',
      segmentation: '',
      user: '/user/',
      admin: '/admin/'
    });
    expect(apiUrls).toBeNull();
  });

  it('should handle complex URLs', () => {
    const testUrls = {
      main: 'http://localhost:5000/main/',
      segmentation: 'http://localhost:5000/segmentation/',
      user: 'http://localhost:5000/user/',
      admin: 'http://localhost:5000/admin/'
    };
    
    const { setApiUrls, getApiUrl } = useSegmentationStore.getState();
    setApiUrls(testUrls);
    
    // Test complex URL handling
    expect(getApiUrl('main')).toBe('http://localhost:5000/main/');
  });

  it('should include API URLs in debug info', () => {
    const testUrls = {
      main: '/main/',
      segmentation: '/segmentation/',
      user: '/user/',
      admin: '/admin/'
    };
    
    const { setApiUrls, getDebugInfo } = useSegmentationStore.getState();
    
    // Initially no API URLs
    expect(getDebugInfo().hasApiUrls).toBe(false);
    
    // After setting API URLs
    setApiUrls(testUrls);
    expect(getDebugInfo().hasApiUrls).toBe(true);
  });
});

describe('segmentationStore - apiUrls legacy bridge', () => {
  beforeEach(() => {
    useSegmentationStore.setState({ apiUrls: null });
  });

  it('should provide legacy bridge functions', () => {
    const testUrls = {
      main: '/main/',
      segmentation: '/segmentation/',
      user: '/user/',
      admin: '/admin/'
    };
    
    // Test function existence
    expect(typeof (window as any).getApiUrlsFromStore).toBe('function');
    expect(typeof (window as any).getApiUrlFromStore).toBe('function');
    expect(typeof (window as any).setApiUrlsInStore).toBe('function');
    
    // Test setting via legacy bridge
    (window as any).setApiUrlsInStore(testUrls);
    const { apiUrls } = useSegmentationStore.getState();
    expect(apiUrls).toEqual(testUrls);
    
    // Test getting via legacy bridge
    expect((window as any).getApiUrlsFromStore()).toEqual(testUrls);
    expect((window as any).getApiUrlFromStore('main')).toBe('/main/');
    expect((window as any).getApiUrlFromStore('invalid')).toBeNull();
    
    // Test null handling
    useSegmentationStore.setState({ apiUrls: null });
    expect((window as any).getApiUrlsFromStore()).toBeNull();
    expect((window as any).getApiUrlFromStore('main')).toBeNull();
  });
});
