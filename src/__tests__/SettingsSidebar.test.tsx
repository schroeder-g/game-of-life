import {
	describe,
	it,
	expect,
	vi,
	beforeEach,
	type Mock,
} from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsSidebar } from '../components/SettingsSidebar';
import { AppHeaderPanel } from '../components/AppHeaderPanel';
import { useSimulation } from '../contexts/SimulationContext';
import { useBrush } from '../contexts/BrushContext';
import { useGenesisConfig } from '../contexts/GenesisConfigContext';

// Mock all the necessary contexts
vi.mock('../contexts/SimulationContext', () => ({
	useSimulation: vi.fn(),
}));
vi.mock('../contexts/BrushContext', () => ({ useBrush: vi.fn() }));
vi.mock('../contexts/GenesisConfigContext', () => ({
	useGenesisConfig: vi.fn(),
}));
vi.mock('../hooks/useClickOutside', () => ({
	useClickOutside: vi.fn(),
}));
vi.mock('../components/AutomatedTestsPanel', () => ({
	AutomatedTestsPanel: () => (
		<div data-testid='automated-tests-panel'>Mock Tests Panel</div>
	),
}));
describe('SettingsSidebar and AppHeaderPanel Integration Tests', () => {
	// Shared mocks
	const mocks = {
		setviewMode: vi.fn(),
		setSpeed: vi.fn(),
		playStop: vi.fn(),
		fitDisplay: vi.fn(),
		recenter: vi.fn(),
		applyCells: vi.fn(),
		setGridSize: vi.fn(),
		reset: vi.fn(),
		clear: vi.fn(),
		randomize: vi.fn(),
		setDensity: vi.fn(),
		setSurviveMin: vi.fn(),
		setSurviveMax: vi.fn(),
		setBirthMin: vi.fn(),
		setBirthMax: vi.fn(),
		setBirthMargin: vi.fn(),
		setNeighborFaces: vi.fn(),
		setNeighborEdges: vi.fn(),
		setNeighborCorners: vi.fn(),
		setSelectorPos: vi.fn(),
		saveConfig: vi.fn(),
		exportConfig: vi.fn(),
		importConfig: vi.fn(),
		setPanSpeed: vi.fn(),
		setInvertYaw: vi.fn(),
		setInvertRoll: vi.fn(),
		setInvertPitch: vi.fn(),
	};

	const baseSimulationState = {
		running: false,
		viewMode: false,
		hasInitialState: true,
		hasPastHistory: false,
		speed: 10,
		gridSize: 20,
		density: 0.1,
		cellMargin: 0.1,
		surviveMin: 2,
		surviveMax: 3,
		birthMin: 3,
		birthMax: 3,
		birthMargin: 0,
		neighborFaces: true,
		neighborEdges: true,
		neighborCorners: false,
		panSpeed: 50,
		rotationSpeed: 100,
		rollSpeed: 100,
		invertYaw: false,
		invertRoll: false,
		invertPitch: false,
		easeIn: 0.5,
		easeOut: 0.5,
		buildInfo: {
			version: '1.0.0',
			distribution: 'dev',
			buildTime: new Date().toISOString(),
		},
		cameraOrientation: { face: 'front', rotation: 0 },
		community: [],
		showIntroduction: false,
	};

	const baseSimulationValue = {
		state: baseSimulationState,
		actions: {
			setviewMode: mocks.setviewMode,
			setSpeed: mocks.setSpeed,
			playStop: mocks.playStop,
			fitDisplay: mocks.fitDisplay,
			recenter: mocks.recenter,
			applyCells: mocks.applyCells,
			setGridSize: mocks.setGridSize,
			reset: mocks.reset,
			clear: mocks.clear,
			randomize: mocks.randomize,
			setDensity: mocks.setDensity,
			setSurviveMin: mocks.setSurviveMin,
			setSurviveMax: mocks.setSurviveMax,
			setBirthMin: mocks.setBirthMin,
			setBirthMax: mocks.setBirthMax,
			setBirthMargin: mocks.setBirthMargin,
			setNeighborFaces: mocks.setNeighborFaces,
			setNeighborEdges: mocks.setNeighborEdges,
			setNeighborCorners: mocks.setNeighborCorners,
			setPanSpeed: mocks.setPanSpeed,
			setInvertYaw: mocks.setInvertYaw,
			setInvertRoll: mocks.setInvertRoll,
			setInvertPitch: mocks.setInvertPitch,
			setRotationSpeed: vi.fn(),
			setRollSpeed: vi.fn(),
			setEaseIn: vi.fn(),
			setEaseOut: vi.fn(),
			setShowIntroduction: vi.fn(),
		},
		meta: {
			cameraActionsRef: { current: {} },
			gridRef: {
				current: {
					getLivingCells: () => [1],
					on: vi.fn(() => () => {}),
					generation: 0,
					version: 0,
				},
			},
			initialStateRef: { current: [] },
			eventBus: { on: vi.fn(() => () => {}), emit: vi.fn() },
		},
	};

	const baseGenesisValue = {
		state: {
			savedConfigs: { Default: {} },
			selectedConfigName: 'Default',
			newConfigName: '',
		},
		actions: {
			setSelectedConfigName: vi.fn(),
			setNewConfigName: vi.fn(),
			saveConfig: mocks.saveConfig,
			exportConfig: mocks.exportConfig,
			importConfig: mocks.importConfig,
			deleteConfig: vi.fn(),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(useSimulation as any).mockReturnValue(baseSimulationValue);
		(useBrush as any).mockReturnValue({
			state: {
				selectedShape: 'Cube',
				shapeSize: 3,
				selectorPos: [10, 10, 10],
				brushQuaternion: { current: {} },
			},
			actions: { setSelectorPos: mocks.setSelectorPos },
		});
		(useGenesisConfig as any).mockReturnValue(baseGenesisValue);
	});

	it('[UC-1] should toggle edit/view mode when the mode toggle button is clicked', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={true}
				setShowSettingsSidebar={vi.fn()}
			/>,
		);
		// The accessible name is "Switch to View Mode" because viewMode is false in baseSimulationValue
		const toggleButton = screen.getByRole('button', {
			name: /switch to view mode/i,
		});
		fireEvent.click(toggleButton);
		expect(mocks.setviewMode).toHaveBeenCalled();
	});

	it('[UX-5] should display development build info in the header', () => {
		render(
			<AppHeaderPanel
				showSettingsSidebar={true}
				setShowSettingsSidebar={vi.fn()}
			/>,
		);
		expect(screen.getByText(/Build:/)).toBeInTheDocument();
	});

	it('[UC-7] should handle Environment controls', () => {
		// Ensure viewMode is false for Environment section to render in SettingsSidebar
		(useSimulation as any).mockReturnValue(baseSimulationValue);
		render(
			<SettingsSidebar
				isSmallScreen={false}
				setIsSettingsDropdownOpen={vi.fn()}
			/>,
		);

		// Headers are h3 which act as buttons for expansion
		fireEvent.click(screen.getByText(/Environment/i));

		const gridSizeSlider = screen.getByLabelText(/Grid Size:/i);
		fireEvent.change(gridSizeSlider, { target: { value: '30' } });
		expect(mocks.setGridSize).toHaveBeenCalledWith(30);

		fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
		expect(mocks.reset).toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
		expect(mocks.clear).toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'Random' }));
		expect(mocks.randomize).toHaveBeenCalled();

		const densitySlider = screen.getByLabelText(/Density:/i);
		fireEvent.change(densitySlider, { target: { value: '0.2' } });
		expect(mocks.setDensity).toHaveBeenCalledWith(0.2);
	});

	it('[UC-8] should handle Rules controls', () => {
		render(
			<SettingsSidebar
				isSmallScreen={false}
				setIsSettingsDropdownOpen={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByText(/Rules/i));

		const surviveMinSlider = screen.getByLabelText(/Survive Min:/i);
		fireEvent.change(surviveMinSlider, { target: { value: '4' } });
		expect(mocks.setSurviveMin).toHaveBeenCalledWith(4);

		const birthMinSlider = screen.getByLabelText(/Birth Min:/i);
		fireEvent.change(birthMinSlider, { target: { value: '5' } });
		expect(mocks.setBirthMin).toHaveBeenCalledWith(5);

		const checkbox = screen.getByLabelText('Faces');
		fireEvent.click(checkbox);
		expect(mocks.setNeighborFaces).toHaveBeenCalledWith(false);
	});

	it('[UC-9] should handle Cursor Position controls', () => {
		(useSimulation as any).mockReturnValue(baseSimulationValue);
		render(
			<SettingsSidebar
				isSmallScreen={false}
				setIsSettingsDropdownOpen={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByText(/Cursor Position/i));

		// Coordinate inputs have labels X:, Y:, Z:
		const xInput = screen.getByLabelText('X:');
		fireEvent.change(xInput, { target: { value: '15' } });
		expect(mocks.setSelectorPos).toHaveBeenCalledWith([15, 10, 10]);

		const incrementButtons = screen.getAllByRole('button', {
			name: '▲',
		});
		fireEvent.click(incrementButtons[1]); // Y increment
		expect(mocks.setSelectorPos).toHaveBeenCalledWith([10, 11, 10]);
	});

	it('[UC-10] should handle Scene Management controls', () => {
		(useSimulation as any).mockReturnValue(baseSimulationValue);
		const genesisValue = {
			...baseGenesisValue,
			state: { ...baseGenesisValue.state, newConfigName: 'Test Scene' },
		};
		(useGenesisConfig as any).mockReturnValue(genesisValue);

		render(
			<SettingsSidebar
				isSmallScreen={false}
				setIsSettingsDropdownOpen={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByText(/Scene Management/i));

		const saveButton = screen.getByRole('button', {
			name: 'Save Current',
		});
		fireEvent.click(saveButton);
		expect(mocks.saveConfig).toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'Export' }));
		expect(mocks.exportConfig).toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'Import' }));
		expect(mocks.importConfig).toHaveBeenCalled();
	});

	it('[UC-11] should handle Camera controls', () => {
		// Camera controls only show in viewMode: true
		const viewModeSimulationValue = {
			...baseSimulationValue,
			state: { ...baseSimulationState, viewMode: true },
		};
		(useSimulation as any).mockReturnValue(viewModeSimulationValue);

		render(
			<SettingsSidebar
				isSmallScreen={false}
				setIsSettingsDropdownOpen={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByText(/Camera Controls/i));

		const panSlider = screen.getByLabelText(/Pan\/Dolly Speed:/i);
		fireEvent.change(panSlider, { target: { value: '60' } });
		expect(mocks.setPanSpeed).toHaveBeenCalledWith(60);

		const yawCheckbox = screen.getByLabelText(/Invert Yaw/i);
		fireEvent.click(yawCheckbox);
		expect(mocks.setInvertYaw).toHaveBeenCalledWith(true);
	});
});
