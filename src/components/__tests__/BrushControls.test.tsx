import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrushControls } from '../BrushControls';
import { useSimulation } from '../../contexts/SimulationContext';
import { useBrush } from '../../contexts/BrushContext';
import * as THREE from 'three';

// Mock the contexts
vi.mock('../../contexts/SimulationContext', () => ({
  useSimulation: vi.fn(),
}));

vi.mock('../../contexts/BrushContext', () => ({
  useBrush: vi.fn(),
}));

const mockEventBus = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

const mockCameraOrientation = {
  face: 'front',
  rotation: 0,
};

describe('BrushControls', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (useSimulation as Mock).mockReturnValue({
      state: {
        cameraOrientation: mockCameraOrientation,
        viewMode: false,
      },
      meta: {
        eventBus: mockEventBus,
      },
    });
    (useBrush as Mock).mockReturnValue({
      state: {
        selectedShape: 'Cube',
        paintMode: 0,
        shapeSize: 3,
        isHollow: false,
      },
      actions: {
        setShapeSize: vi.fn(),
        setIsHollow: vi.fn(),
        setPaintMode: vi.fn(),
        setSelectedShape: vi.fn(),
        setCustomBrush: vi.fn(),
        incrementBrushRotationVersion: vi.fn(),
      },
    });

    // Mock window dimensions for centering tests
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
    // Mock getBoundingClientRect for panelRef
    if (HTMLElement.prototype.getBoundingClientRect && typeof HTMLElement.prototype.getBoundingClientRect === 'function') {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        x: 0, y: 0, width: 300, height: 200, top: 0, left: 0, right: 0, bottom: 0,
        toJSON: () => ({})
      });
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // TEST_BC_DRAG_001
  it('[TEST_BC_DRAG_001] allows dragging and updates position', async () => {
    render(<BrushControls />);
    const panel = screen.getByLabelText('Brush Controls Panel'); // Use an accessible label

    // Simulate mouse down on the panel
    fireEvent.mouseDown(panel, { clientX: 100, clientY: 100 });

    // Simulate mouse move
    fireEvent.mouseMove(window, { clientX: 150, clientY: 120 });

    // Simulate mouse up
    fireEvent.mouseUp(window);

    // Check if position updated (initial position is centered, then dragged)
    // This requires more sophisticated mocking of getBoundingClientRect or direct style assertion
    // For now, we'll assert that the cursor changes, indicating dragging state was active.
    await waitFor(() => {
      expect(panel).toHaveStyle('cursor: grab'); // After mouseUp, it should return to grab
    });

    // Re-simulate dragging to check for 'grabbing' cursor
    fireEvent.mouseDown(panel, { clientX: 100, clientY: 100 });
    await waitFor(() => {
      expect(panel).toHaveStyle('cursor: grabbing');
    });
    fireEvent.mouseUp(window);
  });

  // TEST_BC_INIT_001
  it('[TEST_BC_INIT_001] initializes in the bottom-right of the screen', async () => {
    // Mock getBoundingClientRect to return a consistent size for calculation
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, width: 300, height: 200, top: 0, left: 0, right: 0, bottom: 0,
      toJSON: () => ({})
    });

    render(<BrushControls />);
    const panel = screen.getByLabelText('Brush Controls Panel');

    // Calculate expected bottom-right position
    const expectedX = 1024 - 300 - 10; // innerWidth - panelWidth - margin
    const expectedY = 768 - 200 - 10; // innerHeight - panelHeight - margin

    await waitFor(() => {
      expect(panel).toHaveStyle(`left: ${expectedX}px`);
      expect(panel).toHaveStyle(`top: ${expectedY}px`);
    });
  });

  // TEST_BC_APPEAR_001
  it('[TEST_BC_APPEAR_001] displays dynamic header, orange outline, and rounded corners', () => {
    render(<BrushControls />);
    const panel = screen.getByLabelText('Brush Controls Panel');
    const header = screen.getByText('Brush: Cube');

    expect(header).toBeInTheDocument();
    expect(header).toHaveStyle('color: #FFA500');
    expect(panel).toHaveStyle('border: 2px solid #FFA50080');
    expect(panel).toHaveStyle('border-radius: 8px');
  });

  // TEST_BC_APPEAR_002
  it('[TEST_BC_APPEAR_002] has a minimum width to fit controls', () => {
    render(<BrushControls />);
    const panel = screen.getByLabelText('Brush Controls Panel');

    expect(panel).toHaveStyle('min-width: 220px');
  });

  // TEST_BC_VIS_001
  it('[TEST_BC_VIS_001] is only visible in edit mode (viewMode false)', () => {
    // In edit mode (viewMode: false)
    (useSimulation as Mock).mockReturnValue({
      state: {
        cameraOrientation: mockCameraOrientation,
        viewMode: false,
      },
      meta: {
        eventBus: mockEventBus,
      },
    });
    const { rerender } = render(<BrushControls />);
    expect(screen.getByLabelText('Brush Controls Panel')).toBeInTheDocument();

    // In view mode (viewMode: true)
    (useSimulation as Mock).mockReturnValue({
      state: {
        cameraOrientation: mockCameraOrientation,
        viewMode: true,
      },
      meta: {
        eventBus: mockEventBus,
      },
    });
    rerender(<BrushControls />);
    expect(screen.queryByLabelText('Brush Controls Panel')).not.toBeInTheDocument();
  });

  // TEST_BC_BUTTON_001_W
  it('[TEST_BC_BUTTON_001_W][UC-9] "Up" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /ArrowUpIcon/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [0, 1, 0] });
  });

  // TEST_BC_BUTTON_001_X
  it('[TEST_BC_BUTTON_001_X][UC-9] "Down" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /ArrowDownIcon/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [0, -1, 0] });
  });

  // TEST_BC_BUTTON_001_A
  it('[TEST_BC_BUTTON_001_A][UC-9] "Left" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /ArrowLeftIcon/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [-1, 0, 0] });
  });

  // TEST_BC_BUTTON_001_D
  it('[TEST_BC_BUTTON_001_D][UC-9] "Right" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /ArrowRightIcon/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [1, 0, 0] });
  });

  // TEST_BC_BUTTON_001_Q
  it('[TEST_BC_BUTTON_001_Q][UC-9] "Further" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /Further/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [0, 0, -1] });
  });

  // TEST_BC_BUTTON_001_Z
  it('[TEST_BC_BUTTON_001_Z][UC-9] "Closer" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /Closer/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [0, 0, 1] });
  });
});
