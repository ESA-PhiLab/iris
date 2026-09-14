import { describe, it, expect, beforeEach } from 'vitest';
import { useSegmentationStore } from './segmentationStore';

describe('segmentationStore - errorsMask', () => {
  beforeEach(() => {
    // Reset store state
    useSegmentationStore.getState().setMaskDimensions({ width: 10, height: 10 });
    useSegmentationStore.getState().setErrorsMaskData(new Uint8Array(100));
  });

  it('should initialize with null errors mask', () => {
    useSegmentationStore.setState({ errorsMaskData: null, maskDimensions: null });
    const { errorsMaskData } = useSegmentationStore.getState();
    expect(errorsMaskData).toBeNull();
  });

  it('should set valid errors mask data', () => {
    const testData = new Uint8Array(100);
    testData.fill(1); // All correct predictions
    const { setErrorsMaskData } = useSegmentationStore.getState();
    
    setErrorsMaskData(testData);
    
    const { errorsMaskData } = useSegmentationStore.getState();
    expect(errorsMaskData).toEqual(testData);
    expect(errorsMaskData).not.toBe(testData); // Should be a copy
  });

  it('should handle prediction error values correctly', () => {
    const testData = new Uint8Array(100);
    testData[0] = 0; // Unknown
    testData[1] = 1; // Correct
    testData[2] = 2; // Incorrect
    const { setErrorsMaskData } = useSegmentationStore.getState();
    
    setErrorsMaskData(testData);
    
    const { errorsMaskData } = useSegmentationStore.getState();
    expect(errorsMaskData![0]).toBe(0);
    expect(errorsMaskData![1]).toBe(1);
    expect(errorsMaskData![2]).toBe(2);
  });

  it('should reject invalid errors mask data', () => {
    const { setErrorsMaskData } = useSegmentationStore.getState();
    const originalData = useSegmentationStore.getState().errorsMaskData;
    
    // Test wrong data type
    setErrorsMaskData('invalid' as any);
    expect(useSegmentationStore.getState().errorsMaskData).toEqual(originalData); // Should remain unchanged
    
    // Test wrong length
    setErrorsMaskData(new Uint8Array(50)); // Wrong size
    expect(useSegmentationStore.getState().errorsMaskData).toEqual(originalData); // Should remain unchanged
  });

  it('should require mask dimensions before setting errors mask', () => {
    // Clear both dimensions and errors mask data
    useSegmentationStore.setState({ maskDimensions: null, errorsMaskData: null });
    const testData = new Uint8Array(100);
    const { setErrorsMaskData } = useSegmentationStore.getState();
    
    setErrorsMaskData(testData);
    
    // Should not set the data without dimensions
    expect(useSegmentationStore.getState().errorsMaskData).toBeNull();
  });

  it('should handle errors mask data with different prediction patterns', () => {
    const testData = new Uint8Array(100);
    // Create a pattern: first 25 unknown, next 25 correct, next 25 incorrect, last 25 mixed
    for (let i = 0; i < 25; i++) testData[i] = 0; // Unknown
    for (let i = 25; i < 50; i++) testData[i] = 1; // Correct
    for (let i = 50; i < 75; i++) testData[i] = 2; // Incorrect
    for (let i = 75; i < 100; i++) testData[i] = i % 3; // Mixed pattern
    
    const { setErrorsMaskData } = useSegmentationStore.getState();
    setErrorsMaskData(testData);
    
    const { errorsMaskData } = useSegmentationStore.getState();
    expect(errorsMaskData).toEqual(testData);
    
    // Verify specific patterns
    expect(errorsMaskData![10]).toBe(0); // Unknown region
    expect(errorsMaskData![35]).toBe(1); // Correct region
    expect(errorsMaskData![60]).toBe(2); // Incorrect region
    expect(errorsMaskData![90]).toBe(0); // Mixed region (90 % 3 = 0)
  });

  it('should maintain data integrity after multiple updates', () => {
    const { setErrorsMaskData } = useSegmentationStore.getState();
    
    // First update
    const data1 = new Uint8Array(100);
    data1.fill(1);
    setErrorsMaskData(data1);
    expect(useSegmentationStore.getState().errorsMaskData).toEqual(data1);
    
    // Second update
    const data2 = new Uint8Array(100);
    data2.fill(2);
    setErrorsMaskData(data2);
    expect(useSegmentationStore.getState().errorsMaskData).toEqual(data2);
    expect(useSegmentationStore.getState().errorsMaskData).not.toEqual(data1);
    
    // Third update with mixed data
    const data3 = new Uint8Array(100);
    for (let i = 0; i < 100; i++) {
      data3[i] = i % 3;
    }
    setErrorsMaskData(data3);
    expect(useSegmentationStore.getState().errorsMaskData).toEqual(data3);
  });
});