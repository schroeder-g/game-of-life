import { describe, it, expect, vi } from 'vitest';
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
        autoSquare: true, 
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

  it('[UX-3] should use continuous rotation in edit mode when Auto-Square is Off', () => {
    const movementRef = { current: {} };
    (useSimulation as any).mockReturnValue({
      state: {
        rotationMode: false, // Edit mode
        autoSquare: false,   // Continuous rotation enabled
        cameraOrientation: { face: 'front', rotation: 0 },
        invertYaw: false, invertPitch: false, invertRoll: false
      },
      actions: {},
      meta: {
        movement: movementRef,
        eventBus: { emit: vi.fn() },
        cameraActionsRef: { current: { rotateBrush: mockRotateBrush, snapRotateWithAxis: mockSnapRotateWithAxis } }
      }
    });

    renderHook(() => useAppShortcuts());

    const event = new KeyboardEvent('keydown', { code: 'KeyO', key: 'o' });
    window.dispatchEvent(event);

    // Verify movement flag was set to true
    expect((movementRef.current as any).rotateO).toBe(true);
  });
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

  it('[UX-4] should trigger a snap-rotation animation when a rotation key is pressed and autoSquare is ON', () => {
    const movementRef = { current: {} };
    (useSimulation as any).mockReturnValue({
      state: {
        rotationMode: true, // View mode
        autoSquare: true,   // Snap mode
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
    const event = new KeyboardEvent('keydown', { code: 'KeyO', key: 'o' });
    window.dispatchEvent(event);

    expect(mockStartSnapAnimation).toHaveBeenCalledWith('o');
    expect((movementRef.current as any).rotateO).toBeFalsy();
  });

  it('[UX-5] should perform continuous rotation when Ctrl+Shift is held, even if autoSquare is ON', () => {
    const movementRef = { current: {} };
    (useSimulation as any).mockReturnValue({
      state: {
        autoSquare: true, // Snap mode is on
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

  it('[UX-6] should rotate the brush, not the camera, when in Edit Mode with an active brush and autoSquare is ON', () => {
    (useBrush as any).mockReturnValue({
      state: { selectedShape: 'Cube', paintMode: 1 }, // Active brush
      actions: {}
    });
    (useSimulation as any).mockReturnValue({
      state: {
        rotationMode: false, // Edit mode
        autoSquare: true,    // Snap mode
        cameraOrientation: { face: 'front', rotation: 0 },
        invertYaw: false, invertPitch: false, invertRoll: false
      },
      actions: {},
      meta: {
        movement: { current: {} },
        cameraActionsRef: { current: { rotateBrush: mockRotateBrush, startSnapAnimation: mockStartSnapAnimation } }
      }
    });

    renderHook(() => useAppShortcuts());
    const event = new KeyboardEvent('keydown', { code: 'KeyI', key: 'i' });
    window.dispatchEvent(event);

    expect(mockRotateBrush).toHaveBeenCalled();
    expect(mockStartSnapAnimation).not.toHaveBeenCalled();
  });
});
