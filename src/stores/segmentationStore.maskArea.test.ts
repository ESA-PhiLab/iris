import { describe, it, expect, beforeEach } from 'vitest';
import { useSegmentationStore } from './segmentationStore';

describe('segmentationStore - maskArea', () => {
  beforeEach(() => {
    useSegmentationStore.getState().setMaskArea(null);
  });

  it('should initialize with null mask area', () => {
    const { maskArea } = useSegmentationStore.getState();
    expect(maskArea).toBeNull();
  });

  it('should set valid mask area coordinates', () => {
    const testArea: [number, number, number, number] = [10, 20, 100, 200];
    const { setMaskArea, getMaskArea } = useSegmentationStore.getState();
    
    setMaskArea(testArea);
    expect(getMaskArea()).toEqual(testArea);
  });

  it('should reject invalid mask area coordinates', () => {
    const { setMaskArea, getMaskArea } = useSegmentationStore.getState();
    
    // Test invalid array length
    setMaskArea([10, 20, 100] as any);
    expect(getMaskArea()).toBeNull();
    
    // Test non-numeric values
    setMaskArea([10, 'invalid', 100, 200] as any);
    expect(getMaskArea()).toBeNull();
    
    // Test NaN values
    setMaskArea([10, NaN, 100, 200]);
    expect(getMaskArea()).toBeNull();
  });

  it('should handle null mask area', () => {
    const { setMaskArea, getMaskArea } = useSegmentationStore.getState();
    
    // Set valid area first
    setMaskArea([10, 20, 100, 200]);
    expect(getMaskArea()).not.toBeNull();
    
    // Set to null
    setMaskArea(null);
    expect(getMaskArea()).toBeNull();
  });

  it('should handle edge case coordinates', () => {
    const { setMaskArea, getMaskArea } = useSegmentationStore.getState();
    
    // Test zero coordinates
    setMaskArea([0, 0, 0, 0]);
    expect(getMaskArea()).toEqual([0, 0, 0, 0]);
    
    // Test negative coordinates
    setMaskArea([-10, -20, 100, 200]);
    expect(getMaskArea()).toEqual([-10, -20, 100, 200]);
    
    // Test large coordinates
    setMaskArea([1000, 2000, 5000, 8000]);
    expect(getMaskArea()).toEqual([1000, 2000, 5000, 8000]);
  });
});