import React, {
	useCallback,
	useState,
	useRef,
	useEffect,
	useMemo,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import chroma from 'chroma-js';
import { useSimulation } from '../contexts/SimulationContext';
import { makeKey } from '../core/Organism';
import { useBrush } from '../contexts/BrushContext';
import { ClaimHint } from './ClaimHint';

// Rotating community 3D preview
function CommunityPreview({
	community,
	gridSize,
}: {
	community: Array<[number, number, number]>;
	gridSize: number;
}) {
	const groupRef = useRef<THREE.Group>(null);

	// Calculate center offset to center the community
	const { cells, maxDim } = useMemo(() => {
		if (community.length === 0) return { cells: [], maxDim: 1 };

		const minX = Math.min(...community.map(c => c[0]));
		const maxX = Math.max(...community.map(c => c[0]));
		const minY = Math.min(...community.map(c => c[1]));
		const maxY = Math.max(...community.map(c => c[1]));
		const minZ = Math.min(...community.map(c => c[2]));
		const maxZ = Math.max(...community.map(c => c[2]));

		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;
		const centerZ = (minZ + maxZ) / 2;

		const maxDim = Math.max(
			maxX - minX + 1,
			maxY - minY + 1,
			maxZ - minZ + 1,
		);

		return {
			cells: community.map(
				([x, y, z]) =>
					[x - centerX, y - centerY, z - centerZ] as [
						number,
						number,
						number,
					],
			),
			maxDim,
		};
	}, [community]);

	// Auto-rotate
	useFrame((_, delta) => {
		if (groupRef.current) {
			groupRef.current.rotation.y += delta * 0.5;
			groupRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
		}
	});

	const scale = 4 / Math.max(maxDim, 1);

	return (
		<group ref={groupRef} scale={[scale, scale, scale]}>
			{cells.map((cell, i) => {
				const [x, y, z] = community[i];
				const hue = (x / gridSize) * 300;
				const saturation = 0.4 + ((gridSize - 1 - z) / gridSize) * 0.6;
				const color = chroma.hsl(240 - hue, saturation, 0.55).hex();

				return (
					<mesh key={i} position={[cell[0], cell[1], cell[2]]}>
						<boxGeometry args={[0.85, 0.85, 0.85]} />
						<meshStandardMaterial
							color={color}
							emissive={color}
							emissiveIntensity={0.3}
						/>
					</mesh>
				);
			})}
			{cells.map((cell, i) => {
				const [x, y, z] = community[i];
				const hue = (x / gridSize) * 300;
				const saturation = 0.4 + ((gridSize - 1 - z) / gridSize) * 0.6;
				const color = chroma
					.hsl(240 - hue, saturation, 0.55)
					.darken(0.5)
					.hex();

				return (
					<lineSegments
						key={`edge-${i}`}
						position={[cell[0], cell[1], cell[2]]}
					>
						<edgesGeometry
							args={[new THREE.BoxGeometry(0.9, 0.9, 0.9)]}
						/>
						<lineBasicMaterial color={color} />
					</lineSegments>
				);
			})}
		</group>
	);
}

interface SelectedCommunityPanelProps {
	isVisible: boolean;
}

export function SelectedCommunityPanel({
	isVisible,
}: SelectedCommunityPanelProps) {
	const {
		state: {
			gridSize,
			community,
			viewMode,
			birthMargin,
			organisms,
			organismsVersion,
			enableOrganisms,
			selectedOrganismId,
		},
		actions: {
			setCommunity,
			convertCommunityToOrganism,
			selectOrganism,
			disorganizeOrganism,
		},
	} = useSimulation();
	const {
		actions: { setCommunityBrush, setSelectedShape, setPaintMode },
	} = useBrush();
	const [isCollapsed, setIsCollapsed] = useState(true);
	const [showTooltip, setShowTooltip] = useState(false); // Add this line
	const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 }); // Add this line

	const matchingOrganism = useMemo(() => {
		if (selectedOrganismId) return organisms.get(selectedOrganismId) || null;
		if (community.length === 0) return null;
		const communityKeys = new Set(
			community.map(([x, y, z]) => makeKey(x, y, z)),
		);
		for (const org of organisms.values()) {
			// Sticky matching: If the selected community shares ANY cell with a known organism,
			// we identify it as that organism. This ensures the UI remains stable even as
			// the organism fluctuates in size or shape.
			for (const key of communityKeys) {
				if (org.livingCells.has(key)) return org;
			}
		}
		return null;
	}, [community, organisms, organismsVersion, selectedOrganismId]);

	const sortedOrganisms = useMemo(() => {
		return Array.from(organisms.values()).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
	}, [organisms, organismsVersion]);


	const wallDistances = useMemo(() => {
		if (!matchingOrganism || !matchingOrganism.centroid) return [];
		const [x, y, z] = matchingOrganism.centroid;
		const distances = [
			{ axis: 'X', dist: x, label: 'X-Low' },
			{ axis: 'X', dist: gridSize - 1 - x, label: 'X-High' },
			{ axis: 'Y', dist: y, label: 'Y-Low' },
			{ axis: 'Y', dist: gridSize - 1 - y, label: 'Y-High' },
			{ axis: 'Z', dist: z, label: 'Z-Low' },
			{ axis: 'Z', dist: gridSize - 1 - z, label: 'Z-High' },
		];
		return distances.sort((a, b) => a.dist - b.dist).slice(0, 3);
	}, [matchingOrganism, gridSize]);

	const [position, setPosition] = useState({ x: 20, y: 100 }); // Default fallback
	const [isDragging, setIsDragging] = useState(false);
	const dragOffset = useRef({ x: 0, y: 0 });
	const panelRef = useRef<HTMLDivElement>(null);

	// Effect to set initial position to top-right correctly on mount
	useEffect(() => {
		const updateInitialPosition = () => {
			if (panelRef.current) {
				const panelRect = panelRef.current.getBoundingClientRect();
				const margin = 20;
				// If width is suspiciously small, use a default estimate
				const panelWidth = panelRect.width > 50 ? panelRect.width : 300;
				
				const initialX = window.innerWidth - panelWidth - margin;
				const initialY = margin + 80; // Slightly below the header

				setPosition({ x: Math.max(margin, initialX), y: initialY });
			}
		};

		// Run after a small delay to ensure rendering has happened
		const timer = setTimeout(updateInitialPosition, 100);
		return () => clearTimeout(timer);
	}, []);

	// Effect to handle window resize and re-clamp position relative to its offset parent
	useEffect(() => {
		const handleResize = () => {
			if (panelRef.current) {
				const panelRect = panelRef.current.getBoundingClientRect();

				const minX = 10;
				const minY = 10;
				const maxX = window.innerWidth - panelRect.width - 10;
				const maxY = window.innerHeight - panelRect.height - 10;

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
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []); // Empty dependency array: listener is set up once and uses functional update for state

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if (panelRef.current) {
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

			const newPanelLeft_viewport = e.clientX - dragOffset.current.x;
			const newPanelTop_viewport = e.clientY - dragOffset.current.y;

			const minX = 10;
			const minY = 10;
			const maxX = window.innerWidth - panelRect.width - 10;
			const maxY = window.innerHeight - panelRect.height - 10;

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

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		if (panelRef.current) {
			panelRef.current.style.cursor = 'grab';
		}
	}, []);

	const handleTouchStart = useCallback((e: React.TouchEvent) => {
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
			const maxY = window.innerHeight - panelRect.height - 10;

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

	const handleMouseEnterPreview = useCallback(() => {
		if (matchingOrganism) { // Only show tooltip if it's an organism
			setShowTooltip(true);
		}
	}, [matchingOrganism]); // Dependency on matchingOrganism

	const handleMouseLeavePreview = useCallback(() => {
		setShowTooltip(false);
	}, []);

	const handleMouseMovePreview = useCallback((e: React.MouseEvent) => {
		// Position the tooltip slightly offset from the cursor
		setTooltipPosition({ x: e.clientX + 10, y: e.clientY + 10 });
	}, []);

	useEffect(() => {
		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
			window.addEventListener(
				'touchmove',
				handleTouchMove as unknown as EventListener,
				{ passive: false },
			);
			window.addEventListener(
				'touchend',
				handleTouchEnd as unknown as EventListener,
			);
		} else {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener(
				'touchmove',
				handleTouchMove as unknown as EventListener,
			);
			window.removeEventListener(
				'touchend',
				handleTouchEnd as unknown as EventListener,
			);
		}

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener(
				'touchmove',
				handleTouchMove as unknown as EventListener,
			);
			window.removeEventListener(
				'touchend',
				handleTouchEnd as unknown as EventListener,
			);
		};
	}, [
		isDragging,
		handleMouseMove,
		handleMouseUp,
		handleTouchMove,
		handleTouchEnd,
	]);

	if (!isVisible) return null;

	return (
		<>
			<div
				id='community-sidebar'
				ref={panelRef}
				className={`community-sidebar ${isCollapsed ? 'collapsed' : ''}`}
				style={{
					position: 'fixed',
					top: position.y,
					left: position.x,
					width: isCollapsed ? 'fit-content' : '25vw',
					minWidth: isCollapsed ? 'unset' : '220px',
					maxWidth: isCollapsed ? 'unset' : '400px',
					touchAction: 'none',
					zIndex: 1000,
					background: '#1a1a1a', // 100% Opaque
					border: '1px solid #333',
					borderRadius: '8px',
					boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
					color: 'white',
					pointerEvents: 'none', // Allow clicks to pass through to the Canvas
				}}
			>
				<header
					className='sidebar-header'
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: isCollapsed ? 0 : '12px',
						cursor: isDragging ? 'grabbing' : 'grab',
						pointerEvents: 'auto', // Capture clicks on the header
						userSelect: 'none',   // PREVENT TEXT SELECTION DURING DRAG
						padding: '4px 8px',   // Better grab area
					}}
					onMouseDown={handleMouseDown}
					onTouchStart={handleTouchStart}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							flex: 1,
						}}
					>
						<span
							onClick={e => {
								e.stopPropagation();
								setIsCollapsed(!isCollapsed);
							}}
							style={{
								cursor: 'pointer',
								fontSize: '12px',
								opacity: 0.6,
								width: '12px',
							}}
						>
							{isCollapsed ? '▼' : '▲'}
						</span>
						<h3 style={{ margin: 0, fontSize: '14px' }}>
							{matchingOrganism ? (
								<>
									<span role='img' aria-label='organism'>
										🧬
									</span>{' '}
									{matchingOrganism.name}
								</>
							) : (
								'Community Selection'
							)}
						</h3>
					</div>
				</header>

				{!isCollapsed && (
					<div style={{ padding: '0 12px 12px 12px', pointerEvents: 'auto' }}>
						{/* Toolbar is always visible if NOT collapsed */}
						{(community.length > 0 || organisms.size > 0) && (
							<div
								className='community-toolbar'
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									gap: '8px',
									paddingBottom: '12px',
									borderBottom: '1px solid #444',
									marginBottom: '12px',
								}}
							>
								<div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
									<select
										value={matchingOrganism?.id || ''}
										onChange={e =>
											selectOrganism(e.target.value || null)
										}
										style={{
											background: 'rgba(255,255,255,0.05)',
											color: 'white',
											border: '1px solid rgba(255,255,255,0.2)',
											borderRadius: '4px',
											padding: '2px 4px',
											fontSize: '11px',
											maxWidth: '110px',
										}}
									>
										<option value=''>Select Organism...</option>
										{sortedOrganisms.map(org => (
											<option key={org.id} value={org.id}>
												{org.name}
											</option>
										))}
									</select>

									{enableOrganisms && (
										<button
											className={`icon-button ${matchingOrganism ? 'active' : ''}`}
											title='Organize: Convert to Organism'
											onClick={e => {
												e.stopPropagation();
												convertCommunityToOrganism(
													community,
												);
											}}
											disabled={!!matchingOrganism}
											style={{ flexShrink: 0 }}
										>
											<svg
												width='14'
												height='14'
												viewBox='0 0 24 24'
												fill='none'
											>
												<circle
													cx='12'
													cy='12'
													r='10'
													stroke='currentColor'
													strokeWidth='2'
												/>
												<rect
													x='7.5'
													y='7.5'
													width='3.5'
													height='3.5'
													fill='currentColor'
												/>
												<rect
													x='13'
													y='7.5'
													width='3.5'
													height='3.5'
													fill='currentColor'
												/>
												<rect
													x='10.25'
													y='13'
													width='3.5'
													height='3.5'
													fill='currentColor'
												/>
											</svg>
										</button>
									)}

									<button
										className='icon-button danger'
										title='Disorganize'
										onClick={e => {
											e.stopPropagation();
											if (matchingOrganism) {
												disorganizeOrganism(
													matchingOrganism.id,
												);
											}
										}}
										disabled={!matchingOrganism}
										style={{ flexShrink: 0 }}
									>
										<svg
											width='16'
											height='16'
											viewBox='0 0 24 24'
											fill='none'
										>
											<circle
												cx='12'
												cy='12'
												r='10'
												stroke='currentColor'
												strokeWidth='2'
												strokeDasharray='3,3'
											/>
											<rect
												x='7'
												y='7'
												width='3'
												height='3'
												fill='currentColor'
												opacity='0.7'
											/>
											<rect
												x='14'
												y='8'
												width='2'
												height='2'
												fill='currentColor'
												opacity='0.5'
											/>
											<rect
												x='10'
												y='14'
												width='3'
												height='3'
												fill='currentColor'
												opacity='0.8'
											/>
										</svg>
									</button>
								</div>

								<div style={{ display: 'flex', gap: '8px' }}>
									<button
										className='icon-button'
										title='Activate Brush'
										onClick={e => {
											e.stopPropagation();
											setCommunityBrush(community);
											setSelectedShape('Selected Community');
											setPaintMode(1);
										}}
									>
										<svg
											width='14'
											height='14'
											viewBox='0 0 24 24'
											fill='none'
											stroke='currentColor'
											strokeWidth='2'
											strokeLinecap='round'
											strokeLinejoin='round'
										>
											<path d='m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z' />
											<path d='M5 3v4' />
											<path d='M19 17v4' />
										</svg>
									</button>
								</div>
							</div>
						)}

						{community.length === 0 ? (
							<p className='no-community' style={{ fontSize: '12px', opacity: 0.5, textAlign: 'center', margin: '20px 0' }}>
								Click on a living cell in Edit mode to view its community
							</p>
						) : (
							<>
								<div className='community-stats' style={{ 
									fontSize: '11px', 
									marginBottom: '12px',
									display: 'flex',
									flexDirection: 'column',
									gap: '6px'
								}}>
									{/* Row 1: Cells and Cytoplasm */}
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
										<span>Cells: <strong>{community.length}</strong></span>
										{matchingOrganism && (
											<>
												<span style={{ opacity: 0.5 }}>|</span>
												<span>Cytoplasm: <strong>{matchingOrganism.cytoplasm.size}</strong></span>
												<div
													style={{
														width: '8px',
														height: '8px',
														borderRadius: '50%',
														backgroundColor: matchingOrganism.skinColor,
														border: '1px solid rgba(255,255,255,0.3)',
													}}
													title={`Skin Color: ${matchingOrganism.skinColor}`}
												></div>
											</>
										)}
									</div>

									{matchingOrganism && (
										<>
											{/* Row 2: Heading */}
											<div style={{ display: 'flex', gap: '8px' }}>
												<span style={{ opacity: 0.7 }}>Heading:</span>
												<span style={{ fontFamily: 'ui-monospace, monospace' }}>
													{matchingOrganism.travelVector
														? `[${matchingOrganism.travelVector.map(v => v.toFixed(2)).join(', ')}]`
														: 'None'}
												</span>
											</div>

											{/* Row 3: Wall Distances (One line) */}
											<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
												<span style={{ opacity: 0.7 }}>Walls:</span>
												<div style={{ display: 'flex', gap: '12px' }}>
													{wallDistances.map((wd, i) => (
														<span key={i} style={{ fontSize: '10px' }}>
															{wd.axis}: <strong>{wd.dist.toFixed(1)}</strong>
														</span>
													))}
												</div>
											</div>

											{/* Row 4: Eaten Count */}
											<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
													{/* Apple body */}
													<path d="M12 5C8.7 5 6 7.7 6 11s2.7 6 6 6 6-2.7 6-6c0-0.8-0.2-1.5-0.5-2.2" />
													{/* Stem */}
													<path d="M12 5V3" />
													{/* Bite mark */}
													<path d="M18 9.5c0.5 0.5 1 0.5 1.5 0" />
													<path d="M17.5 11c0.5 0.5 1 0.5 1.5 0" />
													<path d="M18 12.5c0.5 0.5 1 0.5 1.5 0" />
												</svg>
												<span style={{ opacity: 0.7 }}>Eaten:</span>
												<span style={{ fontWeight: 'bold', color: '#ff4d4d' }}>{matchingOrganism.eatenCount || 0}</span>
											</div>

											{/* Row 5: GOL Rules */}
											<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
												<span style={{ opacity: 0.7 }}>Rules:</span>
												<span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '10px' }}>
													S{matchingOrganism.rules.surviveMin}-{matchingOrganism.rules.surviveMax}, B{matchingOrganism.rules.birthMin}-{matchingOrganism.rules.birthMax}
													{matchingOrganism.rules.neighborFaces ? ' F' : ''}
													{matchingOrganism.rules.neighborEdges ? ' E' : ''}
													{matchingOrganism.rules.neighborCorners ? ' C' : ''}
												</span>
											</div>
										</>
									)}
								</div>

								<div
									className='community-3d-wrapper'
									style={{ height: '200px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}
									onMouseEnter={handleMouseEnterPreview}
									onMouseLeave={handleMouseLeavePreview}
									onMouseMove={handleMouseMovePreview}
								>
									<Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
										<ambientLight intensity={0.5} />
										<pointLight position={[10, 10, 10]} intensity={1} />
										<CommunityPreview
											community={community}
											gridSize={gridSize}
										/>
									</Canvas>
								</div>
							</>
						)}
					</div>
				)}
			</div>

			{showTooltip && matchingOrganism && (
				<div
					style={{
						position: 'fixed',
						top: tooltipPosition.y,
						left: tooltipPosition.x,
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						color: 'white',
						padding: '4px 8px',
						borderRadius: '4px',
						fontSize: '11px',
						pointerEvents: 'none',
						zIndex: 1001,
						border: '1px solid #444',
					}}
				>
					{matchingOrganism.name}
				</div>
			)}
		</>
	);
}
