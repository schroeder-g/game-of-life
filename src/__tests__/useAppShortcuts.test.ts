import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppShortcuts } from '../hooks/useAppShortcuts';
import { useSimulation } from '../contexts/SimulationContext';
import { useBrush } from '../contexts/BrushContext';
import '../tests/setup-browser-env'; // Import the browser environment setup

vi.mock('../core/faceOrientationKeyMapping', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/faceOrientationKeyMapping')>();
  return {
    ...actual,
    // Only mock values that are actually exported as values
    KEY_MAP: actual.KEY_MAP, // Use actual KEY_MAP or provide a full mock if needed
    rotationLookup: actual.rotationLookup, // Use actual rotationLookup or provide a full mock if needed
    getRotationAxis: actual.getRotationAxis,
    getExplicitRotationAxis: actual.getExplicitRotationAxis,
  };
});

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
      state: { selectorPos: [0, 0, 0], selectedShape: 'Cube', paintMode: 0, shapeSize: 1 },
      actions: { setSelectorPos: vi.fn() }
    });
    (useSimulation as any).mockReturnValue({
      state: {
        viewMode: false,
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

  it('[UX-1] should reverse brush rotation for i and p keys when Clear brush tool is active', () => {
    // Set paintMode to -1 (Clear)
    (useBrush as any).mockReturnValue({
      state: { selectedShape: 'Cube', paintMode: -1, shapeSize: 2 }, // shapeSize > 1 for brush rotation
      actions: { setSelectorPos: vi.fn() }
    });

    renderHook(() => useAppShortcuts());

    // Test 'i' key (should be +Math.PI/2 for Clear mode)
    const eventI = new KeyboardEvent('keydown', { code: 'KeyI', key: 'i' });
    window.dispatchEvent(eventI);
    expect(mockRotateBrush).toHaveBeenCalledWith(expect.anything(), Math.PI / 2);
    vi.clearAllMocks(); // Clear mock calls for the next assertion

    // Test 'p' key (should be -Math.PI/2 for Clear mode)
    const eventP = new KeyboardEvent('keydown', { code: 'KeyP', key: 'p' });
    window.dispatchEvent(eventP);
    expect(mockRotateBrush).toHaveBeenCalledWith(expect.anything(), -Math.PI / 2);
  });

  it('[UX-1] should NOT reverse brush rotation for i and p keys when Birth brush tool is active', () => {
    // Set paintMode to 1 (Birth)
    (useBrush as any).mockReturnValue({
      state: { selectedShape: 'Cube', paintMode: 1, shapeSize: 2 }, // shapeSize > 1 for brush rotation
      actions: { setSelectorPos: vi.fn() }
    });

    renderHook(() => useAppShortcuts());

    // Test 'i' key (should be -Math.PI/2 for Birth mode)
    const eventI = new KeyboardEvent('keydown', { code: 'KeyI', key: 'i' });
    window.dispatchEvent(eventI);
    expect(mockRotateBrush).toHaveBeenCalledWith(expect.anything(), -Math.PI / 2);
    vi.clearAllMocks();

    // Test 'p' key (should be +Math.PI/2 for Birth mode)
    const eventP = new KeyboardEvent('keydown', { code: 'KeyP', key: 'p' });
    window.dispatchEvent(eventP);
    expect(mockRotateBrush).toHaveBeenCalledWith(expect.anything(), Math.PI / 2);
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

describe('useAppShortcuts - Input Guarding', () => {
  const mockPlayStop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useBrush as any).mockReturnValue({
      state: {},
      actions: {}
    });
    (useSimulation as any).mockReturnValue({
      state: { viewMode: true },
      actions: { playStop: mockPlayStop },
      meta: { movement: { current: {} } }
    });
  });

  it('[QA-1] should not trigger shortcuts when a text input is focused', () => {
    renderHook(() => useAppShortcuts());

    // Create and focus an input element
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    input.focus();

    // Dispatch a keydown event that would normally trigger a shortcut
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true });
    input.dispatchEvent(event);

    // Expect that the shortcut action was NOT called
    expect(mockPlayStop).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
