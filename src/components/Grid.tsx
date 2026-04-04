import { Html, PerspectiveCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useBrush } from '../contexts/BrushContext';
import { useSimulation } from '../contexts/SimulationContext';
import {
	type CameraFace,
	type CameraOrientation,
	type CameraRotation,
} from '../core/faceOrientationKeyMapping';
import { generateShape } from '../core/shapes';
import { Cells } from './Cell';
import { OrganismSkins } from './OrganismSkins';
import { OrganismCoreVisuals } from './OrganismCoreVisuals';
import { OrganismCoreVisuals } from './OrganismCoreVisuals';
import { makeKey } from '../core/Organism';

const _toCamera = new THREE.Vector3();
const _localToCamera = new THREE.Vector3();
const _localUp = new THREE.Vector3();
const _cubeQuatInv = new THREE.Quaternion();

function getOrientation(
	camera: THREE.Camera,
	controlsTarget: THREE.Vector3,
	cube: THREE.Group,
): CameraOrientation {
	_toCamera.copy(camera.position).sub(controlsTarget).normalize();
	_cubeQuatInv.copy(cube.quaternion).invert();
	_localToCamera.copy(_toCamera).applyQuaternion(_cubeQuatInv);

	const { x: lx, y: ly, z: lz } = _localToCamera;
	const ax = Math.abs(lx),
		ay = Math.abs(ly),
		az = Math.abs(lz);

	let face: CameraFace = 'front';
	if (az >= ax && az >= ay) face = lz > 0 ? 'front' : 'back';
	else if (ax >= ay && ax >= az) face = lx > 0 ? 'right' : 'left';
	else face = ly > 0 ? 'top' : 'bottom';

	// Use the camera's actual screen-up (Y axis from world matrix), NOT camera.up
	// which is always (0,1,0) with OrbitControls and never changes during orbit.
	const m = camera.matrixWorld.elements;
	_localUp
		.set(m[4], m[5], m[6])
		.normalize()
		.applyQuaternion(_cubeQuatInv);
	const { x: ux, y: uy, z: uz } = _localUp;
	const aux = Math.abs(ux),
		auy = Math.abs(uy),
		auz = Math.abs(uz);

	let rotation: CameraRotation = 0;

	switch (face) {
		case 'front':
		case 'back':
			if (auy >= aux) rotation = uy > 0 ? 0 : 180;
			else rotation = ux < 0 ? 90 : 270;
			break;
		case 'top':
		case 'bottom':
			if (face === 'top') {
				if (auz >= aux) rotation = uz > 0 ? 180 : 0;
				else rotation = ux < 0 ? 90 : 270;
			} else {
				// bottom
				if (auz >= aux) rotation = uz < 0 ? 180 : 0;
				else rotation = ux < 0 ? 90 : 270;
			}
			break;
		case 'right':
		case 'left':
			if (auy >= auz) rotation = uy > 0 ? 0 : 180;
			else {
				if (face === 'right') rotation = uz > 0 ? 90 : 270;
				else rotation = uz < 0 ? 90 : 270;
			}
			break;
	}

	return { face, rotation };
}
interface CubeVisibility {
	isOffScreen: boolean;
	isOffScreenLeft: boolean;
	isOffScreenRight: boolean;
	isOffScreenTop: boolean;
	isOffScreenBottom: boolean;
}

function getCubeVisibility(
	cube: THREE.Group,
	camera: THREE.Camera,
	gridSize: number,
): CubeVisibility {
	const result: CubeVisibility = {
		isOffScreen: false,
		isOffScreenLeft: false,
		isOffScreenRight: false,
		isOffScreenTop: false,
		isOffScreenBottom: false,
	};

	if (!cube) return result;

	const halfSize = gridSize / 2;
	const { min, max } = new THREE.Box3().setFromPoints(
		Array.from({ length: 8 }, (_, i) =>
			new THREE.Vector3(
				i & 4 ? -halfSize : halfSize,
				i & 2 ? -halfSize : halfSize,
				i & 1 ? -halfSize : halfSize,
			)
				.applyMatrix4(cube.matrixWorld)
				.project(camera),
		),
	);

	if (min.z > 1 || max.z < -1) {
		// All points are outside the near/far planes.
		result.isOffScreen = true;
		return result;
	}

	const visibilityThreshold = 0.4; // 40% of the cube can be off-screen.

	const overlapX = Math.max(
		0,
		Math.min(max.x, 1) - Math.max(min.x, -1),
	);
	const spanX = max.x - min.x;
	if (spanX > 1e-6 && overlapX / spanX < visibilityThreshold) {
		result.isOffScreen = true;
		const centerX = (min.x + max.x) / 2;
		if (centerX > 0) {
			result.isOffScreenRight = true;
		} else {
			result.isOffScreenLeft = true;
		}
	}

	const overlapY = Math.max(
		0,
		Math.min(max.y, 1) - Math.max(min.y, -1),
	);
	const spanY = max.y - min.y;
	if (spanY > 1e-6 && overlapY / spanY < visibilityThreshold) {
		result.isOffScreen = true;
		const centerY = (min.y + max.y) / 2;
		if (centerY > 0) {
			result.isOffScreenTop = true;
		} else {
			result.isOffScreenBottom = true;
		}
	}

	return result;
}

export function BoundingBox({ size }: { size: number }) {
	const [opacity, setOpacity] = useState(0);

	useFrame((_, delta) => {
		if (opacity < 1) {
			setOpacity(prev => Math.min(1, prev + delta));
		}
	});

	return (
		<group>
			<lineSegments raycast={() => null}>
				<edgesGeometry
					args={[new THREE.BoxGeometry(size, size, size)]}
				/>
				<lineBasicMaterial
					color='silver'
					transparent
					opacity={opacity}
				/>
			</lineSegments>
			<Html position={[size / 2, size / 2, size / 2]}>
				{/* Claim hint removed from here as per request */}
			</Html>
		</group>
	);
}

function BrushProjectionGuides({
	previewCells,
	gridSize,
	cellMargin,
	paintMode,
	gridRef,
	selectedShape,
	shapeSize,
}: {
	previewCells: {
		originalOffset: number[];
		cell: [number, number, number];
	}[];
	gridSize: number;
	cellMargin: number;
	paintMode: number;
	gridRef: React.MutableRefObject<any>;
	selectedShape: string;
	shapeSize: number;
}) {
	const offset = (gridSize - 1) / 2;
	const cellSize = 1 - cellMargin;

	const cellKeys = useMemo(
		() => new Set(previewCells.map(pc => pc.cell.join(','))),
		[previewCells],
	);

	const yzPairs = useMemo(() => {
		const pairs = new Set<string>();
		previewCells.forEach(({ cell }) => {
			const [x, y, z] = cell;
			// Project if a cell is an endpoint along the X axis AND it's a surface cell
			// (Being an endpoint along any axis already implies being a surface cell)
			if (
				!cellKeys.has(`${x - 1},${y},${z}`) ||
				!cellKeys.has(`${x + 1},${y},${z}`)
			) {
				pairs.add(`${y},${z}`);
			}
		});
		return Array.from(pairs).map(p => p.split(',').map(Number));
	}, [previewCells, cellKeys]);

	const xzPairs = useMemo(() => {
		const pairs = new Set<string>();
		previewCells.forEach(({ cell }) => {
			const [x, y, z] = cell;
			if (
				!cellKeys.has(`${x},${y - 1},${z}`) ||
				!cellKeys.has(`${x},${y + 1},${z}`)
			) {
				pairs.add(`${x},${z}`);
			}
		});
		return Array.from(pairs).map(p => p.split(',').map(Number));
	}, [previewCells, cellKeys]);

	const xyPairs = useMemo(() => {
		const pairs = new Set<string>();
		previewCells.forEach(({ cell }) => {
			const [x, y, z] = cell;
			if (
				!cellKeys.has(`${x},${y},${z - 1}`) ||
				!cellKeys.has(`${x},${y},${z + 1}`)
			) {
				pairs.add(`${x},${y}`);
			}
		});
		return Array.from(pairs).map(p => p.split(',').map(Number));
	}, [previewCells, cellKeys]);

	const allGuidePositions = useMemo(() => {
		const positions = new Set<string>();

		// X-axis channels: for each (y, z) projection, fill all x values
		yzPairs.forEach(([y, z]) => {
			for (let x = 0; x < gridSize; x++) {
				positions.add(`${x},${y},${z}`);
			}
		});

		// Y-axis channels: for each (x, z) projection, fill all y values
		xzPairs.forEach(([x, z]) => {
			for (let y = 0; y < gridSize; y++) {
				positions.add(`${x},${y},${z}`);
			}
		});

		// Z-axis channels: for each (x, y) projection, fill all z values
		xyPairs.forEach(([x, y]) => {
			for (let z = 0; z < gridSize; z++) {
				positions.add(`${x},${y},${z}`);
			}
		});

		return Array.from(positions).map(s => s.split(',').map(Number));
	}, [yzPairs, xzPairs, xyPairs, gridSize]);

	const meshRef = useRef<THREE.InstancedMesh>(null);
	const redOutlineRef = useRef<THREE.InstancedMesh>(null);
	const redWireframeRef = useRef<THREE.InstancedMesh>(null);

	const showAxisChannels = selectedShape === 'Cube' && shapeSize === 1;

	useEffect(() => {
		if (!meshRef.current || !showAxisChannels) return;
		const temp = new THREE.Object3D();
		allGuidePositions.forEach((pos, i) => {
			const [x, y, z] = pos;
			temp.position.set(
				x - offset,
				y - offset,
				gridSize - 1 - z - offset,
			);
			temp.scale.set(cellSize, cellSize, cellSize);
			temp.updateMatrix();
			meshRef.current!.setMatrixAt(i, temp.matrix);
		});
		meshRef.current.instanceMatrix.needsUpdate = true;
		meshRef.current.count = allGuidePositions.length;
	}, [allGuidePositions, cellSize, offset, gridSize, showAxisChannels]);

	// Handle outlines for live cells in Deactivate mode
	useEffect(() => {
		if (!redOutlineRef.current || !redWireframeRef.current) return;
		const temp = new THREE.Object3D();
		const tempWire = new THREE.Object3D();
		let count = 0;

		if (paintMode === -1) {
			allGuidePositions.forEach(pos => {
				const [x, y, z] = pos;
				if (gridRef.current.get(x, y, z)) {
					// Outer thick glow
					temp.position.set(
						x - offset,
						y - offset,
						gridSize - 1 - z - offset,
					);
					temp.scale.set(
						cellSize * 1.35,
						cellSize * 1.35,
						cellSize * 1.35,
					); // increased scale
					temp.updateMatrix();
					redOutlineRef.current!.setMatrixAt(count, temp.matrix);

					// Inner tight wireframe
					tempWire.position.set(
						x - offset,
						y - offset,
						gridSize - 1 - z - offset,
					);
					tempWire.scale.set(
						cellSize * 1.15,
						cellSize * 1.15,
						cellSize * 1.15,
					); // increased scale
					tempWire.updateMatrix();
					redWireframeRef.current!.setMatrixAt(count, tempWire.matrix);

					count++;
				}
			});
		}

		redOutlineRef.current.instanceMatrix.needsUpdate = true;
		redOutlineRef.current.count = count;
		redWireframeRef.current.instanceMatrix.needsUpdate = true;
		redWireframeRef.current.count = count;
	}, [
		allGuidePositions,
		paintMode,
		cellSize,
		offset,
		gridSize,
		gridRef,
	]);

	return (
		<>
			{showAxisChannels && (
				<instancedMesh
					ref={meshRef}
					args={[undefined, undefined, 50000]}
					raycast={() => null}
				>
					<boxGeometry args={[1, 1, 1]} />
					<meshBasicMaterial
						color='#ffffff'
						transparent
						opacity={0.07}
						blending={THREE.AdditiveBlending}
						depthWrite={false}
					/>
				</instancedMesh>
			)}

			{paintMode === -1 && (
				<>
					<Html position={[0, gridSize / 2 + 1, 0]}>
						{/* Claim hint removed from here as per request */}
					</Html>
					<instancedMesh
						ref={redOutlineRef}
						args={[undefined, undefined, 50000]}
						raycast={() => null}
					>
						<boxGeometry args={[1, 1, 1]} />
						<meshBasicMaterial
							color='#ff0000'
							transparent
							opacity={0.7}
							blending={THREE.AdditiveBlending}
							depthWrite={false}
						/>
					</instancedMesh>
					<instancedMesh
						ref={redWireframeRef}
						args={[undefined, undefined, 50000]}
						raycast={() => null}
					>
						<boxGeometry args={[1, 1, 1]} />
						<meshBasicMaterial
							color='#ff0000'
							wireframe
							transparent
							opacity={1}
							blending={THREE.AdditiveBlending}
							depthWrite={false}
						/>
					</instancedMesh>
				</>
			)}
		</>
	);
}

function FaceLabels({ size }: { size: number }) {
	const {
		state: { cameraOrientation },
	} = useSimulation();
	const half = size / 2;
	const padding = 1.5;
	const labelStyle: React.CSSProperties = {
		color: 'white',
		fontSize: '12pt',
		fontFamily:
			'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		whiteSpace: 'nowrap',
	};

	const labels = [
		{ name: 'Right', normal: new THREE.Vector3(1, 0, 0) },
		{ name: 'Left', normal: new THREE.Vector3(-1, 0, 0) },
		{ name: 'Top', normal: new THREE.Vector3(0, 1, 0) },
		{ name: 'Bottom', normal: new THREE.Vector3(0, -1, 0) },
		{ name: 'Front', normal: new THREE.Vector3(0, 0, 1) },
		{ name: 'Back', normal: new THREE.Vector3(0, 0, -1) },
	];

	const face = cameraOrientation.face;
	if (!face || face === 'unknown') return null;

	const currentFaceData = labels.find(
		({ name }) => name.toLowerCase() === face,
	);
	if (!currentFaceData) return null;

	let finalX = 0,
		finalY = 0,
		finalZ = 0;
	const labelOffsetFromCorner = 0.5; // Small offset from the absolute corner for visual appeal

	switch (face) {
		case 'back': // Normal (0,0,-1)
			finalX = half - labelOffsetFromCorner;
			finalY = half - labelOffsetFromCorner;
			finalZ = -(half + padding);
			break;
		case 'front': // Normal (0,0,1)
			finalX = -(half - labelOffsetFromCorner); // Top-right from viewer's perspective is -X
			finalY = half - labelOffsetFromCorner;
			finalZ = half + padding;
			break;
		case 'right': // Normal (1,0,0)
			finalX = half + padding;
			finalY = half - labelOffsetFromCorner;
			finalZ = half - labelOffsetFromCorner;
			break;
		case 'left': // Normal (-1,0,0)
			finalX = -(half + padding);
			finalY = half - labelOffsetFromCorner;
			finalZ = -(half - labelOffsetFromCorner); // Top-right from viewer's perspective is -Z
			break;
		case 'top': // Normal (0,1,0)
			finalX = half - labelOffsetFromCorner;
			finalY = half + padding;
			finalZ = -(half - labelOffsetFromCorner); // Top-right from viewer's perspective is -Z
			break;
		case 'bottom': // Normal (0,-1,0)
			finalX = half - labelOffsetFromCorner;
			finalY = -(half + padding);
			finalZ = half - labelOffsetFromCorner;
			break;
	}

	const rotationStr =
		cameraOrientation.rotation !== 'unknown'
			? `${cameraOrientation.rotation}°`
			: '';

	return (
		<group>
			<Html
				key={face}
				position={[finalX, finalY, finalZ]}
				center
				zIndexRange={[0, 999]}
			>
				<div style={labelStyle}>
					{currentFaceData.name}
					{rotationStr && `, ${rotationStr}`}{' '}
					{/* Claim hint removed from here as per request */}
				</div>
			</Html>
		</group>
	);
}

function KeyboardSelector({
	cubeRef,
	brushQuaternion,
	cameraActionsRef,
}: {
	cubeRef: React.RefObject<THREE.Group>;
	brushQuaternion: React.MutableRefObject<THREE.Quaternion>;
	cameraActionsRef: React.RefObject<any>;
}) {
	const {
		state: { gridSize, viewMode, cellMargin },
		meta: { gridRef },
	} = useSimulation();
	const { state: brushState } = useBrush();
	const {
		selectorPos,
		selectedShape,
		paintMode,
		shapeSize,
		isHollow,
		customOffsets,
		brushRotationVersion,
		showProjectionGuides,
	} = brushState;

	const previewCells = useMemo(() => {
		if (!selectorPos) return [];

		const offsets = generateShape(
			selectedShape,
			shapeSize,
			isHollow,
			customOffsets,
		);

		if (offsets.length === 0) return [];

		const cells = offsets
			.map(originalOffset => {
				const [dx, dy, dz] = originalOffset;
				const v = new THREE.Vector3(dx, dy, dz);

				v.applyQuaternion(brushQuaternion.current);

				const rx = Math.round(v.x * 2) / 2;
				const ry = Math.round(v.y * 2) / 2;
				const rz = Math.round(v.z * 2) / 2;

				const cell = [
					selectorPos[0] + (Math.abs(rx % 1) >= 0.25 ? 0.5 : 0) + rx,
					selectorPos[1] + (Math.abs(ry % 1) >= 0.25 ? 0.5 : 0) + ry,
					selectorPos[2] + (Math.abs(rz % 1) >= 0.25 ? 0.5 : 0) + rz,
				] as [number, number, number];

				return { originalOffset, cell };
			})
			.filter(
				({ cell: [x, y, z] }) =>
					x >= 0 &&
					x < gridSize &&
					y >= 0 &&
					y < gridSize &&
					z >= 0 &&
					z < gridSize,
			);

		// De-duplicate cells that land on the same spot after rotation+rounding.
		return Array.from(
			new Map(cells.map(p => [p.cell.join(','), p])).values(),
		);
	}, [
		selectorPos,
		selectedShape,
		shapeSize,
		isHollow,
		gridSize,
		brushRotationVersion,
		customOffsets,
	]);

	if (viewMode || !selectorPos) return null;

	const offset = (gridSize - 1) / 2;
	const cellKeys = useMemo(
		() => new Set(previewCells.map(p => p.cell.join(','))),
		[previewCells],
	);

	return (
		<group>
			{/* Guides are now rendered based on a toggle, and from exterior faces */}
			{showProjectionGuides && (
				<BrushProjectionGuides
					previewCells={previewCells}
					gridSize={gridSize}
					cellMargin={cellMargin}
					paintMode={paintMode}
					gridRef={gridRef}
					selectedShape={selectedShape}
					shapeSize={shapeSize}
				/>
			)}

			{/* Unified renderer for all brush cells */}
			{previewCells.map(({ cell }, i) => {
				const [x, y, z] = cell;
				const isAlive = gridRef.current.get(x, y, z);

				let cellColor = isAlive
					? '#ffffff'
					: paintMode == -1
						? '#ff9999'
						: '#ffff55';
				let opacity = 1;
				let outlineColor = '#222222';

				const position: [number, number, number] = [
					cell[0] - offset,
					cell[1] - offset,
					gridSize - 1 - cell[2] - offset,
				];

				return (
					<React.Fragment key={i}>
						{/* Primary Cell Mesh */}
						<mesh position={position}>
							<boxGeometry args={[0.9, 0.9, 0.9]} />
							<meshBasicMaterial
								color={cellColor}
								transparent={isAlive}
								opacity={opacity}
								depthWrite={!isAlive}
							/>
						</mesh>
						{/* Outlines */}
						<lineSegments position={position}>
							<edgesGeometry
								args={[new THREE.BoxGeometry(0.92, 0.92, 0.92)]}
							/>
							<lineBasicMaterial color={outlineColor} />
						</lineSegments>
					</React.Fragment>
				);
			})}
		</group>
	);
}

export function Scene() {
	const {
		state,
		actions,
		meta: { gridRef, movement, velocity, eventBus, cameraTargetRef, organismsRef },
	} = useSimulation();
	const { tick, setCommunity, setCameraOrientation, setIsSquaredUp } =
		actions;
	const {
		speed,
		cellMargin,
		viewMode,
		running,
		community,
		gridSize,
		panSpeed,
		rotationSpeed,
		rollSpeed,
		invertYaw,
		invertPitch,
		invertRoll,
		easeIn,
		easeOut,
		squareUp,
		isSquaredUp,
		cameraOrientation,
		organisms,
		organismsVersion,
	} = state;
	const {
		state: brushState,
		actions: { setSelectorPos, setCustomBrush },
	} = useBrush();
	const { selectorPos, brushQuaternion } = brushState;
	useEffect(() => {
		isSnapLockedRef.current = false;
		squareUpAnimRef.current = null;
	}, [squareUp, viewMode]);

	// All useRef declarations first
	const brushStateRef = useRef(brushState);
	const prevSelectionVersionRef = useRef(
		brushState.shapeSelectionVersion,
	);
	const fitAnimRef = useRef<{
		startTime: number;
		startPos: THREE.Vector3;
		startTarget: THREE.Vector3;
		targetDist: number;
		duration: number;
	} | null>(null);
	const squareUpAnimRef = useRef<{
		mode: 'view' | 'edit';
		startTime: number;
		startPos?: THREE.Vector3;
		startQuat: THREE.Quaternion;
		startUp?: THREE.Vector3;
		startTarget?: THREE.Vector3;
		startDist?: number;
		targetPos?: THREE.Vector3;
		targetQuat: THREE.Quaternion;
		targetUp?: THREE.Vector3;
	} | null>(null);
	const prevIsDraggingRef = useRef(false);
	const isSnapLockedRef = useRef(false);
	const lastTick = useRef(0);
	const cameraRef = useRef<THREE.PerspectiveCamera>(null);
	const cubeRef = useRef<THREE.Group>(null);
	const lastSelectorMoveTime = useRef(0);
	const wasRotating = useRef(false);
	const isDragging = useRef(false);
	const lastMouse = useRef({ x: 0, y: 0 });
	const mouseMovement = useRef({ x: 0, y: 0 });

	// useThree() call
	const { camera, gl } = useThree();

	// Now all useEffects and useMemos
	useEffect(() => {
		brushStateRef.current = brushState;
	}, [brushState]);

	// Align 2D shapes to face camera when selected or re-selected
	useEffect(() => {
		if (
			brushState.shapeSelectionVersion !==
			prevSelectionVersionRef.current
		) {
			if (
				['Square', 'Circle', 'Triangle'].includes(
					brushState.selectedShape,
				)
			) {
				if (cameraRef.current && cubeRef.current) {
					const cam = cameraRef.current;
					const target = cameraTargetRef.current;

					const posWorld = cam.position.clone().sub(target);
					const cubeInvQuat = cubeRef.current.quaternion
						.clone()
						.invert();
					const posLocal = posWorld
						.clone()
						.applyQuaternion(cubeInvQuat);

					const ax = Math.abs(posLocal.x),
						ay = Math.abs(posLocal.y),
						az = Math.abs(posLocal.z);

					let lookDirLocal = new THREE.Vector3();
					if (az >= ax && az >= ay) {
						lookDirLocal.set(0, 0, posLocal.z > 0 ? -1 : 1);
					} else if (ax >= ay && ax >= az) {
						lookDirLocal.set(posLocal.x > 0 ? -1 : 1, 0, 0);
					} else {
						lookDirLocal.set(0, posLocal.y > 0 ? -1 : 1, 0);
					}

					const currentUpWorld = cam.up.clone();
					const currentUpLocal =
						currentUpWorld.applyQuaternion(cubeInvQuat);

					let idealUpLocal = new THREE.Vector3(0, 1, 0);
					const candidates: THREE.Vector3[] = [];
					if (lookDirLocal.x !== 0) {
						candidates.push(
							new THREE.Vector3(0, 1, 0),
							new THREE.Vector3(0, -1, 0),
							new THREE.Vector3(0, 0, 1),
							new THREE.Vector3(0, 0, -1),
						);
					} else if (lookDirLocal.y !== 0) {
						candidates.push(
							new THREE.Vector3(1, 0, 0),
							new THREE.Vector3(-1, 0, 0),
							new THREE.Vector3(0, 0, 1),
							new THREE.Vector3(0, 0, -1),
						);
					} else {
						candidates.push(
							new THREE.Vector3(1, 0, 0),
							new THREE.Vector3(-1, 0, 0),
							new THREE.Vector3(0, 1, 0),
							new THREE.Vector3(0, -1, 0),
						);
					}
					let maxDot = -Infinity;
					for (const cand of candidates) {
						const d = currentUpLocal.dot(cand);
						if (d > maxDot) {
							maxDot = d;
							idealUpLocal.copy(cand);
						}
					}

					const rightLocal = lookDirLocal
						.clone()
						.cross(idealUpLocal)
						.normalize();
					const localX = rightLocal;
					const localY = lookDirLocal.clone().multiplyScalar(-1);
					const localZ = idealUpLocal.clone().multiplyScalar(-1);

					const mat = new THREE.Matrix4().makeBasis(
						localX,
						localY,
						localZ,
					);
					brushQuaternion.current.setFromRotationMatrix(mat);

					const { incrementBrushRotationVersion } =
						(window as any).brushActions || {};
					if (incrementBrushRotationVersion)
						incrementBrushRotationVersion();
				}
			}
		}
		prevSelectionVersionRef.current = brushState.shapeSelectionVersion;
	}, [
		brushState.selectedShape,
		brushState.shapeSelectionVersion,
		brushQuaternion,
		cameraTargetRef,
		cubeRef,
	]);

	// Initialize lastPanSpeedCheckPositionRef when camera is ready or gridSize changes
	// Removed lastPanSpeedCheckPositionRef initialization as it's no longer needed.

	useEffect(() => {
		const handlePointerDown = (e: PointerEvent) => {
			isDragging.current = true;
			lastMouse.current = { x: e.clientX, y: e.clientY };
			wasRotating.current = false;
		};

		const handlePointerMove = (e: PointerEvent) => {
			if (!isDragging.current) return;

			const dx = e.clientX - lastMouse.current.x;
			const dy = e.clientY - lastMouse.current.y;

			if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
				wasRotating.current = true;
				mouseMovement.current.x += dx;
				mouseMovement.current.y += dy;
			}

			lastMouse.current = { x: e.clientX, y: e.clientY };
		};

		const handlePointerUp = () => {
			isDragging.current = false;
		};

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			const sensitivity = 0.005;
			if (e.shiftKey) {
				// Shift-scroll for Pan
				// -deltaY to velocity.panY (scrolling up moves camera up)
				// -deltaX to velocity.panX (scrolling left/right)
				velocity.current.panY += -e.deltaY * sensitivity;
				velocity.current.panX += -e.deltaX * sensitivity;
			} else {
				// Normal scroll for Dolly
				velocity.current.dolly += -e.deltaY * sensitivity;
			}
		};

		const canvas = gl?.domElement; // Add nullish coalescing operator
		if (canvas) {
			// Add a check for canvas existence
			canvas.addEventListener('pointerdown', handlePointerDown);
			canvas.addEventListener('wheel', handleWheel, { passive: false });
			window.addEventListener('pointermove', handlePointerMove);
			window.addEventListener('pointerup', handlePointerUp);
			window.addEventListener('pointercancel', handlePointerUp);
		}

		return () => {
			if (canvas) {
				// Add a check for canvas existence
				canvas.removeEventListener('pointerdown', handlePointerDown);
				canvas.removeEventListener('wheel', handleWheel);
				window.removeEventListener('pointermove', handlePointerMove);
				window.removeEventListener('pointerup', handlePointerUp);
				window.removeEventListener('pointercancel', handlePointerUp);
			}
		};
	}, [gl, rotationSpeed, invertYaw, invertPitch, velocity]);

	const {
		meta: { cameraActionsRef },
	} = useSimulation();

	const maxDistance = useMemo(() => {
		const padding = 1.1; // 10% margin

		// Sphere that encompasses the entire cube
		const radius = (gridSize / 2) * Math.sqrt(3);

		const fov = (camera as THREE.PerspectiveCamera).fov;
		const aspect = (camera as THREE.PerspectiveCamera).aspect;

		const tanFOV = Math.tan((Math.PI * fov) / 360);
		let distance = (radius * padding) / tanFOV;

		const hFov = 2 * Math.atan(tanFOV * aspect);
		const distanceH = (radius * padding) / Math.tan(hFov / 2);

		distance = Math.max(distance, distanceH);

		return distance * 2;
	}, [gridSize, camera]);

	useEffect(() => {
		cameraActionsRef.current = {
			fitDisplay: () => {
				if (!cameraRef.current) return;
				const cam = cameraRef.current;
				const target = cameraTargetRef.current;

				// Stop all movement
				velocity.current.panX = 0;
				velocity.current.panY = 0;
				velocity.current.dolly = 0;
				velocity.current.rotatePitch = 0;
				velocity.current.rotateYaw = 0;
				velocity.current.rotateRoll = 0;

				const size = gridRef.current.size;
				const padding = 1.1;
				const radius = (size / 2) * Math.sqrt(3);
				const fov = cam.fov;
				const aspect = cam.aspect;
				const tanFOV = Math.tan((Math.PI * fov) / 360);
				let distance = (radius * padding) / tanFOV;
				const hFov = 2 * Math.atan(tanFOV * aspect);
				const distanceH = (radius * padding) / Math.tan(hFov / 2);
				distance = Math.max(distance, distanceH);

				fitAnimRef.current = {
					startTime: performance.now() / 1000,
					startPos: cam.position.clone(),
					startTarget: target.clone(),
					targetDist: distance,
					duration: 1.0,
				};
			},
			recenter: () => {
				if (!cameraRef.current) return;

				// Stop all movement
				velocity.current.panX = 0;
				velocity.current.panY = 0;
				velocity.current.dolly = 0;
				velocity.current.rotatePitch = 0;
				velocity.current.rotateYaw = 0;
				velocity.current.rotateRoll = 0;

				const offset = new THREE.Vector3().subVectors(
					new THREE.Vector3(0, 0, 0),
					cameraTargetRef.current,
				);
				cameraRef.current.position.add(offset);
				cameraTargetRef.current.set(0, 0, 0);
				cameraRef.current.lookAt(cameraTargetRef.current);
			},
			rotateBrush: (axis: THREE.Vector3, angle: number) => {
				const {
					selectorPos,
					selectedShape,
					shapeSize,
					isHollow,
					customOffsets,
					brushQuaternion,
				} = brushStateRef.current;
				const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
				const nextQ = brushQuaternion.current.clone().premultiply(q);

				if (selectorPos) {
					const offsets = generateShape(
						selectedShape,
						shapeSize,
						isHollow,
						customOffsets,
					);

					// Compute current rotated offsets with existing quaternion
					const currentRotated = offsets.map(off => {
						const v = new THREE.Vector3(...off);
						v.applyQuaternion(brushQuaternion.current);
						return v;
					});

					// Find bounding box center of current rotated offsets
					let minX = Infinity,
						maxX = -Infinity;
					let minY = Infinity,
						maxY = -Infinity;
					let minZ = Infinity,
						maxZ = -Infinity;
					for (const v of currentRotated) {
						minX = Math.min(minX, v.x);
						maxX = Math.max(maxX, v.x);
						minY = Math.min(minY, v.y);
						maxY = Math.max(maxY, v.y);
						minZ = Math.min(minZ, v.z);
						maxZ = Math.max(maxZ, v.z);
					}
					const cx = (minX + maxX) / 2;
					const cy = (minY + maxY) / 2;
					const cz = (minZ + maxZ) / 2;
					const center = new THREE.Vector3(cx, cy, cz);

					// Compute how the center moves under the new rotation q
					// Adjustment = c - q*c  (keeps the bounding box center fixed)
					const rotatedCenter = center.clone().applyQuaternion(q);
					const adj = new THREE.Vector3().subVectors(
						center,
						rotatedCenter,
					);
					const adjX = Math.round(adj.x);
					const adjY = Math.round(adj.y);
					const adjZ = Math.round(adj.z);

					// Compute new rotated offsets (with adjusted selectorPos)
					const newSelectorPos: [number, number, number] = [
						selectorPos[0] + adjX,
						selectorPos[1] + adjY,
						selectorPos[2] + adjZ,
					];

					const newRotatedOffsets = offsets.map(off => {
						const v = new THREE.Vector3(...off);
						v.applyQuaternion(nextQ);
						const rx = Math.round(v.x * 2) / 2;
						const ry = Math.round(v.y * 2) / 2;
						const rz = Math.round(v.z * 2) / 2;
						return [
							(Math.abs(rx % 1) >= 0.25 ? 0.5 : 0) + rx,
							(Math.abs(ry % 1) >= 0.25 ? 0.5 : 0) + ry,
							(Math.abs(rz % 1) >= 0.25 ? 0.5 : 0) + rz,
						] as [number, number, number];
					});

					// Check that at least one cell would be inside the grid
					const isAnyInside = newRotatedOffsets.some(([dx, dy, dz]) => {
						const tx = newSelectorPos[0] + dx;
						const ty = newSelectorPos[1] + dy;
						const tz = newSelectorPos[2] + dz;
						return (
							tx >= 0 &&
							tx < gridSize &&
							ty >= 0 &&
							ty < gridSize &&
							tz >= 0 &&
							tz < gridSize
						);
					});

					if (!isAnyInside) return; // Block rotation

					// Apply the selectorPos adjustment
					setSelectorPos(newSelectorPos);
				}

				brushQuaternion.current.copy(nextQ);
				// Trigger re-render of ShapePreview
				const { incrementBrushRotationVersion } =
					(window as any).brushActions || {};
				if (incrementBrushRotationVersion)
					incrementBrushRotationVersion();
			},
			birthBrushCells: () => {
				const {
					selectorPos,
					selectedShape,
					shapeSize,
					isHollow,
					customOffsets,
					brushQuaternion,
				} = brushStateRef.current;
				if (!selectorPos) return;

				const offsets = generateShape(
					selectedShape,
					shapeSize,
					isHollow,
					customOffsets,
				);
				const cellsToActivate = offsets
					.map(([dx, dy, dz]) => {
						const v = new THREE.Vector3(dx, dy, dz);
						v.applyQuaternion(brushQuaternion.current);
						const rx = Math.round(v.x * 2) / 2;
						const ry = Math.round(v.y * 2) / 2;
						const rz = Math.round(v.z * 2) / 2;
						return [
							selectorPos[0] +
								(Math.abs(rx % 1) >= 0.25 ? 0.5 : 0) +
								rx,
							selectorPos[1] +
								(Math.abs(ry % 1) >= 0.25 ? 0.5 : 0) +
								ry,
							selectorPos[2] +
								(Math.abs(rz % 1) >= 0.25 ? 0.5 : 0) +
								rz,
						] as [number, number, number];
					})
					.filter(
						([x, y, z]) =>
							x >= 0 &&
							x < gridSize &&
							y >= 0 &&
							y < gridSize &&
							z >= 0 &&
							z < gridSize,
					);

				if (cellsToActivate.length > 0) {
					actions.setCells(cellsToActivate);
					setCommunity([]); // Clear community view when manually editing
				}
			},
			clearBrushCells: () => {
				const {
					selectorPos,
					selectedShape,
					shapeSize,
					isHollow,
					customOffsets,
					brushQuaternion,
				} = brushStateRef.current;
				if (!selectorPos) return;

				const offsets = generateShape(
					selectedShape,
					shapeSize,
					isHollow,
					customOffsets,
				);
				const cellsToClear = offsets
					.map(([dx, dy, dz]) => {
						const v = new THREE.Vector3(dx, dy, dz);
						v.applyQuaternion(brushQuaternion.current);
						const rx = Math.round(v.x * 2) / 2;
						const ry = Math.round(v.y * 2) / 2;
						const rz = Math.round(v.z * 2) / 2;
						return [
							selectorPos[0] +
								(Math.abs(rx % 1) >= 0.25 ? 0.5 : 0) +
								rx,
							selectorPos[1] +
								(Math.abs(ry % 1) >= 0.25 ? 0.5 : 0) +
								ry,
							selectorPos[2] +
								(Math.abs(rz % 1) >= 0.25 ? 0.5 : 0) +
								rz,
						] as [number, number, number];
					})
					.filter(
						([x, y, z]) =>
							x >= 0 &&
							x < gridSize &&
							y >= 0 &&
							y < gridSize &&
							z >= 0 &&
							z < gridSize,
					);

				if (cellsToClear.length > 0) {
					setCommunity([]);
					actions.deleteCells(cellsToClear);
				}
			},
		};
		return () => {
			cameraActionsRef.current = null;
		};
	}, [
		cameraActionsRef,
		gridRef,
		cubeRef,
		cameraRef,
		cameraTargetRef,
		gridSize,
		actions,
		setCommunity,
		setSelectorPos,
		setCustomBrush,
	]);
	useFrame((threeState, delta) => {
		// --- 0. Smooth Fit Transition ---
		if (fitAnimRef.current) {
			const { startTime, startPos, startTarget, targetDist, duration } =
				fitAnimRef.current;
			const elapsed = performance.now() / 1000 - startTime;
			const t = Math.min(elapsed / duration, 1.0);

			// "Ease-in only" transition (t*t)
			const easeT = t * t;

			const cam = cameraRef.current || camera;
			const target = cameraTargetRef.current;

			// Lerp target to (0,0,0)
			target.lerpVectors(
				startTarget,
				new THREE.Vector3(0, 0, 0),
				easeT,
			);

			// Calculate start direction and distance from original start
			const startDir = new THREE.Vector3()
				.subVectors(startPos, startTarget)
				.normalize();
			const startD = new THREE.Vector3()
				.subVectors(startPos, startTarget)
				.length();

			// Current distance is lerped between start distance and target fit distance
			const currentD = THREE.MathUtils.lerp(startD, targetDist, easeT);

			// Set camera position along the same direction relative to current target
			cam.position
				.copy(target)
				.add(startDir.clone().multiplyScalar(currentD));
			cam.lookAt(target);

			if (t >= 1) {
				fitAnimRef.current = null;
			}
			return;
		}

		// --- Physics Update ---
		const { lerp } = THREE.MathUtils;
		const easeInVal =
			easeIn > 0.001 ? 1 - Math.exp((-3 * delta) / easeIn) : 1;
		const effectiveEaseOut = squareUp ? 0.25 : easeOut;
		const dampingVal =
			effectiveEaseOut > 0.001
				? Math.exp((-3 * delta) / effectiveEaseOut)
				: 0;

		// --- Calculate All Velocities ---
		const mDX = mouseMovement.current.x;
		const mDY = mouseMovement.current.y;
		mouseMovement.current.x = 0;
		mouseMovement.current.y = 0;

		const invY = invertYaw ? -1 : 1;
		const invP = invertPitch ? -1 : 1;

		// --- Drag End Detection for Square-Up ---
		const dragJustStopped =
			!isDragging.current && prevIsDraggingRef.current;
		prevIsDraggingRef.current = isDragging.current;

		// Pan/Dolly velocities for View Mode
		const pSpeed = panSpeed * 0.05;
		if (movement.current.right)
			velocity.current.panX = lerp(
				velocity.current.panX,
				pSpeed,
				easeInVal,
			);
		else if (movement.current.left)
			velocity.current.panX = lerp(
				velocity.current.panX,
				-pSpeed,
				easeInVal,
			);
		else velocity.current.panX *= dampingVal;

		if (movement.current.forward)
			velocity.current.panY = lerp(
				velocity.current.panY,
				pSpeed,
				easeInVal,
			);
		else if (movement.current.backward)
			velocity.current.panY = lerp(
				velocity.current.panY,
				-pSpeed,
				easeInVal,
			);
		else velocity.current.panY *= dampingVal;

		const dSpeed = panSpeed * 0.05;
		if (movement.current.up)
			velocity.current.dolly = lerp(
				velocity.current.dolly,
				dSpeed,
				easeInVal,
			);
		else if (movement.current.down)
			velocity.current.dolly = lerp(
				velocity.current.dolly,
				-dSpeed,
				easeInVal,
			);
		else velocity.current.dolly *= dampingVal;

		// Rotation velocities - Inhibit if Snap Locked
		const rSpeed = isSnapLockedRef.current ? 0 : rotationSpeed * 0.05;
		const rlSpeed = isSnapLockedRef.current ? 0 : rollSpeed * 0.05;

		// Pitch
		if (!isSnapLockedRef.current && movement.current.rotateO) {
			velocity.current.rotatePitch = lerp(
				velocity.current.rotatePitch,
				rSpeed,
				easeInVal,
			);
		} else if (
			!isSnapLockedRef.current &&
			movement.current.rotatePeriod
		) {
			velocity.current.rotatePitch = lerp(
				velocity.current.rotatePitch,
				-rSpeed,
				easeInVal,
			);
		} else if (!isSnapLockedRef.current && isDragging.current) {
			const mouseTargetPitch = (mDY / delta) * rotationSpeed * 0.0001;
			velocity.current.rotatePitch = lerp(
				velocity.current.rotatePitch,
				mouseTargetPitch * invP,
				easeInVal,
			);
		} else {
			velocity.current.rotatePitch *= dampingVal;
		}

		// Yaw
		if (!isSnapLockedRef.current && movement.current.rotateK) {
			velocity.current.rotateYaw = lerp(
				velocity.current.rotateYaw,
				rSpeed,
				easeInVal,
			);
		} else if (
			!isSnapLockedRef.current &&
			movement.current.rotateSemicolon
		) {
			velocity.current.rotateYaw = lerp(
				velocity.current.rotateYaw,
				-rSpeed,
				easeInVal,
			);
		} else if (!isSnapLockedRef.current && isDragging.current) {
			const mouseTargetYaw = (mDX / delta) * rotationSpeed * 0.0001;
			velocity.current.rotateYaw = lerp(
				velocity.current.rotateYaw,
				mouseTargetYaw * invY,
				easeInVal,
			);
		} else {
			velocity.current.rotateYaw *= dampingVal;
		}

		// Roll
		if (!isSnapLockedRef.current && movement.current.rotateI) {
			velocity.current.rotateRoll = lerp(
				velocity.current.rotateRoll,
				rlSpeed,
				easeInVal,
			);
		} else if (!isSnapLockedRef.current && movement.current.rotateP) {
			velocity.current.rotateRoll = lerp(
				velocity.current.rotateRoll,
				-rlSpeed,
				easeInVal,
			);
		} else {
			velocity.current.rotateRoll *= dampingVal;
		}

		// --- Soft Boundary Enforcement ---
		if (viewMode && cubeRef.current && cameraRef.current) {
			const visibility = getCubeVisibility(
				cubeRef.current,
				cameraRef.current,
				gridSize,
			);
			const restoringForce = 0.2; // Strength of the push-back

			if (visibility.isOffScreenLeft && velocity.current.panX < 0) {
				velocity.current.panX = lerp(
					velocity.current.panX,
					pSpeed * restoringForce,
					0.8,
				);
			}
			if (visibility.isOffScreenRight && velocity.current.panX > 0) {
				velocity.current.panX = lerp(
					velocity.current.panX,
					-pSpeed * restoringForce,
					0.8,
				);
			}
			if (visibility.isOffScreenBottom && velocity.current.panY < 0) {
				velocity.current.panY = lerp(
					velocity.current.panY,
					pSpeed * restoringForce,
					0.8,
				);
			}
			if (visibility.isOffScreenTop && velocity.current.panY > 0) {
				velocity.current.panY = lerp(
					velocity.current.panY,
					-pSpeed * restoringForce,
					0.8,
				);
			}

			// If the cube is significantly off-screen, prevent further dollying in or out.
			if (visibility.isOffScreen) {
				velocity.current.dolly = 0;
			}
		}

		const totalPanX = velocity.current.panX;
		const totalPanY = velocity.current.panY;
		const totalDolly = velocity.current.dolly;
		const totalRotatePitch = velocity.current.rotatePitch;
		const totalRotateYaw = velocity.current.rotateYaw;
		const totalRotateRoll = velocity.current.rotateRoll;

		// --- Apply Velocities ---
		if (viewMode) {
			// VIEW MODE: Manipulate the camera
			if (cameraRef.current) {
				const cam = cameraRef.current;
				const target = cameraTargetRef.current;

				// Apply Pans & Dolly
				const hasPan =
					Math.abs(totalPanX) > 1e-7 || Math.abs(totalPanY) > 1e-7;
				const hasDolly = Math.abs(totalDolly) > 1e-7;

				if (hasPan) {
					const dist = cam.position.distanceTo(target);
					const panXVec = new THREE.Vector3()
						.setFromMatrixColumn(cam.matrix, 0)
						.multiplyScalar(totalPanX * delta * dist);
					const panYVec = new THREE.Vector3()
						.setFromMatrixColumn(cam.matrix, 1)
						.multiplyScalar(totalPanY * delta * dist);
					const pan = panXVec.add(panYVec);
					cam.position.add(pan);
					target.add(pan);
				}
				if (hasDolly) {
					const toTarget = new THREE.Vector3().subVectors(
						cam.position,
						target,
					);
					const currentDist = toTarget.length();
					if (currentDist > 0.1) {
						const newDist = currentDist * (1 - totalDolly * delta);
						toTarget.setLength(newDist);
						cam.position.copy(target).add(toTarget);
					}
				}

				// Apply Rotations
				const hasRot =
					Math.abs(totalRotatePitch) > 1e-7 ||
					Math.abs(totalRotateYaw) > 1e-7 ||
					Math.abs(totalRotateRoll) > 1e-7;
				if (hasRot) {
					const pitchSpeed = totalRotatePitch * delta;
					const yawSpeed = totalRotateYaw * delta;
					const rollSpeedVal = totalRotateRoll * delta;

					const qPitch = new THREE.Quaternion().setFromAxisAngle(
						new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0),
						pitchSpeed,
					);
					const qYaw = new THREE.Quaternion().setFromAxisAngle(
						new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1),
						yawSpeed,
					);
					const qRoll = new THREE.Quaternion().setFromAxisAngle(
						new THREE.Vector3().setFromMatrixColumn(cam.matrix, 2),
						rollSpeedVal,
					);

					const q = qPitch.multiply(qYaw).multiply(qRoll);

					const pivot = new THREE.Vector3(0, 0, 0);
					const toCam = new THREE.Vector3().subVectors(
						cam.position,
						pivot,
					);
					const toTarget = new THREE.Vector3().subVectors(
						target,
						pivot,
					);

					toCam.applyQuaternion(q);
					toTarget.applyQuaternion(q);

					cam.position.copy(pivot).add(toCam);
					target.copy(pivot).add(toTarget);
					cam.up.applyQuaternion(q);
				}

				const needsUpdate = hasPan || hasDolly || hasRot;
				if (needsUpdate) {
					cam.lookAt(target);
				}

				// Capture the camera's position *after* all movements for this frame
				// No automatic pan/dolly speed reduction.
			}
		} else {
			// EDIT MODE: Manipulate the cube
			if (cubeRef.current && cameraRef.current) {
				const cube = cubeRef.current;
				const cam = cameraRef.current;
				const hasRot =
					Math.abs(totalRotatePitch) > 1e-7 ||
					Math.abs(totalRotateYaw) > 1e-7 ||
					Math.abs(totalRotateRoll) > 1e-7;
				if (hasRot) {
					const pitchSpeed = totalRotatePitch * delta;
					const yawSpeed = totalRotateYaw * delta;
					const rollSpeedVal = totalRotateRoll * delta;

					// Use the EXACT same screen-aligned axes as View Mode
					const axisPitch = new THREE.Vector3().setFromMatrixColumn(
						cam.matrix,
						0,
					);
					const axisYaw = new THREE.Vector3().setFromMatrixColumn(
						cam.matrix,
						1,
					);
					const axisRoll = new THREE.Vector3().setFromMatrixColumn(
						cam.matrix,
						2,
					);

					// Rotate the cube around these world axes by inverted speeds to match camera orbit feel
					const qPitch = new THREE.Quaternion().setFromAxisAngle(
						axisPitch,
						-pitchSpeed,
					);
					const qYaw = new THREE.Quaternion().setFromAxisAngle(
						axisYaw,
						-yawSpeed,
					);
					const qRoll = new THREE.Quaternion().setFromAxisAngle(
						axisRoll,
						-rollSpeedVal,
					);

					cube.quaternion
						.premultiply(qPitch)
						.premultiply(qYaw)
						.premultiply(qRoll);
				}
			}
		}

		// --- Square-Up Smoothing ---
		if (squareUp) {
			if (!fitAnimRef.current) {
				const hasInput =
					Object.values(movement.current).some(v => v === true) ||
					isDragging.current;
				if (hasInput && !isSnapLockedRef.current) {
					squareUpAnimRef.current = null;
					if (isSquaredUp) setIsSquaredUp(false);
				} else {
					if (viewMode) {
						// VIEW MODE: Center, Level, and Snap to Dominant Face
						const cam = cameraRef.current || camera;
						const target = cameraTargetRef.current;
						if (cam && target) {
							if (!isSquaredUp && !squareUpAnimRef.current) {
								const pos = cam.position.clone().sub(target);
								const dist = pos.length();
								const ax = Math.abs(pos.x),
									ay = Math.abs(pos.y),
									az = Math.abs(pos.z);

								const idealPos = new THREE.Vector3();
								let lookDir = new THREE.Vector3();

								if (az >= ax && az >= ay) {
									idealPos.set(0, 0, pos.z > 0 ? dist : -dist);
									lookDir.set(0, 0, pos.z > 0 ? -1 : 1);
								} else if (ax >= ay && ax >= az) {
									idealPos.set(pos.x > 0 ? dist : -dist, 0, 0);
									lookDir.set(pos.x > 0 ? -1 : 1, 0, 0);
								} else {
									idealPos.set(0, pos.y > 0 ? dist : -dist, 0);
									lookDir.set(0, pos.y > 0 ? -1 : 1, 0);
								}

								// 3. Snap Up to nearest 90-deg increment (orthogonal to lookDir)
								let idealUp = new THREE.Vector3(0, 1, 0);
								const currentUp = cam.up.clone();
								const candidates: THREE.Vector3[] = [];
								if (lookDir.x !== 0) {
									candidates.push(
										new THREE.Vector3(0, 1, 0),
										new THREE.Vector3(0, -1, 0),
										new THREE.Vector3(0, 0, 1),
										new THREE.Vector3(0, 0, -1),
									);
								} else if (lookDir.y !== 0) {
									candidates.push(
										new THREE.Vector3(1, 0, 0),
										new THREE.Vector3(-1, 0, 0),
										new THREE.Vector3(0, 0, 1),
										new THREE.Vector3(0, 0, -1),
									);
								} else {
									candidates.push(
										new THREE.Vector3(1, 0, 0),
										new THREE.Vector3(-1, 0, 0),
										new THREE.Vector3(0, 1, 0),
										new THREE.Vector3(0, -1, 0),
									);
								}

								let maxDot = -Infinity;
								for (const cand of candidates) {
									const d = currentUp.dot(cand);
									if (d > maxDot) {
										maxDot = d;
										idealUp.copy(cand);
									}
								}

								const targetPos = idealPos.clone(); // Relative to 0,0,0
								const lookAtMat = new THREE.Matrix4().lookAt(
									targetPos,
									new THREE.Vector3(0, 0, 0),
									idealUp,
								);
								const targetQuat =
									new THREE.Quaternion().setFromRotationMatrix(
										lookAtMat,
									);

								const distToTarget = cam.position.distanceTo(
									targetPos.clone().add(target),
								);
								const angleToTarget =
									cam.quaternion.angleTo(targetQuat);

								if (
									distToTarget < 0.01 &&
									angleToTarget < 0.01 &&
									target.length() < 0.01
								) {
									setIsSquaredUp(true);
									isSnapLockedRef.current = false;
								} else {
									if (dragJustStopped && squareUp) {
										isSnapLockedRef.current = true;
									}
									squareUpAnimRef.current = {
										mode: 'view',
										startTime: performance.now() / 1000,
										startPos: cam.position.clone(),
										startQuat: cam.quaternion.clone(),
										startUp: cam.up.clone(),
										startTarget: target.clone(),
										startDist: dist,
										targetPos,
										targetQuat,
										targetUp: idealUp,
									};
									setIsSquaredUp(false);
								}
							}

							if (
								squareUpAnimRef.current &&
								squareUpAnimRef.current.mode === 'view'
							) {
								const anim = squareUpAnimRef.current;
								const elapsed =
									performance.now() / 1000 - anim.startTime;
								const duration = 0.5;
								const t = Math.min(elapsed / duration, 1.0);
								const easeT = 1 - Math.pow(1 - t, 3); // ease-out cubic

								target.lerpVectors(
									anim.startTarget!,
									new THREE.Vector3(0, 0, 0),
									easeT,
								);
								cam.position.lerpVectors(
									anim.startPos!,
									anim.targetPos!,
									easeT,
								);
								cam.quaternion.slerpQuaternions(
									anim.startQuat,
									anim.targetQuat,
									easeT,
								);
								cam.up.lerpVectors(
									anim.startUp!,
									anim.targetUp!,
									easeT,
								);

								// Preserve start distance exactly, avoiding chord cutting
								const currentD = anim.startDist!;
								const dir = cam.position
									.clone()
									.sub(target)
									.normalize();
								cam.position
									.copy(target)
									.add(dir.multiplyScalar(currentD));

								if (t >= 1) {
									setIsSquaredUp(true);
									squareUpAnimRef.current = null;
									isSnapLockedRef.current = false;
								}
							}
						}
					} else {
						// EDIT MODE: Snap Cube to nearest axis-aligned orientation
						const cube = cubeRef.current;
						if (cube) {
							if (!isSquaredUp && !squareUpAnimRef.current) {
								const currentQ = cube.quaternion.clone();
								const snapVec = (v: THREE.Vector3) => {
									const ax = Math.abs(v.x),
										ay = Math.abs(v.y),
										az = Math.abs(v.z);
									if (ax >= ay && ax >= az)
										return new THREE.Vector3(v.x > 0 ? 1 : -1, 0, 0);
									if (ay >= ax && ay >= az)
										return new THREE.Vector3(0, v.y > 0 ? 1 : -1, 0);
									return new THREE.Vector3(0, 0, v.z > 0 ? 1 : -1);
								};
								const localX = new THREE.Vector3(
									1,
									0,
									0,
								).applyQuaternion(currentQ);
								const localY = new THREE.Vector3(
									0,
									1,
									0,
								).applyQuaternion(currentQ);
								const targetX = snapVec(localX);
								let targetY = snapVec(localY);
								if (Math.abs(targetY.dot(targetX)) > 0.9) {
									const alternateY = new THREE.Vector3(0, 1, 0);
									if (Math.abs(alternateY.dot(targetX)) > 0.9)
										alternateY.set(0, 0, 1);
									targetY = alternateY;
								}
								const targetZ = new THREE.Vector3().crossVectors(
									targetX,
									targetY,
								);
								const targetMat = new THREE.Matrix4().makeBasis(
									targetX,
									targetY,
									targetZ,
								);
								const targetQuat =
									new THREE.Quaternion().setFromRotationMatrix(
										targetMat,
									);
								const angleToTarget =
									cube.quaternion.angleTo(targetQuat);

								if (angleToTarget < 0.01) {
									setIsSquaredUp(true);
									isSnapLockedRef.current = false;
								} else {
									if (dragJustStopped && squareUp) {
										isSnapLockedRef.current = true;
									}
									squareUpAnimRef.current = {
										mode: 'edit',
										startTime: performance.now() / 1000,
										startQuat: cube.quaternion.clone(),
										targetQuat,
									};
									setIsSquaredUp(false);
								}
							}

							if (
								squareUpAnimRef.current &&
								squareUpAnimRef.current.mode === 'edit'
							) {
								const anim = squareUpAnimRef.current;
								const elapsed =
									performance.now() / 1000 - anim.startTime;
								const duration = 0.5;
								const t = Math.min(elapsed / duration, 1.0);
								const easeT = 1 - Math.pow(1 - t, 3); // ease-out cubic

								cube.quaternion.slerpQuaternions(
									anim.startQuat,
									anim.targetQuat,
									easeT,
								);

								if (t >= 1) {
									setIsSquaredUp(true);
									squareUpAnimRef.current = null;
									isSnapLockedRef.current = false;
								}
							}
						}
					}
				}
			} else {
				if (isSquaredUp) setIsSquaredUp(false);
				squareUpAnimRef.current = null;
				isSnapLockedRef.current = false;
			}
		}
	});

	useFrame(threeState => {
		if (running) {
			const elapsed = threeState.clock.getElapsedTime();
			if (elapsed - lastTick.current > 1 / speed) {
				lastTick.current = elapsed;
				tick();
			}
		}
	});

	// Track last reported orientation via ref to detect threshold crossings without stale closures.
	const lastOrientationRef = useRef({
		face: '' as string,
		rotation: '' as string | number,
	});

	// Continuously check orientation every frame — covers mouse drag, damping, keyboard snap,
	// flight-sim rotation, and cube rotation. Only fires setCameraOrientation on actual changes.
	useFrame(() => {
		if (
			cameraRef.current &&
			cameraTargetRef.current &&
			cubeRef.current
		) {
			const orientation = getOrientation(
				cameraRef.current,
				cameraTargetRef.current,
				cubeRef.current,
			);
			const prev = lastOrientationRef.current;
			if (
				orientation.face !== prev.face ||
				orientation.rotation !== prev.rotation
			) {
				lastOrientationRef.current = {
					face: orientation.face,
					rotation: orientation.rotation,
				};
				setCameraOrientation(orientation);
			}
		}
	});

	return (
		<>
			<ambientLight intensity={0.4} />
			<pointLight position={[30, 30, 30]} intensity={1} />
			<pointLight position={[-30, -30, -30]} intensity={0.5} />
			<group ref={cubeRef}>
				<Cells
					grid={gridRef.current}
					margin={cellMargin}
					selectorPos={viewMode ? null : selectorPos}
					viewMode={viewMode}
					onClick={e => {
						if (running || viewMode || wasRotating.current) return;
						e.stopPropagation();
						const { instanceId } = e;
						if (instanceId !== undefined) {
							const cells = gridRef.current.getLivingCells();
							const cell = cells[instanceId];
							if (cell) {
								const [x, y, z] = cell;
								setSelectorPos([x, y, z]);
								if (!viewMode) {
									// Check if the clicked cell belongs to an organism
									const clickedCellKey = makeKey(x, y, z);
									let foundOrganism = null;
									for (const org of organismsRef.current.values()) {
										if (org.livingCells.has(clickedCellKey)) {
											foundOrganism = org;
											break;
										}
									}

									if (foundOrganism) {
										// If it's part of an organism, set the community to the organism's living cells
										const organismCommunity = Array.from(foundOrganism.livingCells).map(key =>
											key.split(',').map(Number) as [number, number, number]
										);
										setCommunity(organismCommunity);
										console.log(
											'Clicked cell at',
											x,
											y,
											z,
											'Organism Community:',
											organismCommunity.length,
											'Name:',
											foundOrganism.name
										);
									} else {
										// Otherwise, get the community as usual
										const community = gridRef.current.getCommunity(
											x,
											y,
											z,
										);
										setCommunity(community);
										console.log(
											'Clicked cell at',
											x,
											y,
											z,
											'Community:',
											community.length,
										);
									}
								}
							}
						}
					}}
				/>
				<OrganismSkins
					organisms={organisms}
					organismsVersion={organismsVersion}
					gridSize={gridRef.current.size}
					cellMargin={cellMargin}
				/>
				<OrganismCoreVisuals
					organisms={organisms}
					organismsVersion={organismsVersion}
					gridSize={gridRef.current.size}
					cellMargin={cellMargin}
				/>
				<BoundingBox size={gridRef.current.size} />
				{!viewMode && (
					<>
						<FaceLabels size={gridRef.current.size} />
						<KeyboardSelector
							cubeRef={cubeRef}
							brushQuaternion={brushQuaternion}
							cameraActionsRef={cameraActionsRef}
						/>
					</>
				)}
			</group>
			<PerspectiveCamera
				ref={cameraRef}
				makeDefault
				position={[0, 0, 40]}
			/>
		</>
	);
}
