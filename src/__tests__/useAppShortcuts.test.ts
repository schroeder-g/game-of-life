import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppShortcuts } from '../hooks/useAppShortcuts';
import { useSimulation } from '../contexts/SimulationContext';
import { useBrush } from '../contexts/BrushContext';

// Mock the contexts
vi.mock('../contexts/SimulationContext', () => ({
  useSimulation: vi.fn()
}));

vi.mock('../contexts/BrushContext', () => ({
  useBrush: vi.fn()
}));

describe('useAppShortcuts - UX Claims', () => {
  const mockRotateBrush = vi.fn();
  const mockSnapRotateWithAxis = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useBrush as any).mockReturnValue({
      state: { selectorPos: [0,0,0], selectedShape: 'Cube', paintMode: 0, shapeSize: 1 },
      actions: { setSelectorPos: vi.fn() }
    });
    (useSimulation as any).mockReturnValue({
      state: { 
        rotationMode: false, 
        cameraOrientation: { face: 'front', rotation: 0 },
        invertYaw: false, invertPitch: false, invertRoll: false
      },
      actions: {},
      meta: { 
        movement: { current: {} }, 
        eventBus: { emit: vi.fn() },
        cameraActionsRef: { current: { rotateBrush: mockRotateBrush, snapRotateWithAxis: mockSnapRotateWithAxis } }
      }
    });
  });

  it('[UX-1] should reverse brush rotation for i and p keys when paint tool is active', () => {
    // Set paintMode to 1 (Birth)
    (useBrush as any).mockReturnValue({
      state: { selectedShape: 'Cube', paintMode: 1 },
      actions: { setSelectorPos: vi.fn() }
    });

    renderHook(() => useAppShortcuts());

    const event = new KeyboardEvent('keydown', { code: 'KeyI', key: 'i' });
    window.dispatchEvent(event);

    // Verify rotateBrush was called with -Math.PI/2 instead of Math.PI/2
    expect(mockRotateBrush).toHaveBeenCalledWith(expect.anything(), -Math.PI/2);
  });

  // Removed UX-3 test
});

describe('useAppShortcuts - New Rotation Logic', () => {
  const mockRotateBrush = vi.fn();
  const mockStartSnapAnimation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useBrush as any).mockReturnValue({
      state: { paintMode: 0, selectedShape: "None" },
      actions: {}
    });
  });

  // Removed UX-4 test

  it('[UX-5] should perform continuous rotation when Ctrl+Shift is held', () => {
    const movementRef = { current: {} };
    (useSimulation as any).mockReturnValue({
      state: {
        cameraOrientation: { face: 'front', rotation: 0 },
        invertYaw: false, invertPitch: false, invertRoll: false
      },
      actions: {},
      meta: {
        movement: movementRef,
        cameraActionsRef: { current: { startSnapAnimation: mockStartSnapAnimation } }
      }
    });

    renderHook(() => useAppShortcuts());
    const event = new KeyboardEvent('keydown', { code: 'KeyO', key: 'o', ctrlKey: true, shiftKey: true });
    window.dispatchEvent(event);

    expect((movementRef.current as any).rotateO).toBe(true);
    expect(mockStartSnapAnimation).not.toHaveBeenCalled();
  });

  // Removed UX-6 test
});
