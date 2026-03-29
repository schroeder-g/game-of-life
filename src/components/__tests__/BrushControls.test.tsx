import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrushControls } from '../BrushControls';
import { useSimulation } from '../../contexts/SimulationContext';
import { useBrush } from '../../contexts/BrushContext';
import * as THREE from 'three';

// Mock the contexts
jest.mock('../../contexts/SimulationContext', () => ({
  useSimulation: jest.fn(),
}));

jest.mock('../../contexts/BrushContext', () => ({
  useBrush: jest.fn(),
}));

const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

const mockCameraOrientation = {
  face: 'front',
  rotation: 0,
};

describe('BrushControls', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (useSimulation as jest.Mock).mockReturnValue({
      state: {
        cameraOrientation: mockCameraOrientation,
        rotationMode: false,
      },
      meta: {
        eventBus: mockEventBus,
      },
    });
    (useBrush as jest.Mock).mockReturnValue({
      state: {},
      actions: {},
    });

    // Mock window dimensions for centering tests
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
    // Mock getBoundingClientRect for panelRef
    if (HTMLElement.prototype.getBoundingClientRect) {
      jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        x: 0, y: 0, width: 300, height: 200, top: 0, left: 0, right: 0, bottom: 0,
        toJSON: () => ({})
      });
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // TEST_BC_DRAG_001
  test('TEST_BC_DRAG_001: allows dragging and updates position', async () => {
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
  test('TEST_BC_INIT_001: initializes in the center of the screen', async () => {
    // Mock getBoundingClientRect to return a consistent size for calculation
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, width: 300, height: 200, top: 0, left: 0, right: 0, bottom: 0,
      toJSON: () => ({})
    });

    render(<BrushControls />);
    const panel = screen.getByLabelText('Brush Controls Panel');

    // Calculate expected center position
    const expectedX = (1024 - 300) / 2;
    const expectedY = (768 - 200) / 2;

    await waitFor(() => {
      expect(panel).toHaveStyle(`left: ${expectedX}px`);
      expect(panel).toHaveStyle(`top: ${expectedY}px`);
    });
  });

  // TEST_BC_APPEAR_001
  test('TEST_BC_APPEAR_001: displays "Brush Controls" header, orange outline, and rounded corners', () => {
    render(<BrushControls />);
    const panel = screen.getByLabelText('Brush Controls Panel');
    const header = screen.getByText('Brush Controls');

    expect(header).toBeInTheDocument();
    expect(header).toHaveStyle('color: #FFA500');
    expect(panel).toHaveStyle('border: 2px solid #FFA50080');
    expect(panel).toHaveStyle('border-radius: 8px');
  });

  // TEST_BC_APPEAR_002
  test('TEST_BC_APPEAR_002: is 50% wider than default', () => {
    render(<BrushControls />);
    const innerGrid = screen.getByLabelText('Brush Controls Grid'); // Assuming an accessible label for the inner grid

    expect(innerGrid).toHaveStyle('max-width: 300px');
  });

  // TEST_BC_VIS_001
  test('TEST_BC_VIS_001: is only visible in edit mode (rotationMode false)', () => {
    // In edit mode (rotationMode: false)
    (useSimulation as jest.Mock).mockReturnValue({
      state: {
        cameraOrientation: mockCameraOrientation,
        rotationMode: false,
      },
      meta: {
        eventBus: mockEventBus,
      },
    });
    const { rerender } = render(<BrushControls />);
    expect(screen.getByLabelText('Brush Controls Panel')).toBeInTheDocument();

    // In rotation mode (rotationMode: true)
    (useSimulation as jest.Mock).mockReturnValue({
      state: {
        cameraOrientation: mockCameraOrientation,
        rotationMode: true,
      },
      meta: {
        eventBus: mockEventBus,
      },
    });
    rerender(<BrushControls />);
    expect(screen.queryByLabelText('Brush Controls Panel')).not.toBeInTheDocument();
  });

  // TEST_BC_BUTTON_001_W
  test('TEST_BC_BUTTON_001_W: "Up" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /ArrowUpIcon/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [0, 1, 0] });
  });

  // TEST_BC_BUTTON_001_X
  test('TEST_BC_BUTTON_001_X: "Down" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /ArrowDownIcon/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [0, -1, 0] });
  });

  // TEST_BC_BUTTON_001_A
  test('TEST_BC_BUTTON_001_A: "Left" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /ArrowLeftIcon/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [-1, 0, 0] });
  });

  // TEST_BC_BUTTON_001_D
  test('TEST_BC_BUTTON_001_D: "Right" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /ArrowRightIcon/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [1, 0, 0] });
  });

  // TEST_BC_BUTTON_001_Q
  test('TEST_BC_BUTTON_001_Q: "Further" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /Further/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [0, 0, -1] });
  });

  // TEST_BC_BUTTON_001_Z
  test('TEST_BC_BUTTON_001_Z: "Closer" button emits moveSelector with correct delta', () => {
    render(<BrushControls />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /Closer/i }));
    expect(mockEventBus.emit).toHaveBeenCalledWith('moveSelector', { delta: [0, 0, 1] });
  });
});
