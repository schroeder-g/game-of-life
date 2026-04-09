import { useCallback, useEffect, useRef, useState } from 'react';
import { useBrush } from '../contexts/BrushContext';
import { useGenesisConfig } from '../contexts/GenesisConfigContext';
import { useSimulation } from '../contexts/SimulationContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { AppHeaderPanelButtons } from './AppHeaderPanelButtons';
import { DocumentationModal } from './DocumentationModal';
import { IntroductionModal } from './IntroductionModal';
import { ReleaseNotesModal } from './ReleaseNotesModal';
import { ShortcutOverlay } from './ShortcutOverlay';

function GenerationDisplay() {
	const {
		meta: { gridRef },
	} = useSimulation();
	const [generation, setGeneration] = useState(gridRef.current.generation);

	useEffect(() => {
		const updateStats = () => setGeneration(gridRef.current.generation);
		const unsubscribe = gridRef.current.on('tick', updateStats);
		return () => unsubscribe();
	}, [gridRef.current]);

	return (
		<>
			<span className='label'>Generation:</span> {generation}{' '}
		</>
	);
}

function CellsDisplay() {
	const {
		meta: { gridRef },
	} = useSimulation();
	const [cells, setCells] = useState(gridRef.current.getLivingCells().length);

	useEffect(() => {
		const updateStats = () => setCells(gridRef.current.getLivingCells().length);
		const unsubscribe = gridRef.current.on('tick', updateStats);
		return () => unsubscribe();
	}, [gridRef.current]);

	return (
		<>
			<span className='label'>Cells:</span> {cells}
		</>
	);
}

interface AppHeaderPanelProps {
	showSettingsSidebar: boolean;
	setShowSettingsSidebar: (show: boolean) => void;
	showCommunityPanel: boolean;
	setShowCommunityPanel: (show: boolean) => void;
	isSmallScreen: boolean;
}

export function AppHeaderPanel({
	showSettingsSidebar,
	setShowSettingsSidebar,
	showCommunityPanel,
	setShowCommunityPanel,
	isSmallScreen,
}: AppHeaderPanelProps) {
	const {
		state: {
			running,
			viewMode,
			hasInitialState,
			hasPastHistory,
			cameraOrientation,
			squareUp,
			isSquaredUp,
			speed,
			gridSize,
			showIntroduction,
			selectedOrganismId,
		},
		actions: {
			playStop,
			step,
			stepBackward,
			reset,
			setviewMode,
			fitDisplay,
			recenter,
			setSquareUp,
			setSpeed,
			setShowIntroduction,
		},
		meta: { cameraActionsRef, eventBus },
	} = useSimulation();

	const {
		state: brushState,
		actions: { setPaintMode, setShapeSize, setIsHollow },
	} = useBrush();
	const { selectedShape, paintMode, shapeSize, isHollow } = brushState;

	const {
		state: { selectedConfigName },
	} = useGenesisConfig();

	const [showDocumentation, setShowDocumentation] = useState(false);
	const [showShortcuts, setShowShortcuts] = useState(false);
	const [showReleaseNotes, setShowReleaseNotes] = useState(false);
	const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);
	const helpDropdownRef = useRef<HTMLDivElement>(null);

	useClickOutside(helpDropdownRef, () => setIsHelpDropdownOpen(false));

	const faceName =
		cameraOrientation.face !== 'unknown'
			? cameraOrientation.face.charAt(0).toUpperCase() +
			cameraOrientation.face.slice(1)
			: 'Unknown';
	const rotationDegrees =
		cameraOrientation.rotation !== 'unknown'
			? `${cameraOrientation.rotation}°`
			: '0°';

	const handleOpenDocumentation = useCallback(() => {
		setShowDocumentation(true);
		setIsHelpDropdownOpen(false);
	}, []);

	const handleOpenIntroduction = useCallback(() => {
		setShowIntroduction(true);
		setIsHelpDropdownOpen(false);
	}, [setShowIntroduction]);

	const handleOpenShortcuts = useCallback(() => {
		setShowShortcuts(true);
		setIsHelpDropdownOpen(false);
	}, []);

	const handleOpenReleaseNotes = useCallback(() => {
		setShowReleaseNotes(true);
		setIsHelpDropdownOpen(false);
	}, []);

	return (
		<div className='app-header-panel'>
			<div className='header-top-row'>
				<div className='title-section'>
					<h1>Cube of Life</h1>

				</div>

				<AppHeaderPanelButtons
					running={running}
					viewMode={viewMode}
					hasInitialState={hasInitialState}
					hasPastHistory={hasPastHistory}
					squareUp={squareUp}
					isSquaredUp={isSquaredUp}
					speed={speed}
					gridSize={gridSize}
					playStop={playStop}
					step={step}
					stepBackward={stepBackward}
					reset={reset}
					setviewMode={setviewMode}
					fitDisplay={fitDisplay}
					recenter={recenter}
					setSquareUp={setSquareUp}
					setSpeed={setSpeed}
					selectedShape={selectedShape}
					paintMode={paintMode}
					shapeSize={shapeSize}
					isHollow={isHollow}
					setPaintMode={setPaintMode}
					setShapeSize={setShapeSize}
					setIsHollow={setIsHollow}
					isHelpDropdownOpen={isHelpDropdownOpen}
					setIsHelpDropdownOpen={setIsHelpDropdownOpen}
					helpDropdownRef={helpDropdownRef}
					handleOpenDocumentation={handleOpenDocumentation}
					handleOpenIntroduction={handleOpenIntroduction}
					handleOpenShortcuts={handleOpenShortcuts}
					handleOpenReleaseNotes={handleOpenReleaseNotes}
					showSettingsSidebar={showSettingsSidebar}
					setShowSettingsSidebar={setShowSettingsSidebar}
					showCommunityPanel={showCommunityPanel}
					setShowCommunityPanel={setShowCommunityPanel}
					selectedOrganismId={selectedOrganismId}
					isSmallScreen={isSmallScreen}
				/>
			</div>

			<div className='status-bar-row'>
				<div className='status-segment scene' data-testid='status-scene'>
					<span className='label'>Scene:</span> {selectedConfigName || 'Unsaved'}
				</div>
				<div className='status-segment generation' data-testid='status-generation'>
					<GenerationDisplay />
				</div>
				<div className='status-segment cells' data-testid='status-cells'>
					<CellsDisplay />
				</div>
				<div className='status-segment orientation' data-testid='status-orientation'>
					<span className='label'>Face:</span> {faceName}, {rotationDegrees}
				</div>
			</div>

			<DocumentationModal
				isOpen={showDocumentation}
				onClose={() => setShowDocumentation(false)}
			/>

			<IntroductionModal
				isOpen={showIntroduction}
				onClose={() => setShowIntroduction(false)}
			/>

			<ShortcutOverlay
				isOpen={showShortcuts}
				onClose={() => setShowShortcuts(false)}
			/>
			<ReleaseNotesModal
				isOpen={showReleaseNotes}
				onClose={() => setShowReleaseNotes(false)}
			/>
		</div>
	);
}
