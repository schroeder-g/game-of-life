import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsSidebar } from '../SettingsSidebar';
import { useSimulation } from '../../contexts/SimulationContext';
import { useGenesisConfig } from '../../contexts/GenesisConfigContext';
import { useBrush } from '../../contexts/BrushContext';
import * as THREE from 'three';

// Mock hooks
const mockUseSimulation = vi.fn();
const mockUseGenesisConfig = vi.fn();
const mockUseBrush = vi.fn();

vi.mock('../../contexts/SimulationContext', () => ({
  useSimulation: () => mockUseSimulation(),
}));
vi.mock('../../contexts/GenesisConfigContext', () => ({
  useGenesisConfig: () => mockUseGenesisConfig(),
}));
vi.mock('../../contexts/BrushContext', () => ({
  useBrush: () => mockUseBrush(),
}));

// Mock usePersistentState to always return initial value
vi.mock('../../hooks/usePersistentState', () => ({
  usePersistentState: (key: string, defaultValue: any) => [defaultValue, vi.fn()],
}));

describe('SettingsSidebar', () => {
  let mockSimulationState: any;
  let mockSimulationActions: any;
  let mockGenesisConfigState: any;
  let mockGenesisConfigActions: any;
  let mockBrushState: any;

  beforeEach(() => {
    mockSimulationState = {
      gridSize: 20,
      running: false,
      viewMode: false, // Edit mode for SceneManagementSection
      density: 0.08,
      cellMargin: 0.1,
      surviveMin: 5, surviveMax: 7, birthMin: 6, birthMax: 6, birthMargin: 0,
      neighborFaces: true, neighborEdges: true, neighborCorners: true,
      panSpeed: 50, rotationSpeed: 100, rollSpeed: 50,
      invertYaw: false, invertPitch: false, invertRoll: false,
      easeIn: 0.5, easeOut: 0.5,
      cameraOrientation: { face: 'front', rotation: 0 },
      community: [],
      buildInfo: { distribution: 'dev' },
    };
    mockSimulationActions = {
      setGridSize: vi.fn(), reset: vi.fn(), clear: vi.fn(), randomize: vi.fn(), setDensity: vi.fn(), setCellMargin: vi.fn(),
      setSurviveMin: vi.fn(), setSurviveMax: vi.fn(), setBirthMin: vi.fn(), setBirthMax: vi.fn(), setBirthMargin: vi.fn(),
      setNeighborFaces: vi.fn(), setNeighborEdges: vi.fn(), setNeighborCorners: vi.fn(),
      setPanSpeed: vi.fn(), setRotationSpeed: vi.fn(), setRollSpeed: vi.fn(),
      setInvertYaw: vi.fn(), setInvertPitch: vi.fn(), setInvertRoll: vi.fn(),
      setEaseIn: vi.fn(), setEaseOut: vi.fn(),
      setSelectorPos: vi.fn(), // For SelectorPositionSection
      applyCells: vi.fn(), fitDisplay: vi.fn(),
      playStop: vi.fn(), // Added for UX-7 test
    };
    mockGenesisConfigState = {
      savedConfigs: { 'Default': { name: 'Default', cells: [], settings: {} } },
      selectedConfigName: 'Default',
      newConfigName: '',
    };
    mockGenesisConfigActions = {
      setSelectedConfigName: vi.fn(), setNewConfigName: vi.fn(), saveConfig: vi.fn(),
      exportConfig: vi.fn(), importConfig: vi.fn(), deleteConfig: vi.fn(),
    };
    mockBrushState = {
      selectorPos: [10, 10, 10],
      selectedShape: 'Cube',
      shapeSize: 3,
      isHollow: false,
      customOffsets: [],
      brushQuaternion: { current: new THREE.Quaternion() },
    };

    mockUseSimulation.mockReturnValue({
      state: mockSimulationState,
      actions: mockSimulationActions,
      meta: {
        gridRef: { current: { getLivingCells: () => [], get: vi.fn(), getAllCommunities: vi.fn() } },
        eventBus: { on: vi.fn(() => vi.fn()), emit: vi.fn() },
        cameraActionsRef: { current: { birthBrushCells: vi.fn(), clearBrushCells: vi.fn() } },
      },
    });
    mockUseGenesisConfig.mockReturnValue({
      state: mockGenesisConfigState,
      actions: mockGenesisConfigActions,
    });
    mockUseBrush.mockReturnValue({
      state: mockBrushState,
      actions: { setSelectorPos: vi.fn() },
    });

    // Mock window.innerWidth for SettingsSidebar's initial collapsed state
    // This is already handled by setup-browser-env.ts, but we can override if needed.
    // For this test, we'll ensure it's set to a desktop width.
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('[SS_SCENE_NAME_INPUT_001_TEST][UX-7] focused input suppresses global shortcuts', async () => {
    render(<SettingsSidebar isSmallScreen={false} />);

    // Ensure Scene Management section is expanded (default for non-small screen)
    const sceneManagementHeader = screen.getByRole('heading', { name: /Scene Management/i });
    // If it's collapsed, click to expand. If it's open, clicking will collapse it, so we need to ensure it's open.
    // For this test, we assume it's open by default as usePersistentState is mocked to return initial value (false for collapsed)
    // If it's collapsed, click to expand.
    if (sceneManagementHeader.nextElementSibling?.classList.contains('collapsed')) {
      fireEvent.click(sceneManagementHeader);
    }

    const sceneNameInput = screen.getByPlaceholderText('New scene name...');
    fireEvent.focus(sceneNameInput);
    expect(sceneNameInput).toHaveFocus();

    // Simulate typing 'R' (which is also a global reset shortcut)
    fireEvent.change(sceneNameInput, { target: { value: 'R' } });

    // Assert that the input received the character
    expect(sceneNameInput).toHaveValue('R');
    // Assert that the global reset action was NOT called
    expect(mockSimulationActions.reset).not.toHaveBeenCalled();

    // Simulate typing ' ' (space, which is also a global play/pause shortcut)
    fireEvent.change(sceneNameInput, { target: { value: 'R ' } });
    expect(sceneNameInput).toHaveValue('R ');
    expect(mockSimulationActions.playStop).not.toHaveBeenCalled();
  });

  it('[SS_CURSOR_POSITION_KEY_HINTS_001_TEST][QA-2] SelectorPositionSection displays correct key hints based on camera orientation', () => {
    // Set camera orientation to a known state: 'front' face, '0' rotation
    mockUseSimulation.mockReturnValue({
      ...mockUseSimulation(),
      state: {
        ...mockSimulationState,
        viewMode: false, // Ensure edit mode
        cameraOrientation: { face: 'front', rotation: 0 },
      },
    });
    const { rerender } = render(<SettingsSidebar isSmallScreen={false} />);

    // Ensure Selector Position section is expanded
    const selectorPositionHeader = screen.getByRole('heading', { name: /Cursor Position/i });
    // If it's collapsed, click to expand.
    if (selectorPositionHeader.nextElementSibling?.classList.contains('collapsed')) {
      fireEvent.click(selectorPositionHeader);
    }

    // For 'front' face, '0' rotation:
    // KEY_MAP['front'][0] = { w: [0, 1, 0], x: [0, -1, 0], a: [-1, 0, 0], d: [1, 0, 0], q: [0, 0, -1], z: [0, 0, 1] }
    // X-axis: 'a' for dec, 'd' for inc
    // Y-axis: 'x' for dec, 'w' for inc
    // Z-axis: 'q' for dec, 'z' for inc (assuming Z is depth, -1 is farther, 1 is closer)

    // Check X axis hints
    const xCoordContainer = screen.getByText('X').closest('.coordinate-input-container');
    expect(xCoordContainer).toHaveTextContent('D'); // inc
    expect(xCoordContainer).toHaveTextContent('A'); // dec

    // Check Y axis hints
    const yCoordContainer = screen.getByText('Y').closest('.coordinate-input-container');
    expect(yCoordContainer).toHaveTextContent('W'); // inc
    expect(yCoordContainer).toHaveTextContent('X'); // dec

    // Check Z axis hints
    const zCoordContainer = screen.getByText('Z').closest('.coordinate-input-container');
    expect(zCoordContainer).toHaveTextContent('Z'); // inc
    expect(zCoordContainer).toHaveTextContent('Q'); // dec

    // Change camera orientation to 'right', '90' rotation
    mockUseSimulation.mockReturnValue({
      ...mockUseSimulation(),
      state: {
        ...mockSimulationState,
        viewMode: false,
        cameraOrientation: { face: 'right', rotation: 90 },
      },
    });
    // Re-render to apply new mock state
    rerender(<SettingsSidebar isSmallScreen={false} />);

    // For 'right' face, '90' rotation:
    // KEY_MAP['right'][90] = { w: [0, 0, 1], x: [0, 0, -1], a: [0, 1, 0], d: [0, -1, 0], q: [-1, 0, 0], z: [1, 0, 0] }
    // X-axis: 'q' for dec, 'z' for inc
    // Y-axis: 'd' for dec, 'a' for inc
    // Z-axis: 'x' for dec, 'w' for inc

    // Check X axis hints
    const xCoordContainerRight = screen.getByText('X').closest('.coordinate-input-container');
    expect(xCoordContainerRight).toHaveTextContent('Z'); // inc
    expect(xCoordContainerRight).toHaveTextContent('Q'); // dec

    // Check Y axis hints
    const yCoordContainerRight = screen.getByText('Y').closest('.coordinate-input-container');
    expect(yCoordContainerRight).toHaveTextContent('A'); // inc
    expect(yCoordContainerRight).toHaveTextContent('D'); // dec

    // Check Z axis hints
    const zCoordContainerRight = screen.getByText('Z').closest('.coordinate-input-container');
    expect(zCoordContainerRight).toHaveTextContent('W'); // inc
    expect(zCoordContainerRight).toHaveTextContent('X'); // dec
  });
});
