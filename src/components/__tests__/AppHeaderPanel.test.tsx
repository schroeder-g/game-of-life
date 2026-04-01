import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../tests/test-utils';
import { AppHeaderPanel } from '../AppHeaderPanel';

// Mock hooks used by the component
const mockUseSimulation = vi.fn();
vi.mock('../../contexts/SimulationContext', () => ({
  useSimulation: () => mockUseSimulation(),
}));

const mockUseBrush = vi.fn();
vi.mock('../../contexts/BrushContext', () => ({
  useBrush: () => mockUseBrush(),
}));

const mockUseGenesisConfig = vi.fn();
vi.mock('../../contexts/GenesisConfigContext', () => ({
  useGenesisConfig: () => mockUseGenesisConfig(),
}));

describe('AppHeaderPanel', () => {
  let mockSimulationState: any;
  let mockSimulationActions: any;
  let mockBrushState: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockSimulationState = {
      running: false,
      rotationMode: true, // View mode
      hasInitialState: true,
      hasPastHistory: true,
      cameraOrientation: { face: 'front', rotation: 0 },
      userName: 'Tester',
      buildInfo: { version: '2.1.0', distribution: 'test', buildTime: new Date().toISOString() },
      squareUp: false,
      isSquaredUp: true,
      speed: 5,
      gridSize: 20,
      showIntroduction: false,
      community: [],
    };
    mockSimulationActions = {
      playStop: vi.fn(),
      step: vi.fn(),
      stepBackward: vi.fn(),
      reset: vi.fn(),
      setRotationMode: vi.fn(),
      fitDisplay: vi.fn(),
      recenter: vi.fn(),
      setSquareUp: vi.fn(),
      setSpeed: vi.fn(),
      setShowIntroduction: vi.fn(),
    };
    mockBrushState = {
      selectedShape: 'Cube',
    };

    mockUseSimulation.mockReturnValue({
      state: mockSimulationState,
      actions: mockSimulationActions,
      meta: {
        cameraActionsRef: { current: {} },
        eventBus: { on: vi.fn(() => () => {}), emit: vi.fn() },
        gridRef: { current: { generation: 0, getLivingCells: () => [], on: vi.fn(() => () => {}) } },
      },
    });

    mockUseBrush.mockReturnValue({
      state: mockBrushState,
      actions: {},
    });

    mockUseGenesisConfig.mockReturnValue({
      state: { selectedConfigName: 'Test Scene' },
    });
  });

  it('AHP_TITLE_001: displays title, build info, and welcome message', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    expect(screen.getByText('Cube of Life')).toBeInTheDocument();
    expect(screen.getByText(/Build: 2.1.0/)).toBeInTheDocument();
    expect(screen.getByText('Welcome, Tester!')).toBeInTheDocument();
  });

  it('AHP_STATUS_001: displays scene name, camera orientation, and simulation stats', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    expect(screen.getByText('Scene: Test Scene')).toBeInTheDocument();
    expect(screen.getByText('Face: Front, 0°')).toBeInTheDocument();
    expect(screen.getByText(/Generation: 0 Cells: 0/)).toBeInTheDocument();
  });

  it('AHP_MODAL_001: opens and closes the documentation modal', async () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const helpButton = screen.getByRole('button', { name: 'Help (?)' });
    fireEvent.click(helpButton);

    const docButton = screen.getByRole('button', { name: 'Documentation' });
    fireEvent.click(docButton);

    expect(await screen.findByRole('heading', { name: 'User Manual' })).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);
    expect(screen.queryByRole('heading', { name: 'User Manual' })).not.toBeInTheDocument();
  });

  it('AHPB_CONTROLS_001: toggles between View and Edit mode', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const toggleButton = screen.getByTitle('Switch to Edit Mode');
    expect(toggleButton).toBeInTheDocument();
    fireEvent.click(toggleButton);
    expect(mockSimulationActions.setRotationMode).toHaveBeenCalledWith(false);
  });

  it('AHPB_CONTEXT_001: shows speed slider only in View mode', async () => {
    const { rerender } = render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const speedSlider = await screen.findByRole('slider', { name: /Speed/i });
    expect(speedSlider).toBeInTheDocument();
    expect(screen.getByText(/Speed: 5/i)).toBeInTheDocument();

    // Switch to Edit mode
    mockUseSimulation.mockReturnValueOnce({
      ...mockUseSimulation(),
      state: { ...mockSimulationState, rotationMode: false },
    });
    rerender(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    expect(screen.queryByRole('slider', { name: /Speed/i })).not.toBeInTheDocument();
  });

  it('AHPB_MENUS_001: toggles the main settings menu', () => {
    const setShowMainMenu = vi.fn();
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={setShowMainMenu} />);
    const settingsButton = screen.getByRole('button', { name: 'Settings' });
    fireEvent.click(settingsButton);
    expect(setShowMainMenu).toHaveBeenCalledWith(true);
  });
});
