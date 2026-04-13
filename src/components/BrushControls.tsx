import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useBrush } from '../contexts/BrushContext';
import { useSimulation } from '../contexts/SimulationContext';
import {
	getWAXDQZMapping,
	type CubeFace,
	type CameraRotation,
} from '../core/faceOrientationKeyMapping';
import { SHAPES, ShapeType, supportsHollow } from '../core/shapes';
import { OrganismData } from '../core/Organism'; // Import OrganismData
import { useClickOutside } from '../hooks/useClickOutside';
const PaintBrushIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 220 220'
		fill='none'
		stroke='currentColor'
		strokeWidth='2'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		{/* Handle */}
		<rect
			x='70'
			y='0'
			width='80'
			height='56'
			fill='currentColor'
			stroke='none'
		/>
		{/* Ferrule */}
		<rect
			x='66'
			y='56'
			width='88'
			height='48'
			fill='none'
			stroke='currentColor'
		/>
		<line x1='66' y1='56' x2='154' y2='104' stroke='currentColor' />
		<line x1='154' y1='56' x2='66' y2='104' stroke='currentColor' />
		{/* Bristles */}
		<path
			d='M66,104 C66,115 86,130 86,150 C86,190 94,220 110,220 C126,220 134,190 134,150 C134,130 154,115 154,104 Z'
			fill='none'
			stroke='currentColor'
		/>
	</svg>
);

const PlusIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='3'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<line x1='12' y1='5' x2='12' y2='19' />
		<line x1='5' y1='12' x2='19' y2='12' />
	</svg>
);

const MinusIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 24 24'
		fill='none'
		stroke='currentColor'
		strokeWidth='3'
		strokeLinecap='round'
		strokeLinejoin='round'
	>
		<line x1='5' y1='12' x2='19' y2='12' />
	</svg>
);

// Icon components for directional controls
const ArrowUpIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 20 20'
		fill='currentColor'
		aria-label='ArrowUpIcon'
	>
		<path d='M10 4.75 L4.75 15.25 L15.25 15.25 Z' />
	</svg>
);

const ArrowDownIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 20 20'
		fill='currentColor'
		aria-label='ArrowDownIcon'
	>
		<path d='M10 15.25 L4.75 4.75 L15.25 4.75 Z' />
	</svg>
);

const ArrowLeftIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 20 20'
		fill='currentColor'
		aria-label='ArrowLeftIcon'
	>
		<path d='M4.75 10 L15.25 4.75 L15.25 15.25 Z' />
	</svg>
);

const ArrowRightIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 20 20'
		fill='currentColor'
		aria-label='ArrowRightIcon'
	>
		<path d='M15.25 10 L4.75 4.75 L4.75 15.25 Z' />
	</svg>
);

const AwayIcon = () => (
	<svg
		width='10'
		height='10'
		viewBox='0 0 10 10'
		fill='currentColor'
		aria-label='AwayIcon'
	>
		<rect x='1.5' y='1.5' width='7' height='7' />
	</svg>
);

const CloserIcon = () => (
	<svg
		width='20'
		height='20'
		viewBox='0 0 20 20'
		fill='currentColor'
		aria-label='CloserIcon'
	>
		<rect x='0' y='0' width='20' height='20' />
	</svg>
);

function BrushSelectorDrop() {
	const [isOpen, setIsOpen] = useState(false);
	const dropRef = useRef<HTMLDivElement>(null);
	const [hoveredCategory, setHoveredCategory] = useState<
		'none' | 'shape' | 'organism' | null
	>(null);
	const [hoveredShapeName, setHoveredShapeName] = useState<ShapeType | null>(
		null,
	);
	const [hoveredOrganismBrushId, setHoveredOrganismBrushId] = useState<
		string | null
	>(null);
	const [showShapesSubmenu, setShowShapesSubmenu] = useState(false);
	const [showOrganismsSubmenu, setShowOrganismsSubmenu] = useState(false);

	const {
		state: { selectedShape, brushQuaternion, organismBrushes, selectedOrganismBrushId },
		actions: {
			setSelectedShape,
			incrementBrushRotationVersion,
			selectOrganismBrush,
			clearShape,
			setShapeSize, // Added setShapeSize
		},
	} = useBrush();

	const {
		state: { cameraOrientation, enableOrganisms },
	} = useSimulation();

	// Determine the currently active brush category for UI highlighting
	const activeCategory = useMemo(() => {
		if (selectedShape === 'None') return 'none';
		if (selectedShape === 'Organism Brush' && selectedOrganismBrushId) return 'organism';
		if (SHAPES.includes(selectedShape)) return 'shape';
		return null;
	}, [selectedShape, selectedOrganismBrushId]);


	const initBrushOrientation = useCallback(() => {
		const face = cameraOrientation.face;
		const rotation = cameraOrientation.rotation;
		if (face === 'unknown' || rotation === 'unknown') {
			brushQuaternion.current.identity();
			return;
		}
		const mapping = getWAXDQZMapping(
			face as CubeFace,
			rotation as CameraRotation,
		) as any;
		const right = mapping.d as number[];
		const up = mapping.w as number[];
		const depth = mapping.q as number[];
		const m = new THREE.Matrix4().set(
			right[0],
			up[0],
			depth[0],
			0,
			right[1],
			up[1],
			depth[1],
			0,
			right[2],
			up[2],
			depth[2],
			0,
			0,
			0,
			0,
			1,
		);
		brushQuaternion.current.setFromRotationMatrix(m);
		incrementBrushRotationVersion();
	}, [
		cameraOrientation,
		brushQuaternion,
		incrementBrushRotationVersion,
	]);

	const handleSelectCategory = useCallback(
		(category: 'none' | 'shape' | 'organism') => {
			if (category === 'none') {
				clearShape(); // Clears selectedShape, organism brush, etc.
				selectOrganismBrush(null);
				setSelectedShape('None');
			} else if (category === 'shape') {
				setSelectedShape('Cube'); // Default shape
				setShapeSize(3); // Set a default size for shapes
				selectOrganismBrush(null); // Clear organism brush selection
			} else if (category === 'organism') {
				// Default to first organism brush if available, otherwise 'None'
				const firstBrushId = organismBrushes.keys().next().value;
				if (firstBrushId) {
					selectOrganismBrush(firstBrushId);
					setSelectedShape('Organism Brush'); // Indicate an organism brush is active
				} else {
					setSelectedShape('None'); // No organism brushes available
					selectOrganismBrush(null);
				}
			}
			initBrushOrientation();
			setIsOpen(false);
		},
		[clearShape, selectOrganismBrush, setSelectedShape, organismBrushes, initBrushOrientation, setShapeSize], // Added setShapeSize
	);

	const handleSelectShape = useCallback(
		(shape: ShapeType) => {
			setSelectedShape(shape);
			// Set a default size for shapes, considering min size for Cube/Square vs others
			if (shape === 'Cube' || shape === 'Square') {
				setShapeSize(3); // Default to 3 for hollow to be visible
			} else if (shape !== 'Single Cell' && shape !== 'None' && shape !== 'Selected Community' && shape !== 'Organism Brush') {
				setShapeSize(3); // Default to 3 for other shapes that have size
			} else {
				setShapeSize(1); // Default to 1 for Single Cell, None, etc.
			}
			selectOrganismBrush(null); // Ensure organism brush is deselected
			initBrushOrientation();
			setIsOpen(false);
		},
		[setSelectedShape, selectOrganismBrush, initBrushOrientation, setShapeSize], // setShapeSize already present, no change needed here.
	);

	const handleSelectOrganismBrush = useCallback(
		(brushId: string | null) => {
			selectOrganismBrush(brushId);
			if (brushId) {
				setSelectedShape('Organism Brush'); // Indicate an organism brush is active
			} else {
				setSelectedShape('None'); // No organism brush selected
			}
			initBrushOrientation();
			setIsOpen(false);
		},
		[selectOrganismBrush, setSelectedShape, initBrushOrientation],
	);

	// Effect to close drop on outside click
	useClickOutside(dropRef, () => {
		setIsOpen(false);
		setHoveredCategory(null);
		setHoveredShapeName(null);
		setHoveredOrganismBrushId(null);
	});

	const handleButtonClick = () => {
		setIsOpen(prev => !prev);
		setHoveredCategory(null); // Reset hovered state when opening/closing main menu
		setHoveredShapeName(null);
		setHoveredOrganismBrushId(null);
	};

	const currentBrushLabel = useMemo(() => {
		if (selectedShape === 'None') return 'No Brush';
		if (selectedShape === 'Organism Brush' && selectedOrganismBrushId) {
			const brush = organismBrushes.get(selectedOrganismBrushId);
			return brush ? `Organism: ${brush.name}` : 'Organism Brush';
		}
		return `Shape: ${selectedShape}`;
	}, [selectedShape, selectedOrganismBrushId, organismBrushes]);

	return (
		<div
			id='brush-selector-button-wrapper'
			ref={dropRef}
			style={{ position: 'relative' }}
		>
			<button
				id='brush-selector-button'
				className='glass-button'
				onClick={handleButtonClick}
				data-tooltip-bottom='Select Brush Type'
			>
				<PaintBrushIcon />
				<span style={{ marginLeft: '8px' }}>{currentBrushLabel}</span>
			</button>
			{isOpen && (
				<div
					id='brush-list'
					className='dropdown-menu dropup'
				>
					{/* No Brush */}
					<button
						className={`dropdown-item ${activeCategory === 'none' ? 'selected' : ''}`}
						onClick={() => handleSelectCategory('none')}
						onMouseEnter={() => setHoveredCategory('none')}
						onMouseLeave={() => setHoveredCategory(null)}
					>
						No Brush
					</button>

					{/* Shapes */}
					<div
						className={`dropdown-item-with-submenu ${activeCategory === 'shape' ? 'selected' : ''}`}
						onMouseEnter={() => { setHoveredCategory('shape'); setShowShapesSubmenu(true); setShowOrganismsSubmenu(false); }}
						onMouseLeave={() => { setHoveredCategory(null); }}
						style={{ position: 'relative' }}
					>
						<button
							className='dropdown-item'
							onClick={() => handleSelectCategory('shape')}
						>
							Shapes
							<span className='submenu-arrow' style={{ marginLeft: 'auto' }}>&gt;</span>
						</button>
						{showShapesSubmenu && (
							<div
								className='dropdown-submenu'
								onMouseEnter={() => setShowShapesSubmenu(true)} // Keep submenu open if mouse enters it
								onMouseLeave={() => { setHoveredShapeName(null); setShowShapesSubmenu(false); }} // Close submenu if mouse leaves it
								style={{
									position: 'absolute',
									left: '100%',
									top: 0,
									backgroundColor: 'rgba(13, 17, 23, 0.9)',
									border: '1px solid rgba(255, 165, 0, 0.5)',
									borderRadius: '4px',
									minWidth: '150px',
									zIndex: 1001,
									display: 'flex',
									flexDirection: 'column',
								}}
							>
								{SHAPES.filter(name => name !== 'Selected Community' && name !== 'None').map(
									name => {
										const isSelected = name === selectedShape;
										const isHovered = name === hoveredShapeName;
										const isActive = isHovered || (hoveredShapeName === null && isSelected);

										return (
											<button
												key={name}
												className={`dropdown-item ${isActive ? 'selected' : ''}`}
												onClick={() => handleSelectShape(name)}
												onMouseEnter={() => setHoveredShapeName(name)}
											>
												{name}
											</button>
										);
									},
								)}
							</div>
						)}
					</div>

					{/* Organisms */}
					{enableOrganisms && (
						<div
							className={`dropdown-item-with-submenu ${activeCategory === 'organism' ? 'selected' : ''}`}
							onMouseEnter={() => { setHoveredCategory('organism'); setShowOrganismsSubmenu(true); setShowShapesSubmenu(false); }}
							onMouseLeave={() => { setHoveredCategory(null); }}
							style={{ position: 'relative' }}
						>
							<button
								className='dropdown-item'
								onClick={() => handleSelectCategory('organism')}
							>
								Organisms
								<span className='submenu-arrow' style={{ marginLeft: 'auto' }}>&gt;</span>
							</button>
							{showOrganismsSubmenu && (
								<div
									className='dropdown-submenu'
									onMouseEnter={() => setShowOrganismsSubmenu(true)} // Keep submenu open if mouse enters it
									onMouseLeave={() => { setHoveredOrganismBrushId(null); setShowOrganismsSubmenu(false); }} // Close submenu if mouse leaves it
									style={{
										position: 'absolute',
										left: '100%',
										top: 0,
										backgroundColor: 'rgba(13, 17, 23, 0.9)',
										border: '1px solid rgba(255, 165, 0, 0.5)',
										borderRadius: '4px',
										minWidth: '150px',
										zIndex: 1001,
										display: 'flex',
										flexDirection: 'column',
									}}
								>
									{organismBrushes.size === 0 ? (
										<span className='dropdown-item disabled' style={{ opacity: 0.7, cursor: 'default' }}>
											No saved organisms
										</span>
									) : (
										Array.from(organismBrushes.values()).map(brush => {
											const isSelected = brush.id === selectedOrganismBrushId;
											const isHovered = brush.id === hoveredOrganismBrushId;
											const isActive = isHovered || (hoveredOrganismBrushId === null && isSelected);

											return (
												<button
													key={brush.id}
													className={`dropdown-item ${isActive ? 'selected' : ''}`}
													onClick={() => handleSelectOrganismBrush(brush.id)}
													onMouseEnter={() => setHoveredOrganismBrushId(brush.id)}
												>
													{brush.name}
												</button>
											);
										})
									)}
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export function BrushControls() { // Removed selectedOrganismId prop
	const {
		state: { selectedShape, shapeSize, isHollow, paintMode, selectedOrganismBrushId, organismBrushes }, // Added selectedOrganismBrushId, organismBrushes
		actions: {
			setShapeSize,
			setIsHollow,
			setPaintMode,
			setSelectedShape,
			setCustomBrush,
			selectOrganismBrush, // Added selectOrganismBrush
		},
	} = useBrush();

	const handleBrushSizeChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setShapeSize(Number(e.target.value));
		},
		[setShapeSize],
	);

	const {
		state: { cameraOrientation, viewMode, gridSize },
		actions: { setCommunity },
		meta: { eventBus, gridRef },
	} = useSimulation();

	const {
		state: { brushQuaternion },
		actions: { incrementBrushRotationVersion },
	} = useBrush();

	const rotateBrush = useCallback(
		(axis: THREE.Vector3, angle: number) => {
			const rotationQuaternion =
				new THREE.Quaternion().setFromAxisAngle(axis, angle);
			brushQuaternion.current.multiply(rotationQuaternion);
			incrementBrushRotationVersion();
		},
		[brushQuaternion, incrementBrushRotationVersion],
	);

	const handleMove = useCallback(
		(key: string) => {
			const face = cameraOrientation.face;
			const rotation = cameraOrientation.rotation;

			if (face === 'unknown' || rotation === 'unknown') {
				console.warn(
					'Cannot move selector: camera orientation unknown.',
				);
				return;
			}

			const mapping = getWAXDQZMapping(
				face as CubeFace,
				rotation as CameraRotation,
			);
			let delta: [number, number, number] = [0, 0, 0];

			switch (key) {
				case 'w': // Up
					delta = mapping.w as [number, number, number];
					break;
				case 'x': // Down
					delta = mapping.x as [number, number, number];
					break;
				case 'a': // Left
					delta = mapping.a as [number, number, number];
					break;
				case 'd': // Right
					delta = mapping.d as [number, number, number];
					break;
				case 'q': // Farther
					delta = mapping.q as [number, number, number];
					break;
				case 'z': // Closer
					delta = mapping.z as [number, number, number];
					break;
				default:
					return;
			}
			eventBus.emit('moveSelector', { delta });
		},
		[cameraOrientation, eventBus],
	);

	const [position, setPosition] = useState(() => {
		if (typeof window !== 'undefined') {
			// Rough initial estimate for bottom-right to avoid top-left flicker
			// assuming panel is roughly ~400px by ~200px
			return {
				x: window.innerWidth - 420,
				y: window.innerHeight - 300,
			};
		}
		return { x: 10, y: 10 };
	}); // Initial position
	const [isDragging, setIsDragging] = useState(false);
	const dragOffset = useRef({ x: 0, y: 0 });
	const panelRef = useRef<HTMLDivElement>(null);

	const [activeKey, setActiveKey] = useState<string | null>(null);
	const [isContentVisible, setIsContentVisible] = useState(true); // New state for toggling content visibility

	useEffect(() => {
		let intervalId: NodeJS.Timeout | null = null;
		if (activeKey) {
			intervalId = setInterval(() => {
				handleMove(activeKey);
			}, 250); // Repeat every 0.25 seconds
		}
		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, [activeKey, handleMove]);

	// Effect to set initial position to top-right relative to its offset parent
	useEffect(() => {
		if (panelRef.current) {
			const panelRect = panelRef.current.getBoundingClientRect();
			const marginX = 10; // 10px margin from side edge
			const marginY = 110; // 10px margin + 100px height for the AppFooterPanel

			// Calculate initial position to be bottom-right with margins
			const initialX = window.innerWidth - panelRect.width - marginX;
			const initialY = window.innerHeight - panelRect.height - marginY;

			setPosition({ x: initialX, y: initialY });
		}
	}, []); // Empty dependency array means it runs once after initial render

	// Effect to handle window resize and re-clamp position relative to its offset parent
	useEffect(() => {
		const handleResize = () => {
			if (panelRef.current) {
				const panelRect = panelRef.current.getBoundingClientRect();

				const minX = 10;
				const minY = 10;
				const maxX = window.innerWidth - panelRect.width - 10;
				const maxY = window.innerHeight - panelRect.height - 110; // keep above footer

				// Use functional update to get the latest position state
				setPosition(prevPosition => {
					const currentX = prevPosition.x;
					const currentY = prevPosition.y;

					const clampedX = Math.max(minX, Math.min(currentX, maxX));
					const clampedY = Math.max(minY, Math.min(currentY, maxY));

					if (clampedX !== currentX || clampedY !== currentY) {
						return { x: clampedX, y: clampedY };
					}
					return prevPosition; // No change needed
				});
			}
		};

		window.addEventListener('resize', handleResize);

		// Watch for dynamic size changes (e.g., fonts loading or content expanding)
		let resizeObserver: ResizeObserver | null = null;
		if (panelRef.current) {
			resizeObserver = new ResizeObserver(() => {
				handleResize();
			});
			resizeObserver.observe(panelRef.current);
		}

		return () => {
			window.removeEventListener('resize', handleResize);
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
		};
	}, []); // Empty dependency array: listener is set up once and uses functional update for state

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		// Prevent dragging if the event originated from the size slider or the header toggle button
		if (
			('tagName' in (e.target as HTMLElement) && (e.target as HTMLInputElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type === 'range') ||
			(e.target as HTMLElement).closest('#brush-controls-toggle-button')
		) {
			return;
		}

		if (panelRef.current) {
			const panelElement = panelRef.current;
			const panelRect = panelElement.getBoundingClientRect();
			const debugInfo = {
				pointerAbsolute: { x: e.clientX, y: e.clientY },
				brushControlsAbsolute: { x: panelRect.left, y: panelRect.top },
				dragOffset: {
					x: e.clientX - panelRect.left,
					y: e.clientY - panelRect.top,
				},
			};
			(window as any).debugInfo = debugInfo;

			setIsDragging(true);
			dragOffset.current = {
				x: e.clientX - panelRef.current.getBoundingClientRect().left,
				y: e.clientY - panelRef.current.getBoundingClientRect().top,
			};
			panelRef.current.style.cursor = 'grabbing';
		}
	}, []);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging) return;

			const panelElement = panelRef.current;
			if (!panelElement) return;

			const panelRect = panelElement.getBoundingClientRect();

			// Calculate the new top-left corner of the panel in viewport coordinates
			const newPanelLeft_viewport = e.clientX - dragOffset.current.x;
			const newPanelTop_viewport = e.clientY - dragOffset.current.y;

			// Define clamping boundaries relative to the viewport
			const minX = 10;
			const minY = 10;
			const maxX = window.innerWidth - panelRect.width - 10;
			const maxY = window.innerHeight - panelRect.height - 110; // keep above footer

			// Clamp the position relative to the viewport
			const clampedX = Math.max(
				minX,
				Math.min(newPanelLeft_viewport, maxX),
			);
			const clampedY = Math.max(
				minY,
				Math.min(newPanelTop_viewport, maxY),
			);

			setPosition({
				x: clampedX,
				y: clampedY,
			});

			const debugInfo = {
				pointerAbsolute: { x: e.clientX, y: e.clientY },
				brushControlsAbsolute: { x: clampedX, y: clampedY },
				dragOffset: dragOffset.current,
			};
			(window as any).debugInfo = debugInfo;
		},
		[isDragging],
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		if (panelRef.current) {
			panelRef.current.style.cursor = 'grab';
		}
	}, []);

	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		// Prevent dragging if the event originated from the size slider or the header toggle button
		if (
			('tagName' in (e.target as HTMLElement) && (e.target as HTMLInputElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type === 'range') ||
			(e.target as HTMLElement).closest('#brush-controls-toggle-button')
		) {
			return;
		}

		if (panelRef.current) {
			e.preventDefault(); // Prevent scrolling or zooming
			const panelElement = panelRef.current;
			const panelRect = panelElement.getBoundingClientRect();
			dragOffset.current = {
				x: e.touches[0].clientX - panelRect.left,
				y: e.touches[0].clientY - panelRect.top,
			};
			setIsDragging(true);
		}
	}, []);

	const handleTouchMove = useCallback(
		(e: TouchEvent) => {
			if (!isDragging) return;
			e.preventDefault(); // Prevent scrolling during drag

			const panelElement = panelRef.current;
			if (!panelElement) return;

			const panelRect = panelElement.getBoundingClientRect();

			const newPanelLeft_viewport =
				e.touches[0].clientX - dragOffset.current.x;
			const newPanelTop_viewport =
				e.touches[0].clientY - dragOffset.current.y;

			const minX = 10;
			const minY = 10;
			const maxX = window.innerWidth - panelRect.width - 10;
			const maxY = window.innerHeight - panelRect.height - 110; // keep above footer

			const clampedX = Math.max(
				minX,
				Math.min(newPanelLeft_viewport, maxX),
			);
			const clampedY = Math.max(
				minY,
				Math.min(newPanelTop_viewport, maxY),
			);

			setPosition({
				x: clampedX,
				y: clampedY,
			});
		},
		[isDragging],
	);

	const handleTouchEnd = useCallback(() => {
		setIsDragging(false);
	}, []);

	useEffect(() => {
		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
			window.addEventListener('touchmove', handleTouchMove, {
				passive: false,
			});
			window.addEventListener('touchend', handleTouchEnd);
		} else {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('touchmove', handleTouchMove as unknown as EventListener);
			window.removeEventListener('touchend', handleTouchEnd);
		}

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('touchmove', handleTouchMove as unknown as EventListener);
			window.removeEventListener('touchend', handleTouchEnd);
		};
	}, [
		isDragging,
		handleMouseMove,
		handleMouseUp,
		handleTouchMove,
		handleTouchEnd,
	]);

	useEffect(() => {
		const handleCellClick = (payload: {
			x: number;
			y: number;
			z: number;
		}) => {
			const { x, y, z } = payload;

			// Only respond to clicks in edit mode
			if (viewMode) { // Removed selectedOrganismId check here
				return;
			}

			const grid = gridRef.current;
			if (!grid) {
				console.warn('Grid not available for cell click.');
				return;
			}

			// Check if the clicked cell is alive
			if (grid.get(x, y, z)) {
				const communityMap = grid.getAllCommunities();
				const clickedCellKey = `${x},${y},${z}`;
				const clickedCommunityId = communityMap.get(clickedCellKey);

				if (clickedCommunityId !== undefined) {
					const selectedCommunityCells: Array<
						[number, number, number]
					> = [];
					for (const [key, id] of communityMap.entries()) {
						if (id === clickedCommunityId) {
							const parts = key.split(',').map(Number);
							selectedCommunityCells.push([
								parts[0],
								parts[1],
								parts[2],
							]);
						}
					}

					setCustomOffsets(selectedCommunityCells); // Corrected from setCustomBrush
					setCommunity(selectedCommunityCells); // Set the community in SimulationContext
					setSelectedShape('Selected Community'); // Keep this for internal state, but it won't be in dropdown
					selectOrganismBrush(null); // Ensure no organism brush is selected when a community is selected
					setPaintMode(1); // Set to Activate mode
					eventBus.emit('showCommunityPanel', true); // Emit event to show the new panel
				}
			}
		};

		const unsubscribe = eventBus.on('cellClick', handleCellClick);
		const unsubscribeShowCommunityPanel = eventBus.on(
			'showCommunityPanel',
			show => {
				// This listener is just to prevent errors if the event is emitted before AppHeaderPanel is ready
				// The actual state management for showing the panel will be in AppHeaderPanel
			},
		);

		return () => {
			unsubscribe();
			unsubscribeShowCommunityPanel();
		};
	}, [
		viewMode,
		gridRef,
		eventBus,
		setCustomBrush,
		setSelectedShape,
		setPaintMode,
		setCommunity, // Added setCommunity to dependencies
		selectOrganismBrush, // Added selectOrganismBrush to dependencies
	]);

	const toggleContentVisibility = useCallback(() => {
		setIsContentVisible(prev => !prev);
	}, []);

	if (viewMode) return null; // Removed selectedOrganismId check

	return (
		<div
			id='brush-controls'
			ref={panelRef}
			style={{
				position: 'fixed', // Changed from absolute
				top: position.y,
				left: position.x,
				width: 'fit-content',
				minWidth: '220px',
				backgroundColor: 'rgba(13, 17, 23, 0.8)', // Using a specific color with transparency
				padding: '16px', // Increased padding for better aesthetics
				boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
				zIndex: 1000,
				display: 'flex',
				flexDirection: 'column', // Changed to column to stack header and controls
				touchAction: 'none', // Prevent default touch actions like scrolling
				border: '2px solid rgba(255, 165, 0, 0.5)', // Subtler orange outline
				borderRadius: '8px', // Small corner radius
			}}
			aria-label='Brush Controls Panel' // Added for accessibility in tests
		>
			<div
				id='brush-controls-header'
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					paddingBottom: '12px',
					cursor: isDragging ? 'grabbing' : 'grab', // Cursor for dragging header
					userSelect: 'none', // Prevent highlighting when dragging
				}}
				onMouseDown={handleMouseDown}
				onTouchStart={handleTouchStart}
			>
				{/* The BrushSelectorDrop now displays the current brush label */}
				{/* <span
					id='Selected-Brush-Label'
					style={{
						fontWeight: 'bold',
						color: '#FFA500', // Subtler orange color for text
						cursor: 'inherit', // Inherit cursor from parent for dragging
					}}
				>
					Brush: {selectedShape}
				</span> */}
				<span
					id='brush-effect-label'
					style={{
						marginRight: '17px',
						marginLeft: '4px', // Add space between shape and effect
						fontWeight: 'bold',
						color: '#FFA500', // Subtler orange color for text
						cursor: 'inherit', // Inherit cursor from parent for dragging
					}}
				>
					{paintMode === 1
						? 'Activate'
						: paintMode === -1
							? 'Deactivate'
							: '(No Effect)'}
				</span>
				{/* Arrow indicator for expand/collapse */}
				<span
					id='brush-controls-toggle-button'
					style={{
						marginLeft: 'auto',
						cursor: 'pointer',
						transform: isContentVisible
							? 'rotate(0deg)'
							: 'rotate(-90deg)',
						transition: 'transform 0.2s ease',
					}}
					onClick={toggleContentVisibility}
				>
					<ArrowDownIcon />
				</span>
			</div>

			{isContentVisible && (
				<>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(4, 1fr) 5px auto', // 4 flexible columns, a 5px spacer, and an auto column for paint/clear
							gridTemplateRows: 'repeat(6, auto)', // 6 rows for more vertical space
							gap: '8px',
							alignItems: 'center',
							userSelect: 'none',
						}}
						aria-label='Brush Controls Grid'
					>
						{/* Brush Selector Dropdown (now spans across the first 4 columns) */}
						<div style={{ gridColumn: '1 / 5', gridRow: '1 / 2' }}>
							<BrushSelectorDrop />
						</div>
						{(() => {
							const showSizeControls =
								selectedShape !== 'None' &&
								selectedShape !== 'Single Cell' &&
								selectedShape !== 'Selected Community' &&
								selectedShape !== 'Organism Brush';

							const showHollowCheckbox =
								showSizeControls &&
								supportsHollow(selectedShape) &&
								shapeSize > 2;

							return (
								<>
									{/* Size control */}
									<div
										className='brush-size-control'
										style={{
											gridColumn: '1 / 5',
											gridRow: '2 / 3',
											width: 'unset',
											visibility: showSizeControls
												? 'visible'
												: 'hidden',
											pointerEvents: showSizeControls ? 'auto' : 'none',
											display: 'flex',
											alignItems: 'center',
											gap: '8px',
										}}
									>
										<span>Size: {shapeSize}</span>
										<input
											type='range'
											min={
												selectedShape === 'Cube' ||
													selectedShape === 'Square'
													? 2
													: 3
											}
											max={gridSize}
											step={1}
											value={shapeSize}
											onChange={handleBrushSizeChange}
											style={{ flexGrow: 1 }}
										/>
									</div>
									{/* Hollow checkbox */}
									<label
										className='control-label row'
										style={{
											gridColumn: '1 / 5',
											gridRow: '3 / 4',
											margin: 0,
											display: 'flex',
											alignItems: 'center',
											gap: '4px',
											cursor: 'pointer',
											color: '#8b949e',
											visibility: showHollowCheckbox
												? 'visible'
												: 'hidden',
											pointerEvents: showHollowCheckbox
												? 'auto'
												: 'none',
										}}
									>
										<input
											type='checkbox'
											className='glass-checkbox'
											checked={isHollow}
											disabled={!supportsHollow(selectedShape)}
											onChange={e => setIsHollow(e.target.checked)}
										/>
										Hollow
									</label>
								</>
							);
						})()}

						{/* Activate and Clear buttons (now span rows 1-3 in the last column) */}
						<div
							style={{
								gridColumn: '6 / 7',
								gridRow: '1 / 4',
								display: 'flex',
								flexDirection: 'column',
								gap: '5px',
								justifyContent: 'space-around',
							}}
						>
							<button
								className={`glass-button alive-button success ${paintMode === 1 ? 'active' : ''}`}
								onClick={() =>
									setPaintMode(prev => (prev === 1 ? 0 : 1))
								}
								data-tooltip-bottom='Activate (Paint) (Space)'
							>
								<PlusIcon />
							</button>
							<button
								className={`glass-button edit-action-button clear-button danger ${paintMode === -1 ? 'active' : ''}`}
								onClick={() =>
									setPaintMode(prev => (prev === -1 ? 0 : -1))
								}
								data-tooltip-bottom='Clear (Delete)'
							>
								<MinusIcon />
							</button>
						</div>

						{/* Directional controls */}
						{/* UP */}
						<div
							style={{
								gridColumn: '3 / 4',
								gridRow: '4 / 5',
								display: 'flex',
								justifyContent: 'center',
							}}
						>
							<button
								id='upBtn'
								className='glass-button'
								onMouseDown={e => {
									e.stopPropagation();
									handleMove('w');
									setActiveKey('w');
								}}
								onMouseUp={() => setActiveKey(null)}
								onMouseLeave={() => setActiveKey(null)}
								style={{ width: '50px', height: '30px' }}
							>
								<ArrowUpIcon />
							</button>
						</div>
						{/* DOWN */}
						<div
							style={{
								gridColumn: '3 / 4',
								gridRow: '6 / 7',
								display: 'flex',
								justifyContent: 'center',
							}}
						>
							<button
								id='downBtn'
								className='glass-button'
								onMouseDown={e => {
									e.stopPropagation();
									handleMove('x');
									setActiveKey('x');
								}}
								onMouseUp={() => setActiveKey(null)}
								onMouseLeave={() => setActiveKey(null)}
								style={{ width: '50px', height: '30px' }}
							>
								<ArrowDownIcon />
							</button>
						</div>
						{/* LEFT */}
						<div
							style={{
								gridColumn: '2 / 3',
								gridRow: '5 / 6',
								display: 'flex',
								justifyContent: 'center',
							}}
						>
							<button
								id='leftBtn'
								className='glass-button'
								onMouseDown={e => {
									e.stopPropagation();
									handleMove('a');
									setActiveKey('a');
								}}
								onMouseUp={() => setActiveKey(null)}
								onMouseLeave={() => setActiveKey(null)}
								style={{ width: '50px', height: '30px' }}
							>
								<ArrowLeftIcon />
							</button>
						</div>
						{/* RIGHT */}
						<div
							style={{
								gridColumn: '4 / 5',
								gridRow: '5 / 6',
								display: 'flex',
								justifyContent: 'center',
							}}
						>
							<button
								id='rightBtn'
								className='glass-button'
								onMouseDown={e => {
									e.stopPropagation();
									handleMove('d');
									setActiveKey('d');
								}}
								onMouseUp={() => setActiveKey(null)}
								onMouseLeave={() => setActiveKey(null)}
								style={{ width: '50px', height: '30px' }}
							>
								<ArrowRightIcon />
							</button>
						</div>
						{/* FARTHER */}
						<div
							style={{
								gridColumn: '6 / 7',
								gridRow: '4 / 5',
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<button
								id='fartherBtn'
								className='glass-button'
								onMouseDown={e => {
									e.stopPropagation();
									handleMove('q');
									setActiveKey('q');
								}}
								onMouseUp={() => setActiveKey(null)}
								onMouseLeave={() => setActiveKey(null)}
								style={{
									width: '100%',
									height: '40px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: '8pt',
								}}
							>
								<AwayIcon />
								&nbsp;&nbsp;Farther
							</button>
						</div>
						{/* CLOSER */}
						<div
							style={{
								gridColumn: '6 / 7',
								gridRow: '5 / 6',
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<button
								id='closerBtn'
								className='glass-button'
								onMouseDown={e => {
									e.stopPropagation();
									handleMove('z');
									setActiveKey('z');
								}}
								onMouseUp={() => setActiveKey(null)}
								onMouseLeave={() => setActiveKey(null)}
								style={{
									width: '100%',
									height: '40px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontWeight: 'bold',
								}}
							>
								<CloserIcon />
								&nbsp;&nbsp;Closer{' '}
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
