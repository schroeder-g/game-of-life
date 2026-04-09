import type React from 'react';

import { useCallback, useRef, useState } from 'react';
import { useGenesisConfig } from '../contexts/GenesisConfigContext';
import { useSimulation } from '../contexts/SimulationContext';
import { useClickOutside } from '../hooks/useClickOutside';
import { BrushControls } from './BrushControls';
import { ShapeType } from '../core/shapes';

const GearIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<circle cx='12' cy='12' r='3' />
		<path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' />
	</svg>
);

const FitIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<rect
			x='3'
			y='3'
			width='18'
			height='18'
			rx='2'
			strokeOpacity='0.3'
		/>
		<path d='M12 8v8M8 12h8' />
		<path d='M12 8l-2 2M12 8l2 2M12 16l-2-2M12 16l2-2' />
		<path d='M8 12l2-2M8 12l2 2M16 12l-2-2M16 12l2 2' />
		<path d='M2 2l4 4M22 22l-4-4M2 22l4-4M22 2l-4 4' />
	</svg>
);

const RecenterIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<circle cx='12' cy='12' r='10' />
		<circle cx='12' cy='12' r='6' />
		<circle cx='12' cy='12' r='2' fill='currentColor' />
	</svg>
);

const SquareUpOffIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<rect x='5' y='9' width='10' height='10' />
		<rect x='9' y='5' width='10' height='10' />
		<path d='M5 9l4-4M15 9l4-4M15 19l4-4M5 19l4-4' />
	</svg>
);

const SquareUpOnIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<rect x='5' y='5' width='14' height='14' />
		<rect x='8' y='8' width='8' height='8' strokeOpacity='0.4' />
		<path d='M5 5l3 3m8 0l3-3m0 14l-3-3m-8 0l-3 3' />
	</svg>
);

const PencilIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<path d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z' />
	</svg>
);

const ProjectorIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		{/* Reels */}
		<circle cx='7' cy='6' r='3' />
		<circle cx='15' cy='6' r='3' />
		{/* Body */}
		<rect x='5' y='10' width='12' height='8' rx='1' />
		{/* Lens/Light Wedge */}
		<path
			d='M17 12l5-3v6l-5-3'
			fill='currentColor'
			fillOpacity='0.2'
			stroke='none'
		/>
		<path d='M17 12l5-3M17 12l5 3' />
		<line x1='17' y1='11' x2='17' y2='17' />
	</svg>
);

const ImageIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<rect x='3' y='3' width='18' height='18' rx='2' ry='2' />
		<circle cx='8.5' cy='8.5' r='1.5' />
		<polyline points='21 15 16 10 5 21' />
	</svg>
);

const UsersIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
		<circle cx='9' cy='7' r='4' />
		<path d='M22 21v-2a4 4 0 0 0-3-3.87' />
		<path d='M16 3.13a4 4 0 0 1 0 7.75' />
	</svg>
);

const DnaIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<path d='M8 3v3a2 2 0 0 1-2 2H3' />
		<path d='M21 8h-3a2 2 0 0 1-2-2V3' />
		<path d='M3 16h3a2 2 0 0 1 2 2v3' />
		<path d='M16 21v-3a2 2 0 0 1 2-2h3' />
		<line x1='9' y1='9' x2='15' y2='15' />
		<line x1='15' y1='9' x2='9' y2='15' />
	</svg>
);

const HelpCircleIcon = () => (
	<svg
		width='24'
		height='24'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
		style={{ display: 'block' }}
	>
		<circle cx='12' cy='12' r='11' strokeWidth='1.5' />
		<text
			x='12'
			y='17'
			textAnchor='middle'
			fontFamily="'Courier New', Courier, monospace"
			fontSize='18'
			fontWeight='bold'
			fill='currentColor'
			stroke='none'
		>
			?
		</text>
	</svg>
);

function SceneSelectorDropdown() {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [hoveredName, setHoveredName] = useState<string | null>(null);

	const {
		state: { savedConfigs, selectedConfigName },
		actions: { setSelectedConfigName },
	} = useGenesisConfig();

	const {
		state: { running },
		actions: {
			playStop,
			applyCells,
			setSpeed,
			setDensity,
			setSurviveMin,
			setSurviveMax,
			setBirthMin,
			setBirthMax,
			setBirthMargin,
			setCellMargin,
			setNeighborFaces,
			setNeighborEdges,
			setNeighborCorners,
			fitDisplay,
		},
	} = useSimulation();

	const configOptions = Object.keys(savedConfigs);

	const handleSelectConfig = useCallback(
		(name: string) => {
			setSelectedConfigName(name);
			if (name && savedConfigs[name]) {
				const config = savedConfigs[name];
				applyCells(config, config.settings.gridSize);
				// apply saved settings as well
				setSpeed(config.settings.speed);
				setDensity(config.settings.density);
				setSurviveMin(config.settings.surviveMin);
				setSurviveMax(config.settings.surviveMax);
				setBirthMin(config.settings.birthMin);
				setBirthMax(config.settings.birthMax);
				setBirthMargin(config.settings.birthMargin);
				setCellMargin(config.settings.cellMargin);
				if (config.settings.neighborFaces !== undefined)
					setNeighborFaces(config.settings.neighborFaces);
				if (config.settings.neighborEdges !== undefined)
					setNeighborEdges(config.settings.neighborEdges);
				if (config.settings.neighborCorners !== undefined)
					setNeighborCorners(config.settings.neighborCorners);
				fitDisplay();
			}
			setIsOpen(false); // Close dropdown on selection
		},
		[
			setSelectedConfigName,
			savedConfigs,
			applyCells,
			setSpeed,
			setDensity,
			setSurviveMin,
			setSurviveMax,
			setBirthMin,
			setBirthMax,
			setBirthMargin,
			setCellMargin,
			setNeighborFaces,
			setNeighborEdges,
			setNeighborCorners,
			fitDisplay,
		],
	);

	// Effect to close dropdown on outside click
	useClickOutside(dropdownRef, () => setIsOpen(false));

	const handleButtonClick = () => {
		if (running) {
			playStop();
		}
		setIsOpen(prev => !prev);
	};

	return (
		<div className='scene-selector-dropdown' ref={dropdownRef}>
			<button
				type='button'
				className='glass-button'
				onClick={handleButtonClick}
				data-tooltip-bottom='Select Scene'
				aria-label='Select Scene'
			>
				<ImageIcon />
			</button>
			{isOpen && (
				<div
					className='dropdown-menu'
					onMouseLeave={() => setHoveredName(null)}
				>
					{configOptions.map(name => {
						const isSelected = name === selectedConfigName;
						const isHovered = name === hoveredName;

						// An item is highlighted if it's the one being hovered,
						// or if nothing is hovered and it's the currently selected one.
						const isActive =
							isHovered || (hoveredName === null && isSelected);

						return (
							<button
								type='button'
								key={name}
								className={`dropdown-item ${isActive ? 'selected' : ''}`}
								onClick={() => handleSelectConfig(name)}
								onMouseEnter={() => setHoveredName(name)}
							>
								{name}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

interface AppHeaderPanelButtonsProps {
	running: boolean;
	viewMode: boolean;
	hasInitialState: boolean;
	hasPastHistory: boolean;
	squareUp: boolean;
	isSquaredUp: boolean;
	speed: number;
	gridSize: number;
	playStop: () => void;
	step: () => void;
	stepBackward: () => void;
	reset: () => void;
	setviewMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
	fitDisplay: () => void;
	recenter: () => void;
	setSquareUp: (value: boolean | ((prev: boolean) => boolean)) => void;
	setSpeed: (speed: number) => void;

	// Help dropdown state and handlers
	isHelpDropdownOpen: boolean;
	setIsHelpDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
	helpDropdownRef: React.RefObject<HTMLDivElement>;
	handleOpenDocumentation: () => void;
	handleOpenIntroduction: () => void;
	handleOpenShortcuts: () => void;
	handleOpenReleaseNotes: () => void;
	showSettingsSidebar: boolean;
	setShowSettingsSidebar: (show: boolean) => void;
	showCommunityPanel: boolean;
	setShowCommunityPanel: (show: boolean) => void;
	
	// Brush related props
	selectedShape: ShapeType;
	paintMode: 1 | 0 | -1;
	shapeSize: number;
	isHollow: boolean;
	setPaintMode: (mode: 1 | 0 | -1 | ((prev: 1 | 0 | -1) => 1 | 0 | -1)) => void;
	setShapeSize: (size: number) => void;
	setIsHollow: (hollow: boolean) => void;
	
	selectedOrganismId: string | null;
}

export function AppHeaderPanelButtons({
	running,
	viewMode,
	hasInitialState,
	hasPastHistory,
	squareUp,
	isSquaredUp,
	speed,
	gridSize,
	playStop,
	step,
	stepBackward,
	reset,
	setviewMode,
	fitDisplay,
	recenter,
	setSquareUp,
	setSpeed,

	isHelpDropdownOpen,
	setIsHelpDropdownOpen,
	helpDropdownRef,
	handleOpenDocumentation,
	handleOpenIntroduction,
	handleOpenShortcuts,
	handleOpenReleaseNotes,
	showSettingsSidebar,
	setShowSettingsSidebar,
	showCommunityPanel,
	setShowCommunityPanel,
	selectedShape,
	paintMode,
	shapeSize,
	isHollow,
	setPaintMode,
	setShapeSize,
	setIsHollow,
	selectedOrganismId,
}: AppHeaderPanelButtonsProps) {
	return (
		<div className='button-group panel-actions'>
			<SceneSelectorDropdown />
			<button
				type='button'
				className='glass-button mode-toggle-button'
				onClick={() => setviewMode(p => !p)}
				data-tooltip-bottom={
					viewMode ? 'Switch to Edit Mode' : 'Switch to View Mode'
				}
				aria-label={
					viewMode ? 'Switch to Edit Mode' : 'Switch to View Mode'
				}
			>
				{viewMode ? <PencilIcon /> : <ProjectorIcon />}
			</button>
			<button
				type='button'
				className={`glass-button ${showCommunityPanel ? 'active' : ''}`}
				onClick={() => setShowCommunityPanel(!showCommunityPanel)}
				data-tooltip-bottom='Toggle Community Panel'
				aria-label='Toggle Community Panel'
			>
				<UsersIcon />
			</button>
			<BrushControls selectedOrganismId={selectedOrganismId} />
			<button
				type='button'
				className='glass-button primary'
				onClick={playStop}
				style={{ display: !viewMode ? 'none' : 'block' }}
				data-tooltip-bottom={
					!viewMode
						? 'Playback disabled in Edit mode'
						: running
							? 'Pause (Space)'
							: 'Play (Space)'
				}
				aria-label={
					!viewMode
						? 'Playback disabled in Edit mode'
						: running
							? 'Pause (Space)'
							: 'Play (Space)'
				}
			>
				{running ? '⏸' : '▶'}
			</button>
			{viewMode && (
				<div className='speed-control'>
					<span>Speed: {speed}</span>
					<input
						type='range'
						min={1}
						max={30}
						step={1}
						value={speed}
						onChange={e => setSpeed(Number(e.target.value))}
					/>
				</div>
			)}
			<div style={{ display: 'flex', gap: '10px' }}>
				{' '}
				{/* New container div */}
				<button
					type='button'
					className='glass-button'
					onClick={() => {
						if (running) {
							playStop();
						}
						stepBackward();
					}}
					disabled={running || !hasPastHistory}
					data-tooltip-bottom={
						running
							? 'Pause simulation to step'
							: !hasPastHistory
								? 'No history to step back to'
								: 'Step Backward (←)'
					}
					aria-label={
						running
							? 'Pause simulation to step'
							: !hasPastHistory
								? 'No history to step back to'
								: 'Step Backward (←)'
					}
				>
					⏮
				</button>
				<button
					type='button'
					className='glass-button'
					onClick={() => {
						if (running) {
							playStop();
						}
						step();
					}}
					disabled={running}
					data-tooltip-bottom={
						running ? 'Pause simulation to step' : 'Step Forward (→)'
					}
					aria-label={
						running ? 'Pause simulation to step' : 'Step Forward (→)'
					}
				>
					⏭
				</button>
				<button
					type='button'
					className='glass-button'
					onClick={reset}
					disabled={!hasInitialState}
					data-tooltip-bottom={
						!hasInitialState
							? 'No initial state to reset to'
							: 'Reset (R)'
					}
					aria-label={
						!hasInitialState
							? 'No initial state to reset to'
							: 'Reset (R)'
					}
				>
					↺
				</button>
			</div>{' '}
			{/* End of new container div */}
			<div style={{ display: 'flex', gap: '10px' }}>
				{' '}
				{/* New container div for Fit, Recenter, Square Up */}
				<button
					type='button'
					className='glass-button hide-on-mobile'
					onClick={fitDisplay}
					aria-label='Fit (F)'
					data-tooltip-bottom='Fit (F)'
				>
					<FitIcon />
				</button>
				<button
					type='button'
					className='glass-button hide-on-mobile'
					onClick={recenter}
					aria-label='Recenter (S)'
					data-tooltip-bottom='Recenter (S)'
				>
					<RecenterIcon />
				</button>
				<button
					type='button'
					className={`glass-button square-up-toggle ${squareUp ? (isSquaredUp ? 'active success' : 'active primary') : ''}`}
					onClick={() => setSquareUp(!squareUp)}
					data-tooltip-bottom={`Square Up View (${squareUp ? (isSquaredUp ? 'SQUARED' : 'ALIGNING') : 'OFF'})`}
					aria-label={`Square Up View (${squareUp ? (isSquaredUp ? 'SQUARED' : 'ALIGNING') : 'OFF'})`}
				>
					{squareUp ? <SquareUpOnIcon /> : <SquareUpOffIcon />}
				</button>
			</div>{' '}
			{/* End of new container div */}
			<button
				type='button'
				className={`glass-button settings-theme ${showSettingsSidebar ? 'active' : ''}`}
				onClick={() => setShowSettingsSidebar(!showSettingsSidebar)}
				data-tooltip-bottom='Toggle Settings'
				aria-label='Toggle Settings'
			>
				<GearIcon />
			</button>
			<div className='dropdown-container' ref={helpDropdownRef}>
				<button
					type='button'
					className='glass-button help-button'
					onClick={() => setIsHelpDropdownOpen(prev => !prev)}
					data-tooltip-bottom='Help (?)'
					aria-label='Help (?)'
				>
					<HelpCircleIcon />
				</button>
				{isHelpDropdownOpen && (
					<div className='dropdown-menu align-right'>
						<button
							type='button'
							className='dropdown-item'
							onClick={handleOpenIntroduction}
						>
							Introduction
						</button>
						<button
							type='button'
							className='dropdown-item'
							onClick={handleOpenShortcuts}
						>
							Shortcuts
						</button>
						<button
							type='button'
							className='dropdown-item'
							onClick={handleOpenReleaseNotes}
						>
							Release Notes
						</button>
						<button
							type='button'
							className='dropdown-item'
							onClick={handleOpenDocumentation}
						>
							Documentation
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
