import React, {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import * as THREE from 'three';
import { Emitter } from '../core/events';
import { Grid3D } from '../core/Grid3D';
import { loadSettings, saveSettings } from '../hooks/useSettings';
import { CameraOrientation } from '../core/faceOrientationKeyMapping';
import { Organism, makeKey, computeCytoplasm, computeSkinColor } from '../core/Organism';
import { ORGANISM_NAMES } from '../data/organism-names';

const initialSettings = loadSettings();

const defaults = {
	speed: 5,
	density: 0.08,
	surviveMin: 2,
	surviveMax: 2,
	birthMin: 3,
	birthMax: 3,
	birthMargin: 0,
	cellMargin: 0.2,
	gridSize: 24,
	neighborFaces: 1,
	neighborEdges: 1,
	neighborCorners: 0,
	panSpeed: 24,
	rotationSpeed: 50,
	rollSpeed: 100,
	invertYaw: 1,
	invertPitch: 1,
	invertRoll: 1,
	easeIn: 0.2,
	easeOut: 0.5,
	squareUp: 1,
};

const storedSettings = { ...defaults, ...initialSettings };

export interface SimulationState {
	speed: number;
	density: number;
	cellMargin: number;
	gridSize: number;
	surviveMin: number;
	surviveMax: number;
	birthMin: number;
	birthMax: number;
	birthMargin: number;
	running: boolean;
	community: Array<[number, number, number]>;
	viewMode: boolean;
	neighborFaces: boolean;
	neighborEdges: boolean;
	neighborCorners: boolean;
	hasInitialState: boolean;
	hasPastHistory: boolean;
	panSpeed: number;
	rotationSpeed: number;
	rollSpeed: number;
	invertYaw: boolean;
	invertPitch: boolean;
	invertRoll: boolean;
	easeIn: number;
	easeOut: number;
	squareUp: boolean;
	isSquaredUp: boolean;
	cameraOrientation: CameraOrientation;
	isAnimatingInit: boolean;
	userName?: string;
	buildInfo: {
		version: string;
		buildTime: string;
		distribution: 'dev' | 'test' | 'prod';
	};
	showIntroduction: boolean;
	organisms: Map<string, Organism>;
	organismsVersion: number;
}

export interface SimulationActions {
	setSpeed: (speed: number) => void;
	setDensity: (density: number) => void;
	setCellMargin: (margin: number) => void;
	setGridSize: (size: number) => void;
	setSurviveMin: (val: number) => void;
	setSurviveMax: (val: number) => void;
	setBirthMin: (val: number) => void;
	setBirthMax: (val: number) => void;
	setBirthMargin: (val: number) => void;
	setNeighborFaces: (val: boolean) => void;
	setNeighborEdges: (val: boolean) => void;
	setNeighborCorners: (val: boolean) => void;
	setCommunity: (community: Array<[number, number, number]>) => void;
	setviewMode: (mode: boolean | ((prev: boolean) => boolean)) => void;
	setPanSpeed: (speed: number) => void;
	setRotationSpeed: (speed: number) => void;
	setRollSpeed: (speed: number) => void;
	setInvertYaw: (val: boolean) => void;
	setInvertPitch: (val: boolean) => void;
	setInvertRoll: (val: boolean) => void;
	setEaseIn: (val: number) => void;
	setEaseOut: (val: number) => void;
	setSquareUp: (val: boolean | ((prev: boolean) => boolean)) => void;
	setIsSquaredUp: (val: boolean) => void;
	setCameraOrientation: (orientation: CameraOrientation) => void;
	setUserName: (name: string) => void;
	setShowIntroduction: (show: boolean) => void;
	convertCommunityToOrganism: (community: Array<[number, number, number]>) => void;

	playStop: () => void;
	step: () => void;
	stepBackward: () => void;
	randomize: () => void;
	reset: () => void;
	clear: () => void;
	tick: () => void;

	toggleCell: (x: number, y: number, z: number) => void;
	setCell: (x: number, y: number, z: number, alive: boolean) => void;
	setCells: (cells: Array<[number, number, number]>) => void;
	deleteCells: (cells: Array<[number, number, number]>) => void;

	applyCells: (
		cells: Array<[number, number, number]>,
		updateGridSize?: number,
	) => void;

	// Camera Actions
	fitDisplay: () => void;
	recenter: () => void;
}

export type AppEvents = {
	moveSelector: { delta: [number, number, number] };
	rotateBrush: { axis: THREE.Vector3; angle: number };
};

export interface SimulationMeta {
	gridRef: React.MutableRefObject<Grid3D>;
	initialStateRef: React.MutableRefObject<
		Array<[number, number, number]>
	>;
	cameraTargetRef: React.MutableRefObject<THREE.Vector3>;
	cameraActionsRef: React.MutableRefObject<{
		fitDisplay: () => void;
		recenter: () => void;
		rotateBrush: (axis: THREE.Vector3, angle: number) => void;
		birthBrushCells: () => void;
		clearBrushCells: () => void;
	} | null>;
	eventBus: Emitter<AppEvents>;
	movement: React.MutableRefObject<Record<string, boolean>>;
	velocity: React.MutableRefObject<Record<string, number>>;
	organismsRef: React.MutableRefObject<Map<string, Organism>>;
}

export interface SimulationContextValue {
	state: SimulationState;
	actions: SimulationActions;
	meta: SimulationMeta;
}

const SimulationContext = createContext<SimulationContextValue | null>(
	null,
);

export function SimulationProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [gridSize, setGridSize] = useState(storedSettings.gridSize);
	const gridRef = useRef(new Grid3D(storedSettings.gridSize));
	const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
	const initialStateRef = useRef<Array<[number, number, number]>>([]);
	const cameraActionsRef = useRef<any>(null);
	const eventBusRef = useRef(new Emitter<AppEvents>());
	const movement = useRef<Record<string, boolean>>({
		forward: false,
		backward: false,
		left: false,
		right: false,
		up: false,
		down: false,
		rotateO: false,
		rotatePeriod: false,
		rotateK: false,
		rotateSemicolon: false,
		rotateI: false,
		rotateP: false,
		space: false,
		delete: false,
	});
	const velocity = useRef<Record<string, number>>({
		rotateYaw: 0,
		rotateRoll: 0,
	});
	const organismsRef = useRef<Map<string, Organism>>(new Map());
	const [organismsVersion, setOrganismsVersion] = useState(0);
	const initialOrganismsRef = useRef<Map<string, Organism>>(new Map());
	const isFirstLoadRef = useRef(true);
	const [hasInitialState, setHasInitialState] = useState(false);
	const [hasPastHistory, setHasPastHistory] = useState(false);

	useEffect(() => {
		const interval = setInterval(() => {
			if (hasPastHistory !== gridRef.current.canStepBackward) {
				setHasPastHistory(gridRef.current.canStepBackward);
			}
		}, 200);
		return () => clearInterval(interval);
	}, [hasPastHistory]);

	const [running, setRunning] = useState(false);
	const [viewMode, setviewMode] = useState(true);
	const [community, setCommunity] = useState<
		Array<[number, number, number]>
	>([]);
	const [cameraOrientation, setCameraOrientation] =
		useState<CameraOrientation>({ face: 'front', rotation: 0 });
	const [isAnimatingInit, setIsAnimatingInit] = useState(false);
	const [userName, setUserNameState] = useState<string | undefined>(
		localStorage.getItem('userName') || undefined,
	);
	const [showIntroduction, setShowIntroduction] = useState(true);

	const [buildInfo, setBuildInfo] = useState<
		SimulationState['buildInfo']
	>({
		version: '1.7.0',
		buildTime: '',
		distribution: 'prod',
	});

	useEffect(() => {
		if (
			typeof window !== 'undefined' &&
			(window as any).__BUILD_INFO__
		) {
			setBuildInfo((window as any).__BUILD_INFO__);
		}
	}, []);

	const setUserName = useCallback((name: string) => {
		localStorage.setItem('userName', name);
		setUserNameState(name);
	}, []);

	const [speed, setSpeed] = useState(storedSettings.speed);
	const [density, setDensity] = useState(storedSettings.density);
	const [cellMargin, setCellMargin] = useState(
		storedSettings.cellMargin,
	);
	const [surviveMin, setSurviveMin] = useState(
		storedSettings.surviveMin,
	);
	const [surviveMax, setSurviveMax] = useState(
		storedSettings.surviveMax,
	);
	const [birthMin, setBirthMin] = useState(storedSettings.birthMin);
	const [birthMax, setBirthMax] = useState(storedSettings.birthMax);
	const [birthMargin, setBirthMargin] = useState(
		storedSettings.birthMargin,
	);

	const [panSpeed, setPanSpeed] = useState(storedSettings.panSpeed);
	const [rotationSpeed, setRotationSpeed] = useState(
		storedSettings.rotationSpeed,
	);
	const [invertYaw, setInvertYaw] = useState(
		Boolean(storedSettings.invertYaw),
	);
	const [invertPitch, setInvertPitch] = useState(
		Boolean(storedSettings.invertPitch),
	);
	const [easeIn, setEaseIn] = useState(storedSettings.easeIn);
	const [easeOut, setEaseOut] = useState(storedSettings.easeOut);
	const [squareUp, setSquareUpState] = useState(true); // always on by default, not persisted
	const [isSquaredUp, setIsSquaredUp] = useState(false);
	const [rollSpeed, setRollSpeed] = useState(storedSettings.rollSpeed);
	const [invertRoll, setInvertRoll] = useState(
		Boolean(storedSettings.invertRoll),
	);

	const [neighborFaces, setNeighborFaces] = useState(
		Boolean(storedSettings.neighborFaces),
	);
	const [neighborEdges, setNeighborEdges] = useState(
		Boolean(storedSettings.neighborEdges),
	);
	const [neighborCorners, setNeighborCorners] = useState(
		Boolean(storedSettings.neighborCorners),
	);

	const hasMounted = useRef(false);
	const cellsInitializedRef = useRef(false);

	const runInitAnimation = useCallback(
		async (cells?: Array<[number, number, number]>) => {
			// Small pause to allow everything to settle
			await new Promise(r => setTimeout(r, 500));

			if (isFirstLoadRef.current) {
				cameraActionsRef.current?.fitDisplay();
				isFirstLoadRef.current = false;
			}

			setIsAnimatingInit(true);
			if (cells) {
				initialStateRef.current = cells;
				gridRef.current.clear();
				setHasInitialState(cells.length > 0);
			}

			const size = gridRef.current.size;
			const originalCells = initialStateRef.current;
			const originalSet = new Set(
				originalCells.map(([x, y, z]) => `${x},${y},${z}`),
			);

			// Calculate sphere center and radius to encompass the pattern
			let centerX = size / 2;
			let centerY = size / 2;
			let centerZ = size / 2;
			let radius = size / 4;

			if (originalCells.length > 0) {
				let minX = size,
					maxX = 0;
				let minY = size,
					maxY = 0;
				let minZ = size,
					maxZ = 0;
				for (const [x, y, z] of originalCells) {
					minX = Math.min(minX, x);
					maxX = Math.max(maxX, x);
					minY = Math.min(minY, y);
					maxY = Math.max(maxY, y);
					minZ = Math.min(minZ, z);
					maxZ = Math.max(maxZ, z);
				}
				centerX = (minX + maxX) / 2;
				centerY = (minY + maxY) / 2;
				centerZ = (minZ + maxZ) / 2;

				let maxDistSq = 0;
				for (const [x, y, z] of originalCells) {
					const dx = x - centerX;
					const dy = y - centerY;
					const dz = z - centerZ;
					maxDistSq = Math.max(maxDistSq, dx * dx + dy * dy + dz * dz);
				}
				radius = Math.sqrt(maxDistSq) + 2; // +2 for generous padding
			}

			// Ensure the sphere is at least 30% the volume of the cube
			// (4/3)*pi*r^3 >= 0.3 * size^3  =>  r >= size * cbrt(0.225/pi) approx 0.415 * size
			const minRadius = size * 0.415;
			radius = Math.max(radius, minRadius);

			// 1 second total: 0.5s fill, 0.5s empty
			const fillDuration = 500;
			const stepDelay = fillDuration / size;

			// Phase 1: Fill bottom-up (Y from 0 to size-1)
			for (let y = 0; y < size; y++) {
				for (let x = 0; x < size; x++) {
					for (let z = 0; z < size; z++) {
						const dx = x - centerX;
						const dy = y - centerY;
						const dz = z - centerZ;
						const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

						// Hollow shell with thickness 1
						if (dist <= radius && dist >= radius - 1) {
							gridRef.current.set(x, y, z, true);
						}
					}
				}
				gridRef.current.version++;
				await new Promise(r => setTimeout(r, stepDelay));
			}

			// Phase 2: Empty top-down (Y from size-1 to 0)
			const emptyDuration = 500;
			const emptyStepDelay = emptyDuration / size;
			for (let y = size - 1; y >= 0; y--) {
				for (let x = 0; x < size; x++) {
					for (let z = 0; z < size; z++) {
						const isTarget = originalSet.has(`${x},${y},${z}`);
						gridRef.current.set(x, y, z, isTarget);
					}
				}
				gridRef.current.version++;
				await new Promise(r => setTimeout(r, emptyStepDelay));
			}

			// Wait for the last few cells to finish their shrinking animation (0.2s)
			await new Promise(r => setTimeout(r, 300));

			setIsAnimatingInit(false);
		},
		[],
	);

	// Initialization logic
	useEffect(() => {
		// Cell capture runs ONCE on mount only — subsequent re-runs (e.g. when
		// showIntroduction flips to false) must NOT re-read the grid because it
		// will already have been cleared by the first run.
		if (!cellsInitializedRef.current) {
			cellsInitializedRef.current = true;
			if (Object.keys(initialSettings).length === 0) {
				const mid = Math.floor(storedSettings.gridSize / 2);
				const cells: Array<[number, number, number]> = [];
				for (let x = mid - 1; x <= mid; x++) {
					for (let y = mid - 1; y <= mid; y++) {
						for (let z = mid - 1; z <= mid; z++) {
							// Do NOT set cells in gridRef yet, just record them
							cells.push([x, y, z]);
						}
					}
				}
				initialStateRef.current = cells;
				setHasInitialState(cells.length > 0);
			} else {
				// Capture initial state from settings but clear the grid for animation
				const cells = gridRef.current.getLivingCells();
				initialStateRef.current = cells;
				gridRef.current.clear();
				setHasInitialState(cells.length > 0);
			}
		}

		if (buildInfo.distribution !== 'prod' && !userName) {
			return;
		}

		if (showIntroduction) {
			return;
		}

		runInitAnimation();
	}, [
		runInitAnimation,
		userName,
		buildInfo.distribution,
		showIntroduction,
	]);

	// keep grid's neighbor flags in sync
	useEffect(() => {
		gridRef.current.neighborFaces = neighborFaces;
		gridRef.current.neighborEdges = neighborEdges;
		gridRef.current.neighborCorners = neighborCorners;
	}, [neighborFaces, neighborEdges, neighborCorners]);

	useEffect(() => {
		if (!hasMounted.current) {
			hasMounted.current = true;
			return;
		}
		const settings = {
			speed,
			density,
			cellMargin,
			gridSize,
			surviveMin,
			surviveMax,
			birthMin,
			birthMax,
			birthMargin,
			neighborFaces: neighborFaces ? 1 : 0,
			neighborEdges: neighborEdges ? 1 : 0,
			neighborCorners: neighborCorners ? 1 : 0,
			panSpeed,
			rotationSpeed,
			invertYaw: invertYaw ? 1 : 0,
			invertPitch: invertPitch ? 1 : 0,
			invertRoll: invertRoll ? 1 : 0,
			easeIn,
			easeOut,

			rollSpeed,
		};
		saveSettings(settings);
	}, [
		speed,
		density,
		cellMargin,
		gridSize,
		surviveMin,
		surviveMax,
		birthMin,
		birthMax,
		birthMargin,
		neighborFaces,
		neighborEdges,
		neighborCorners,
		panSpeed,
		rotationSpeed,
		invertYaw,
		invertPitch,
		invertRoll,
		easeIn,
		easeOut,
		rollSpeed,
	]);

	const handleGridSizeChange = useCallback(
		(newSize: number) => {
			setRunning(false);
			gridRef.current = new Grid3D(newSize);
			// propagate neighbor settings
			gridRef.current.neighborFaces = neighborFaces;
			gridRef.current.neighborEdges = neighborEdges;
			gridRef.current.neighborCorners = neighborCorners;
			initialStateRef.current = [];
			setHasInitialState(false);
			setGridSize(newSize);
			setCommunity([]);
			organismsRef.current.clear();
			setOrganismsVersion(v => v + 1);
		},
		[neighborFaces, neighborEdges, neighborCorners],
	);

	const updateOrganismsAfterTick = useCallback(() => {
		const newOrganisms = new Map<string, Organism>();

		for (const organism of organismsRef.current.values()) {
			// The boundary is the current shape plus its cytoplasm.
			const boundary = new Set([
				...organism.livingCells,
				...organism.cytoplasm,
			]);
			const newLivingCells = new Set<string>();

			for (const key of boundary) {
				const [x, y, z] = key.split(',').map(Number);
				if (gridRef.current.get(x, y, z)) {
					newLivingCells.add(key);
				}
			}

			if (newLivingCells.size > 0) {
				const newCytoplasm = computeCytoplasm(
					newLivingCells,
					gridSize,
					neighborFaces,
					neighborEdges,
					neighborCorners,
				);
				const newSkinColor = computeSkinColor(newLivingCells, gridSize);

				newOrganisms.set(organism.id, {
					...organism,
					livingCells: newLivingCells,
					cytoplasm: newCytoplasm,
					skinColor: newSkinColor,
				});
			}
		}
		organismsRef.current = newOrganisms;
		setOrganismsVersion(v => v + 1);
	}, [gridSize, neighborFaces, neighborEdges, neighborCorners]);

	const playStop = useCallback(() => {
		if (!running && gridRef.current.generation === 0) {
			initialStateRef.current = gridRef.current.saveState();
			initialOrganismsRef.current = new Map(organismsRef.current);
			setHasInitialState(initialStateRef.current.length > 0);
		}
		setRunning(r => !r);
	}, [running]);

	const stepBackward = useCallback(() => {
		setRunning(false);
		gridRef.current.stepBackward();
	}, []);

	const step = useCallback(() => {
		if (!running) {
			if (gridRef.current.generation === 0) {
				initialStateRef.current = gridRef.current.saveState();
				initialOrganismsRef.current = new Map(organismsRef.current);
				setHasInitialState(initialStateRef.current.length > 0);
			}
			gridRef.current.neighborFaces = neighborFaces;
			gridRef.current.neighborEdges = neighborEdges;
			gridRef.current.neighborCorners = neighborCorners;
			gridRef.current.tick(
				surviveMin,
				surviveMax,
				birthMin,
				birthMax,
				birthMargin,
			);
			updateOrganismsAfterTick();
		}
	}, [
		running,
		surviveMin,
		surviveMax,
		birthMin,
		birthMax,
		birthMargin,
		neighborFaces,
		neighborEdges,
		neighborCorners,
		updateOrganismsAfterTick,
	]);

	const randomize = useCallback(() => {
		gridRef.current.randomize(density);
		initialStateRef.current = gridRef.current.saveState();
		initialOrganismsRef.current = new Map();
		setHasInitialState(initialStateRef.current.length > 0);
	}, [density]);

	const reset = useCallback(() => {
		setRunning(false);
		gridRef.current.restoreState(initialStateRef.current);
		organismsRef.current = new Map(initialOrganismsRef.current);
		setOrganismsVersion(v => v + 1);
	}, []);

	const clear = useCallback(() => {
		setRunning(false);
		gridRef.current.clear();
		initialStateRef.current = [];
		initialOrganismsRef.current = new Map();
		organismsRef.current = new Map();
		setOrganismsVersion(v => v + 1);
		setHasInitialState(false);
	}, []);

	const tick = useCallback(() => {
		gridRef.current.neighborFaces = neighborFaces;
		gridRef.current.neighborEdges = neighborEdges;
		gridRef.current.neighborCorners = neighborCorners;
		gridRef.current.tick(
			surviveMin,
			surviveMax,
			birthMin,
			birthMax,
			birthMargin,
		);

		updateOrganismsAfterTick();

		if (gridRef.current.getLivingCells().length === 0) {
			setRunning(false);
		}
	}, [
		surviveMin,
		surviveMax,
		birthMin,
		birthMax,
		birthMargin,
		neighborFaces,
		neighborEdges,
		neighborCorners,
		updateOrganismsAfterTick,
	]);

	const toggleCell = useCallback((x: number, y: number, z: number) => {
		gridRef.current.recordAction();
		gridRef.current.toggle(x, y, z);
	}, []);

	const setCell = useCallback(
		(x: number, y: number, z: number, alive: boolean) => {
			gridRef.current.recordAction();
			gridRef.current.set(x, y, z, alive);
		},
		[],
	);

	const setCells = useCallback(
		(cells: Array<[number, number, number]>) => {
			gridRef.current.recordAction();
			for (const [x, y, z] of cells) {
				gridRef.current.set(x, y, z, true);
			}
		},
		[],
	);

	const deleteCells = useCallback(
		(cells: Array<[number, number, number]>) => {
			gridRef.current.recordAction();
			for (const [x, y, z] of cells) {
				gridRef.current.set(x, y, z, false);
			}
		},
		[],
	);

	const applyCells = useCallback(
		(
			cells: Array<[number, number, number]>,
			updateGridSize?: number,
		) => {
			setRunning(false);
			if (updateGridSize !== undefined && updateGridSize !== gridSize) {
				gridRef.current = new Grid3D(updateGridSize);
				gridRef.current.neighborFaces = neighborFaces;
				gridRef.current.neighborEdges = neighborEdges;
				gridRef.current.neighborCorners = neighborCorners;
				setGridSize(updateGridSize);
			} else {
				gridRef.current.clear();
			}

			// We don't restore state immediately here because runInitAnimation handles it
			runInitAnimation(cells);
			setCommunity([]);
		},
		[
			gridSize,
			neighborFaces,
			neighborEdges,
			neighborCorners,
			runInitAnimation,
		],
	);

	const setSquareUp = useCallback(
		(mode: boolean | ((prev: boolean) => boolean)) => {
			setSquareUpState(prev => {
				const next = typeof mode === 'function' ? mode(prev) : mode;
				if (next !== prev) {
					setIsSquaredUp(false);
				}
				return next;
			});
		},
		[],
	);

	const handleSetviewMode = useCallback(
		(mode: boolean | ((prev: boolean) => boolean)) => {
			setviewMode(prev => {
				const next = typeof mode === 'function' ? mode(prev) : mode;
				if (next === false) {
					setRunning(false);
				}
				return next;
			});
		},
		[],
	);

	const fitDisplay = useCallback(
		() => cameraActionsRef.current?.fitDisplay(),
		[],
	);

	const recenter = useCallback(
		() => cameraActionsRef.current?.recenter(),
		[],
	);

	const convertCommunityToOrganism = useCallback(
		(communityCells: Array<[number, number, number]>) => {
			if (communityCells.length === 0) return;

			// Generate a unique name
			let baseName =
				ORGANISM_NAMES[Math.floor(Math.random() * ORGANISM_NAMES.length)];
			let name = baseName;
			let counter = 1;
			const existingNames = new Set(
				Array.from(organismsRef.current.values()).map(o => o.name),
			);
			while (existingNames.has(name)) {
				counter++;
				name = `${baseName} ${counter}`;
			}

			const livingCells = new Set(
				communityCells.map(([x, y, z]) => makeKey(x, y, z)),
			);
			const cytoplasm = computeCytoplasm(
				livingCells,
				gridSize,
				neighborFaces,
				neighborEdges,
				neighborCorners,
			);
			const skinColor = computeSkinColor(livingCells, gridSize);

			const newOrganism: Organism = {
				id: crypto.randomUUID(),
				name,
				livingCells,
				cytoplasm,
				skinColor,
				initialLivingCells: new Set(livingCells),
			};

			organismsRef.current.set(newOrganism.id, newOrganism);
			setOrganismsVersion(v => v + 1);
		},
		[gridSize, neighborFaces, neighborEdges, neighborCorners],
	);

	// Removed autoSquare leveling effect

	const value: SimulationContextValue = {
		state: {
			cameraOrientation,
			speed,
			density,
			cellMargin,
			gridSize,
			surviveMin,
			surviveMax,
			birthMin,
			birthMax,
			birthMargin,
			running,
			community,
			viewMode,
			neighborFaces,
			neighborEdges,
			neighborCorners,
			hasInitialState,
			hasPastHistory,
			panSpeed,
			rotationSpeed,
			invertYaw,
			invertPitch,
			invertRoll,
			easeIn,
			easeOut,
			squareUp,
			isSquaredUp,
			rollSpeed,
			isAnimatingInit,
			userName,
			buildInfo,
			showIntroduction,
			organisms: organismsRef.current,
			organismsVersion,
		},
		actions: {
			setSpeed,
			setDensity,
			setCellMargin,
			setGridSize: handleGridSizeChange,
			setSurviveMin,
			setSurviveMax,
			setBirthMin,
			setBirthMax,
			setBirthMargin,
			setCommunity,
			setviewMode: handleSetviewMode,
			setCameraOrientation,
			setPanSpeed,
			setRotationSpeed,
			setInvertYaw,
			setInvertPitch,
			setInvertRoll,
			setEaseIn,
			setEaseOut,
			setSquareUp,
			setIsSquaredUp,
			setRollSpeed,
			setUserName,
			setShowIntroduction,
			convertCommunityToOrganism,
			playStop,
			step,
			stepBackward,
			randomize,
			reset,
			clear,
			tick,
			setNeighborFaces,
			setNeighborEdges,
			setNeighborCorners,
			toggleCell,
			setCell,
			setCells,
			deleteCells,
			applyCells,
			fitDisplay,
			recenter,
		},
		meta: {
			gridRef,
			initialStateRef,
			cameraTargetRef,
			cameraActionsRef,
			eventBus: eventBusRef.current,
			movement,
			velocity,
			organismsRef,
		},
	};

	return (
		<SimulationContext.Provider value={value}>
			{children}
		</SimulationContext.Provider>
	);
}

export function useSimulation() {
	const context = useContext(SimulationContext);
	if (!context) {
		throw new Error(
			'useSimulation must be used within a SimulationProvider',
		);
	}
	return context;
}
