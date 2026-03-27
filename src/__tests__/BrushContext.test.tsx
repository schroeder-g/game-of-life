import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrushProvider, useBrush } from '../contexts/BrushContext';
import React from 'react';

// Wrapper for the context
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrushProvider>{children}</BrushProvider>
);

describe('BrushContext', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useBrush(), { wrapper });
    expect(result.current.state.selectedShape).toBe('Cube');
    expect(result.current.state.shapeSize).toBe(1);
    expect(result.current.state.paintMode).toBe(0);
  });

  it('should change shape size correctly', () => {
    const { result } = renderHook(() => useBrush(), { wrapper });
    act(() => {
      result.current.actions.changeSize(1, 0);
    });
    expect(result.current.state.shapeSize).toBe(2);
  });

  it('should toggle paint modes correctly', () => {
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
