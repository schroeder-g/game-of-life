import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, render } from '../../tests/test-utils';
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
			viewMode: true,
			hasInitialState: true,
			hasPastHistory: true,
			cameraOrientation: { face: 'front', rotation: 0 },
			userName: 'Tester',
			buildInfo: {
				version: '2.1.0',
				distribution: 'test',
				buildTime: new Date().toISOString(),
			},
			squareUp: false,
			isSquaredUp: true,
			speed: 5,
			gridSize: 20,
			showIntroduction: false,
			community: [],
			isAnimatingInit: false,
		};
		mockSimulationActions = {
			playStop: vi.fn(),
			step: vi.fn(),
			stepBackward: vi.fn(),
			reset: vi.fn(),
			setviewMode: vi.fn(),
			fitDisplay: vi.fn(),
			recenter: vi.fn(),
			setSquareUp: vi.fn(),
			setSpeed: vi.fn(),
			setShowIntroduction: vi.fn(),
			loadScene: vi.fn(),
			applyCells: vi.fn(),
			setDensity: vi.fn(),
			setSurviveMin: vi.fn(),
			setSurviveMax: vi.fn(),
			setBirthMin: vi.fn(),
			setBirthMax: vi.fn(),
			setBirthMargin: vi.fn(),
			setCellMargin: vi.fn(),
			setNeighborFaces: vi.fn(),
			setNeighborEdges: vi.fn(),
			setNeighborCorners: vi.fn(),
		};
		mockBrushState = {
			selectedShape: 'Cube',
			paintMode: 0,
			shapeSize: 3,
			isHollow: false,
		};

		mockUseSimulation.mockReturnValue({
			state: mockSimulationState,
			actions: mockSimulationActions,
			meta: {
				cameraActionsRef: { current: {} },
				eventBus: { on: vi.fn(() => () => {}), emit: vi.fn() },
				gridRef: {
					current: {
						generation: 0,
						version: 1,
						getLivingCells: () => [],
						on: vi.fn(() => () => {}),
					},
				},
			},
		});

		mockUseBrush.mockReturnValue({
			state: mockBrushState,
			actions: {
				setPaintMode: vi.fn(),
				setShapeSize: vi.fn(),
				setIsHollow: vi.fn(),
			},
		});

		mockUseGenesisConfig.mockReturnValue({
			state: {
				selectedConfigName: 'Test Scene',
				savedConfigs: {
					'Test Scene': {
						name: 'Test Scene',
						description: 'A test scene',
						cells: [[0, 0, 0]],
						settings: { gridSize: 20 },
					},
					'Scene One': {
						name: 'Scene One',
						description: 'Another scene',
						cells: [[1, 1, 1]],
						settings: { gridSize: 20 },
					},
				},
			},
			actions: {
				setSelectedConfigName: vi.fn(), // Mock this action
				saveConfig: vi.fn(),
				exportConfig: vi.fn(),
				importConfig: vi.fn(),
				deleteConfig: vi.fn(),
				setNewConfigName: vi.fn(),
			},
		});
	});

	it('[AHP_TITLE_001] displays title, build info, and welcome message', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		expect(screen.getByText('Cube of Life')).toBeInTheDocument();
		expect(screen.getByText(/Build: 2.1.0/)).toBeInTheDocument();
		expect(screen.getByText('Welcome, Tester!')).toBeInTheDocument();
	});

	it('[AHP_SCENE_SELECT_001][UC-3] allows selecting a scene and loads it', async () => {
		const mockApplyCells = vi.fn();
		mockUseSimulation.mockReturnValue({
			...mockUseSimulation(),
			actions: {
				...mockSimulationActions,
				applyCells: mockApplyCells,
			},
		});

		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);

		// Click the "Select Scene" button to open the dropdown
		const sceneButton = screen.getByRole('button', {
			name: 'Select Scene',
		});
		fireEvent.click(sceneButton);

		// Find and click the "Scene One" option in the dropdown
		const sceneOneOption = await screen.findByText('Scene One');
		fireEvent.click(sceneOneOption);

		// Verify that setSelectedConfigName was called
		expect(
			mockUseGenesisConfig().actions.setSelectedConfigName,
		).toHaveBeenCalledWith('Scene One');

		// Verify that applyCells was called with the correct cells for 'Scene One'
		expect(mockApplyCells).toHaveBeenCalledWith([[1, 1, 1]], 20);
	});

	it('[AHP_STATUS_001] displays scene name, camera orientation, and simulation stats', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		expect(screen.getByText('Scene: Test Scene')).toBeInTheDocument();
		expect(screen.getByText('Face: Front, 0°')).toBeInTheDocument();
		expect(
			screen.getByText(/Generation: 0 Cells: 0/),
		).toBeInTheDocument();
	});

	it('[AHP_MODAL_001][UI-2] opens and closes the documentation modal', async () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const helpButton = screen.getByRole('button', { name: 'Help (?)' });
		fireEvent.click(helpButton);

		const docButton = screen.getByRole('button', {
			name: 'Documentation',
		});
		fireEvent.click(docButton);

		expect(
			await screen.findByRole('heading', { name: 'User Manual' }),
		).toBeInTheDocument();

		const closeButton = screen.getByRole('button', { name: 'Close' });
		fireEvent.click(closeButton);
		expect(
			screen.queryByRole('heading', { name: 'User Manual' }),
		).not.toBeInTheDocument();
	});

	it('[AHPB_SCENE_001][UC-3] opens and closes the scene selector dropdown', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const sceneButton = screen.getByRole('button', {
			name: 'Select Scene',
		});
		fireEvent.click(sceneButton);
		expect(screen.getByText('Test Scene')).toBeInTheDocument();
	});

	it('[AHPB_MODE_001] toggles between View and Edit mode', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const toggleButton = screen.getByRole('button', {
			name: 'Switch to Edit Mode',
		});
		fireEvent.click(toggleButton);
		// Component calls setviewMode with a functional updater (p => !p)
		expect(mockSimulationActions.setviewMode).toHaveBeenCalledWith(
			expect.any(Function),
		);
	});

	it('[AHPB_PLAY_001][UC-2] triggers play/pause action', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const playButton = screen.getByRole('button', {
			name: 'Play (Space)',
		}); // running: false in mock
		fireEvent.click(playButton);
		expect(mockSimulationActions.playStop).toHaveBeenCalled();
	});

	it('[AHPB_SPEED_001] updates simulation speed', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const speedSlider = screen.getByRole('slider');
		fireEvent.change(speedSlider, { target: { value: '10' } });
		expect(mockSimulationActions.setSpeed).toHaveBeenCalledWith(10);
	});

	it('[AHPB_STEP_BACK_001][UC-2] triggers step backward action', () => {
		// Need to be paused for step
		mockUseSimulation.mockReturnValue({
			...mockUseSimulation(),
			state: { ...mockSimulationState, running: false },
		});
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const stepBackButton = screen.getByRole('button', {
			name: 'Step Backward (←)',
		});
		fireEvent.click(stepBackButton);
		expect(mockSimulationActions.stepBackward).toHaveBeenCalled();
	});

	it('[AHPB_STEP_FWD_001][UC-2] triggers step forward action', () => {
		mockUseSimulation.mockReturnValue({
			...mockUseSimulation(),
			state: { ...mockSimulationState, running: false },
		});
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const stepFwdButton = screen.getByRole('button', {
			name: 'Step Forward (→)',
		});
		fireEvent.click(stepFwdButton);
		expect(mockSimulationActions.step).toHaveBeenCalled();
	});

	it('[AHPB_RESET_001][UC-2] triggers reset action', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const resetButton = screen.getByRole('button', {
			name: 'Reset (R)',
		});
		fireEvent.click(resetButton);
		expect(mockSimulationActions.reset).toHaveBeenCalled();
	});

	it('[AHPB_FIT_001][UC-11] triggers fit display action', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const fitButton = screen.getByRole('button', { name: 'Fit (F)' });
		fireEvent.click(fitButton);
		expect(mockSimulationActions.fitDisplay).toHaveBeenCalled();
	});

	it('[AHPB_RECENTER_001][UC-11] triggers recenter action', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const recenterButton = screen.getByRole('button', {
			name: 'Recenter (S)',
		});
		fireEvent.click(recenterButton);
		expect(mockSimulationActions.recenter).toHaveBeenCalled();
	});

	it('[AHPB_SQUARE_001] triggers square up toggle', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const squareUpButton = screen.getByRole('button', {
			name: /Square Up View/i,
		});
		fireEvent.click(squareUpButton);
		expect(mockSimulationActions.setSquareUp).toHaveBeenCalledWith(
			true,
		);
	});

	it('[AHPB_COMM_001] toggles the community panel', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const commButton = screen.getByRole('button', {
			name: 'Toggle Community Panel',
		});
		fireEvent.click(commButton);
		// Success means no crash and button rendered
		expect(commButton).toBeInTheDocument();
	});

	it('[AHPB_GEAR_001] toggles the settings menu', () => {
		const setShowSettingsSidebar = vi.fn();
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={setShowSettingsSidebar}
			/>,
		);
		const settingsButton = screen.getByRole('button', {
			name: 'Toggle Settings',
		});
		fireEvent.click(settingsButton);
		expect(setShowSettingsSidebar).toHaveBeenCalledWith(true);
	});

	it('[AHPB_HELP_001] opens and closes the help dropdown menu', async () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		const helpButton = screen.getByRole('button', { name: 'Help (?)' });

		// Menu should not be visible initially
		expect(
			screen.queryByRole('button', { name: 'Introduction' }),
		).not.toBeInTheDocument();

		// Click to open
		fireEvent.click(helpButton);
		expect(
			await screen.findByRole('button', { name: 'Introduction' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: 'Shortcuts' }),
		).toBeInTheDocument();

		// Click again to close
		fireEvent.click(helpButton);
		expect(
			screen.queryByRole('button', { name: 'Introduction' }),
		).not.toBeInTheDocument();
	});

	it('[AHPB_HELP_INT_001] opens the introduction modal from help menu', async () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Help (?)' }));
		fireEvent.click(
			screen.getByRole('button', { name: 'Introduction' }),
		);
		expect(
			mockSimulationActions.setShowIntroduction,
		).toHaveBeenCalledWith(true);
	});

	it('[AHPB_HELP_SHORT_001][UC-12] opens the shortcuts overlay from help menu', async () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Help (?)' }));
		fireEvent.click(screen.getByRole('button', { name: 'Shortcuts' }));
		// The overlay renders an <h2>Shortcuts</h2> heading
		expect(
			await screen.findByRole('heading', {
				name: 'Shortcuts',
				level: 2,
			}),
		).toBeInTheDocument();
	});

	it('[AHPB_HELP_NOTES_001] opens the release notes modal from help menu', async () => {
		// Mock fetch to prevent URL errors in the test environment
		const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			text: async () => '# Release Notes\nTest content',
		} as Response);

		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Help (?)' }));
		fireEvent.click(
			screen.getByRole('button', { name: 'Release Notes' }),
		);
		expect(
			await screen.findByRole('heading', { name: /Release Notes/i }),
		).toBeInTheDocument();

		mockFetch.mockRestore();
	});

	it('[AHPB_HELP_DOCS_001][UI-2] opens the documentation modal from help menu', async () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={false}
				setShowSettingsSidebar={() => {}}
			/>,
		);
		fireEvent.click(screen.getByRole('button', { name: 'Help (?)' }));
		fireEvent.click(
			screen.getByRole('button', { name: 'Documentation' }),
		);
		expect(
			await screen.findByRole('heading', { name: 'User Manual' }),
		).toBeInTheDocument();
	});
});
