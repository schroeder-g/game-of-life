import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrushProvider, useBrush } from '../contexts/BrushContext';
import React from 'react';

// Wrapper for the context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrushProvider>{children}</BrushProvider>
);

describe('BrushContext', () => {
  it('[UC-5] should initialize with default values', () => {
    const { result } = renderHook(() => useBrush(), { wrapper });
    expect(result.current.state.selectedShape).toBe('Single Cell');
    expect(result.current.state.shapeSize).toBe(1);
    expect(result.current.state.paintMode).toBe(0);
  });

  it('[UX-1] should change shape size correctly', () => {
    const { result } = renderHook(() => useBrush(), { wrapper });
    // First switch to Cube so changeSize is not blocked
    act(() => {
      result.current.actions.setSelectedShape('Cube');
    });
    act(() => {
      result.current.actions.changeSize(1, 100);
    });
    // Should be at min 2 for Cube + 1 = 3
    expect(result.current.state.shapeSize).toBe(3);
  });

  it('[UC-4] should toggle paint modes correctly', () => {
    const { result } = renderHook(() => useBrush(), { wrapper });
    act(() => {
      result.current.actions.setPaintMode(1);
    });
    expect(result.current.state.paintMode).toBe(1);
    
    act(() => {
      result.current.actions.setPaintMode(0);
    });
    expect(result.current.state.paintMode).toBe(0);
  });
});
