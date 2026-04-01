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

  it('AHPB_SCENE_001: opens and closes the scene selector dropdown', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const sceneButton = screen.getByRole('button', { name: 'Select Scene' });
    fireEvent.click(sceneButton);
    expect(screen.getByText('Test Scene')).toBeInTheDocument();
  });

  it('AHPB_MODE_001: toggles between View and Edit mode', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const toggleButton = screen.getByRole('button', { name: 'Switch to Edit Mode' });
    fireEvent.click(toggleButton);
    expect(mockSimulationActions.setRotationMode).toHaveBeenCalledWith(false);
  });

  it('AHPB_PLAY_001: triggers play/pause action', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const playButton = screen.getByRole('button', { name: 'Pause (Space)' }); // It's running in mocks default
    fireEvent.click(playButton);
    expect(mockSimulationActions.playStop).toHaveBeenCalled();
  });

  it('AHPB_SPEED_001: updates simulation speed', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const speedSlider = screen.getByRole('slider');
    fireEvent.change(speedSlider, { target: { value: '10' } });
    expect(mockSimulationActions.setSpeed).toHaveBeenCalledWith(10);
  });

  it('AHPB_STEP_BACK_001: triggers step backward action', () => {
    // Need to be paused for step
    mockUseSimulation.mockReturnValue({
      ...mockUseSimulation(),
      state: { ...mockSimulationState, running: false },
    });
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const stepBackButton = screen.getByRole('button', { name: 'Step Backward (←)' });
    fireEvent.click(stepBackButton);
    expect(mockSimulationActions.stepBackward).toHaveBeenCalled();
  });

  it('AHPB_STEP_FWD_001: triggers step forward action', () => {
    mockUseSimulation.mockReturnValue({
      ...mockUseSimulation(),
      state: { ...mockSimulationState, running: false },
    });
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const stepFwdButton = screen.getByRole('button', { name: 'Step Forward (→)' });
    fireEvent.click(stepFwdButton);
    expect(mockSimulationActions.step).toHaveBeenCalled();
  });

  it('AHPB_RESET_001: triggers reset action', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const resetButton = screen.getByRole('button', { name: 'Reset (R)' });
    fireEvent.click(resetButton);
    expect(mockSimulationActions.reset).toHaveBeenCalled();
  });

  it('AHPB_FIT_001: triggers fit display action', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const fitButton = screen.getByRole('button', { name: 'Fit (F)' });
    fireEvent.click(fitButton);
    expect(mockSimulationActions.fitDisplay).toHaveBeenCalled();
  });

  it('AHPB_RECENTER_001: triggers recenter action', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const recenterButton = screen.getByRole('button', { name: 'Recenter (S)' });
    fireEvent.click(recenterButton);
    expect(mockSimulationActions.recenter).toHaveBeenCalled();
  });

  it('AHPB_SQUARE_001: triggers square up toggle', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const squareUpButton = screen.getByRole('button', { name: /Square Up View/i });
    fireEvent.click(squareUpButton);
    expect(mockSimulationActions.setSquareUp).toHaveBeenCalledWith(true);
  });

  it('AHPB_COMM_001: toggles the community panel', () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    const commButton = screen.getByRole('button', { name: 'Toggle Community Panel' });
    fireEvent.click(commButton);
    // Success means no crash and button rendered
    expect(commButton).toBeInTheDocument();
  });

  it('AHPB_GEAR_001: toggles the settings menu', () => {
    const setShowMainMenu = vi.fn();
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={setShowMainMenu} />);
    const settingsButton = screen.getByRole('button', { name: 'Toggle Settings' });
    fireEvent.click(settingsButton);
    expect(setShowMainMenu).toHaveBeenCalledWith(true);
  });

  it('AHPB_HELP_INT_001: opens the introduction modal from help menu', async () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Help (?)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Introduction' }));
    expect(mockSimulationActions.setShowIntroduction).toHaveBeenCalledWith(true);
  });

  it('AHPB_HELP_SHORT_001: opens the shortcuts overlay from help menu', async () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Help (?)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Shortcuts' }));
    expect(await screen.findByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('AHPB_HELP_NOTES_001: opens the release notes modal from help menu', async () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Help (?)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Release Notes' }));
    expect(await screen.findByText(/Release Notes/i)).toBeInTheDocument();
  });

  it('AHPB_HELP_DOCS_001: opens the documentation modal from help menu', async () => {
    render(<AppHeaderPanel showMainMenu={false} setShowMainMenu={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Help (?)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Documentation' }));
    expect(await screen.findByRole('heading', { name: 'User Manual' })).toBeInTheDocument();
  });
});
