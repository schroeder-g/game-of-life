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
import {
	Organism,
	makeKey,
	parseKey,
	computeCytoplasm,
	computeSkinColor,
	serializeOrganism,
	deserializeOrganism,
	cloneOrganisms,
	getCentroid,
	rotateCells,
	rotateVector,
	computeSkin,
} from '../core/Organism';
import { ORGANISM_NAMES } from '../data/organism-names';
import { processOrganisms } from '../core/organism-processing';
import { IOrganismManager, DefaultOrganismManager } from '../core/OrganismManager';
import { exportGenesisConfig, importGenesisConfig } from '../hooks/useGenesisConfigs';
import { DEFAULT_CONFIGS } from '../data/default-configs';

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
	enableOrganisms: false,
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
	selectedOrganismId: string | null;
	showCytoplasm: boolean;
	showSkin: boolean;
	enableOrganisms: boolean;
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
	setShowCytoplasm: (val: boolean) => void;
	setShowSkin: (val: boolean) => void;
	setEnableOrganisms: (val: boolean) => void;
	setSelectedOrganismId: (id: string | null) => void;
	disorganizeOrganism: (id: string) => void;
	selectOrganism: (id: string | null) => void;
	snapToOrientation: (face: string, rotation: number) => void;

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
		config: any, // Accepts Array<[number, number, number]> or GenesisConfig
		updateGridSize?: number,
	) => Promise<void>;

	// Camera Actions
	fitDisplay: () => void;
	recenter: () => void;

	// Manipulation Actions
	moveSelectedOrganism: (delta: [number, number, number]) => void;
	rotateSelectedOrganism: (axis: THREE.Vector3, angle: number) => void;
}

export type AppEvents = {
	moveSelector: { delta: [number, number, number] };
	rotateBrush: { axis: THREE.Vector3; angle: number };
	showCommunityPanel: boolean;
	cellClick: { x: number; y: number; z: number };
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
		snapToOrientation: (face: string, rotation: number) => void;
	} | null>;
	eventBus: Emitter<AppEvents>;
	movement: React.MutableRefObject<Record<string, boolean>>;
	velocity: React.MutableRefObject<Record<string, number>>;
	organismsRef: React.MutableRefObject<Map<string, Organism>>; // Ref for mutable organisms map
}

export interface SimulationContextValue {
	state: SimulationState;
	actions: SimulationActions;
	meta: SimulationMeta;
}

export const SimulationContext = createContext<SimulationContextValue | null>(
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
		w: false,
		x: false,
		a: false,
		d: false,
		q: false,
		z: false,
		o: false,
		period: false,
		k: false,
		semicolon: false,
		i: false,
		p: false,
		space: false,
		delete: false,
	});
	const velocity = useRef<Record<string, number>>({
		rotateYaw: 0,
		rotateRoll: 0,
		panX: 0, // Initialize panX
		panY: 0, // Initialize panY
		dolly: 0, // Initialize dolly
		rotatePitch: 0, // Initialize rotatePitch
	});
	const organismManagerRef = useRef<IOrganismManager>(new DefaultOrganismManager());
	const [organismsVersion, setOrganismsVersion] = useState(0);
	const historyLimit = 100;

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
	const [community, _setCommunityInternal] = useState<
		Array<[number, number, number]>
	>([]);
	const [selectedOrganismId, setSelectedOrganismId] =
		useState<string | null>(null);
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
	const [showCytoplasm, setShowCytoplasm] = useState(true);
	const [showSkin, setShowSkin] = useState(true);
	const [enableOrganisms, setEnableOrganisms] = useState(
		Boolean(storedSettings.enableOrganisms),
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
				const defaultConfig = DEFAULT_CONFIGS['Persistent Jelly Organism'];
				if (defaultConfig) {
					initialStateRef.current = defaultConfig.cells;
					setHasInitialState(defaultConfig.cells.length > 0);
					
					// Hydrate default organisms
					if (defaultConfig.organisms) {
						organismManagerRef.current.applyOrganisms(defaultConfig.organisms, defaultConfig.settings.gridSize);
						setOrganismsVersion(organismManagerRef.current.version);
					}
					
					// Apply default settings
					setSpeed(defaultConfig.settings.speed);
					setDensity(defaultConfig.settings.density);
					setSurviveMin(defaultConfig.settings.surviveMin);
					setSurviveMax(defaultConfig.settings.surviveMax);
					setBirthMin(defaultConfig.settings.birthMin);
					setBirthMax(defaultConfig.settings.birthMax);
					setBirthMargin(defaultConfig.settings.birthMargin);
					setGridSize(defaultConfig.settings.gridSize);
					setNeighborFaces(!!defaultConfig.settings.neighborFaces);
					setNeighborEdges(!!defaultConfig.settings.neighborEdges);
					setNeighborCorners(!!defaultConfig.settings.neighborCorners);
				}
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
			enableOrganisms: enableOrganisms ? 1 : 0,
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
		enableOrganisms,
	]);

	useEffect(() => {
		if (!enableOrganisms) {
			if (organismManagerRef.current.organisms.size > 0) {
				organismManagerRef.current.clear();
				setOrganismsVersion(organismManagerRef.current.version);
			}
			setSelectedOrganismId(null);
		}
	}, [enableOrganisms]);
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
			organismManagerRef.current.clear();
			setOrganismsVersion(organismManagerRef.current.version);
		},
		[neighborFaces, neighborEdges, neighborCorners],
	);


	const playStop = useCallback(() => {
		if (!running && gridRef.current.generation === 0) {
			initialStateRef.current = gridRef.current.saveState();
			organismManagerRef.current.saveInitialState();
			setHasInitialState(initialStateRef.current.length > 0);
		}
		setRunning(r => !r);
	}, [running]);

	const stepBackward = useCallback(() => {
		setRunning(false);
		const success = gridRef.current.stepBackward();
		if (success) {
			organismManagerRef.current.stepBackward();
			setOrganismsVersion(organismManagerRef.current.version);
		}
	}, []);

	const step = useCallback(() => {
		if (!running) {
			if (gridRef.current.generation === 0) {
				organismManagerRef.current.saveInitialState();
				setHasInitialState(initialStateRef.current.length > 0);
			}
			gridRef.current.neighborFaces = neighborFaces;
			gridRef.current.neighborEdges = neighborEdges;
			gridRef.current.neighborCorners = neighborCorners;
			// GoL Phase 1: tick non-organism cells only
			let forbiddenBirths: Set<string> | undefined = undefined;
			if (enableOrganisms) { 
				organismManagerRef.current.beforeTick(gridRef.current); 
				forbiddenBirths = new Set<string>();
				// Full organism territory = DNA + cytoplasm + skin
				// No GOL births are allowed anywhere inside an organism's body or skin layer.
				const orgUniversalSpace = new Set<string>();
				for (const [, org] of organismManagerRef.current.organisms) {
					for (const key of org.livingCells) orgUniversalSpace.add(key);
					for (const key of org.cytoplasm) orgUniversalSpace.add(key);
				}
				for (const [, org] of organismManagerRef.current.organisms) {
					for (const key of org.livingCells) forbiddenBirths.add(key);
					for (const key of org.cytoplasm) forbiddenBirths.add(key);
					// Also forbid the skin layer
					const skin = computeSkin(org.cytoplasm, orgUniversalSpace, gridSize);
					for (const key of skin) forbiddenBirths.add(key);
				}
			}
			gridRef.current.tick(surviveMin, surviveMax, birthMin, birthMax, birthMargin, forbiddenBirths);
			if (enableOrganisms) { 
				organismManagerRef.current.afterTick(gridRef.current, { surviveMin, surviveMax, birthMin, birthMax, birthMargin, neighborFaces, neighborEdges, neighborCorners, gridSize }); 
				setOrganismsVersion(organismManagerRef.current.version);
			}
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
		
		
	]);

	const randomize = useCallback(() => {
		gridRef.current.randomize(density);
		initialStateRef.current = gridRef.current.saveState();
		organismManagerRef.current.clear(); // Clear current organisms
		setOrganismsVersion(organismManagerRef.current.version); // Trigger re-render
		setHasInitialState(initialStateRef.current.length > 0);
	}, [density]);

	const reset = useCallback(() => {
		setRunning(false);
		gridRef.current.restoreState(initialStateRef.current);
		organismManagerRef.current.restoreInitialState();
		setOrganismsVersion(organismManagerRef.current.version);
	}, []);

	const clear = useCallback(() => {
		setRunning(false);
		gridRef.current.clear();
		initialStateRef.current = [];
		organismManagerRef.current.clear();
		setOrganismsVersion(organismManagerRef.current.version);
		setHasInitialState(false);
	}, []);

	const tick = useCallback(() => {
		gridRef.current.neighborFaces = neighborFaces;
		gridRef.current.neighborEdges = neighborEdges;
		gridRef.current.neighborCorners = neighborCorners;
		// GoL Phase 1: tick non-organism cells only
		let forbiddenBirths: Set<string> | undefined = undefined;
		if (enableOrganisms) { 
			organismManagerRef.current.beforeTick(gridRef.current); 
			forbiddenBirths = new Set<string>();
			// Full organism territory = DNA + cytoplasm + skin
			const orgUniversalSpace2 = new Set<string>();
			for (const [, org] of organismManagerRef.current.organisms) {
				for (const key of org.livingCells) orgUniversalSpace2.add(key);
				for (const key of org.cytoplasm) orgUniversalSpace2.add(key);
			}
			for (const [, org] of organismManagerRef.current.organisms) {
				for (const key of org.livingCells) forbiddenBirths.add(key);
				for (const key of org.cytoplasm) forbiddenBirths.add(key);
				const skin = computeSkin(org.cytoplasm, orgUniversalSpace2, gridSize);
				for (const key of skin) forbiddenBirths.add(key);
			}
		}
		gridRef.current.tick(surviveMin, surviveMax, birthMin, birthMax, birthMargin, forbiddenBirths);
		if (enableOrganisms) { 
			organismManagerRef.current.afterTick(gridRef.current, { surviveMin, surviveMax, birthMin, birthMax, birthMargin, neighborFaces, neighborEdges, neighborCorners, gridSize }); 
			setOrganismsVersion(organismManagerRef.current.version);
		}

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
		
		
	]);

	const toggleCell = useCallback((x: number, y: number, z: number) => {
		organismManagerRef.current.recordAction();
		gridRef.current.recordAction();
		gridRef.current.toggle(x, y, z);
	}, []);

	const setCell = useCallback(
		(x: number, y: number, z: number, alive: boolean) => {
			organismManagerRef.current.recordAction();
			gridRef.current.recordAction();
			gridRef.current.set(x, y, z, alive);
		},
		[],
	);

	const setCells = useCallback(
		(cells: Array<[number, number, number]>) => {
			organismManagerRef.current.recordAction();
			gridRef.current.recordAction();
			for (const [x, y, z] of cells) {
				gridRef.current.set(x, y, z, true);
			}
		},
		[],
	);

	const deleteCells = useCallback(
		(cells: Array<[number, number, number]>) => {
			organismManagerRef.current.recordAction();
			gridRef.current.recordAction();
			for (const [x, y, z] of cells) {
				gridRef.current.set(x, y, z, false);
			}
		},
		[],
	);
	const applyCells = useCallback(
		async (
			config: any,
			updateGridSize?: number,
		) => {
			const cells = Array.isArray(config) ? config : config.cells;
			const savedOrgs = config.organisms;
			const finalGridSize = updateGridSize ?? gridSize;

			if (savedOrgs && savedOrgs.length > 0 && !enableOrganisms) {
				alert('Cannot load a scene containing organisms while Organisms are disabled.');
				return;
			}

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

			// Await the animation to ensure physical cells are on the grid before hydration
			await runInitAnimation(cells);
			
			setCommunity([]);
			
			// Hydration Logic: Re-instantiate organisms from saved state
			organismManagerRef.current.organisms.clear();
			
			
			
			if (savedOrgs && Array.isArray(savedOrgs)) {
				for (const orgData of savedOrgs) {
					organismManagerRef.current.organisms.set(orgData.id, deserializeOrganism(orgData, finalGridSize));
				}
			}
			
			setOrganismsVersion(v => v + 1);
		},
		[
			gridSize,
			neighborFaces,
			neighborEdges,
			neighborCorners,
			runInitAnimation,
			enableOrganisms,
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
				Array.from(organismManagerRef.current.organisms.values()).map(o => o.name),
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
			);
			const skinColor = computeSkinColor(livingCells, gridSize);

			const newOrganism: Organism = {
				id:
					typeof crypto !== 'undefined' && crypto.randomUUID
						? crypto.randomUUID()
						: `org-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
				name,
				livingCells,
				cytoplasm,
				skinColor,
				previousLivingCells: new Set(livingCells),
				straightSteps: 0,
				avoidanceSteps: 0,
				parallelSteps: 0,
				stuckTicks: 0,
				travelVector: [0, 0, 1], // Initial direction for new organisms
				centroid: getCentroid(livingCells),
			};

			organismManagerRef.current.organisms.set(newOrganism.id, newOrganism);
			setOrganismsVersion(v => v + 1); // Trigger re-render
			setSelectedOrganismId(newOrganism.id);
		},
		[gridSize, organismManagerRef, setOrganismsVersion, setSelectedOrganismId],
	);

	const disorganizeOrganism = useCallback(
		(id: string) => {
			organismManagerRef.current.removeOrganism(id);
			if (selectedOrganismId === id) {
				setSelectedOrganismId(null);
			}
			setOrganismsVersion(organismManagerRef.current.version);
		},
		[selectedOrganismId],
	);

	const selectOrganism = useCallback(
		(id: string | null) => {
			setSelectedOrganismId(id);
			if (id) {
				const org = organismManagerRef.current.organisms.get(id);
				if (org) {
					const coords = Array.from(org.livingCells).map(parseKey);
					_setCommunityInternal(coords);
				}
			} else {
				_setCommunityInternal([]);
			}
		},
		[organismManagerRef],
	);

	const snapToOrientation = useCallback((face: string, rotation: number) => {
		cameraActionsRef.current?.snapToOrientation(face, rotation);
	}, []);

	const setCommunity = useCallback(
		(newCommunity: Array<[number, number, number]>) => {
			_setCommunityInternal(newCommunity);
			if (newCommunity.length === 0) {
				setSelectedOrganismId(null);
			} else {
				const communityKeys = new Set(
					newCommunity.map(([x, y, z]) => makeKey(x, y, z)),
				);
				let foundId: string | null = null;
				for (const [id, org] of organismManagerRef.current.organisms.entries()) {
					for (const key of communityKeys) {
						if (org.livingCells.has(key)) {
							foundId = id;
							break;
						}
					}
					if (foundId) break;
				}
				setSelectedOrganismId(foundId);
			}
		},
		[],
	);

	const moveSelectedOrganism = useCallback(
		(delta: [number, number, number]) => {
			if (!selectedOrganismId) return;
			const org = organismManagerRef.current.organisms.get(selectedOrganismId);
			if (!org) return;

			// Snapshot for undo
			organismManagerRef.current.recordAction();

			const [dx, dy, dz] = delta;
			const oldCells = Array.from(org.livingCells);
			const newCells: Array<[number, number, number]> = [];

			for (const key of oldCells) {
				const [x, y, z] = parseKey(key);
				const nx = x + dx;
				const ny = y + dy;
				const nz = z + dz;

				if (
					nx < 0 ||
					nx >= gridSize ||
					ny < 0 ||
					ny >= gridSize ||
					nz < 0 ||
					nz >= gridSize
				) {
					// Out of bounds, abort move
					return;
				}
				newCells.push([nx, ny, nz]);
			}

			// Clear old cells from grid
			for (const key of oldCells) {
				const [x, y, z] = parseKey(key);
				gridRef.current.set(x, y, z, false);
			}

			// Set new cells in grid
			for (const [nx, ny, nz] of newCells) {
				gridRef.current.set(nx, ny, nz, true);
			}

			// Update Organism
			org.livingCells = new Set(
				newCells.map(([x, y, z]) => makeKey(x, y, z)),
			);
			org.cytoplasm = computeCytoplasm(org.livingCells, gridSize);
			org.centroid = getCentroid(org.livingCells);

			// Keep community in sync
			_setCommunityInternal(newCells);
			setOrganismsVersion(v => v + 1);
		},
		[
			selectedOrganismId,
			gridSize,
			
			neighborFaces,
			neighborEdges,
			neighborCorners,
		],
	);

	const rotateSelectedOrganism = useCallback(
		(axis: THREE.Vector3, angle: number) => {
			if (!selectedOrganismId) return;
			const org = organismManagerRef.current.organisms.get(selectedOrganismId);
			if (!org || !org.centroid) return;

			// Snapshot for undo
			organismManagerRef.current.recordAction();

			// Map THREE axis and angle to our rotateCells signature
			const axisKey = axis.x !== 0 ? 'x' : axis.y !== 0 ? 'y' : 'z';
			// THREE.js angles are in radians. Our utility expects 90, 180, 270 degrees.
			const degrees = Math.round((angle * 180) / Math.PI);
			// Normalize to 0, 90, 180, 270
			const normalizedDegrees = (((degrees % 360) + 360) % 360);

			if (normalizedDegrees === 0 || normalizedDegrees === 360) return;
			const validAngle = normalizedDegrees as 90 | 180 | 270;

			const oldCells = Array.from(org.livingCells).map(parseKey);
			const rotatedCells = rotateCells(
				oldCells,
				axisKey,
				validAngle,
				org.centroid,
			);

			// Bounds check
			for (const [nx, ny, nz] of rotatedCells) {
				if (
					nx < 0 ||
					nx >= gridSize ||
					ny < 0 ||
					ny >= gridSize ||
					nz < 0 ||
					nz >= gridSize
				) {
					return; // Out of bounds, abort
				}
			}

			// Clear old cells
			for (const cell of oldCells) {
				const [x, y, z] = cell;
				gridRef.current.set(x, y, z, false);
			}

			// Set new cells
			for (const cell of rotatedCells) {
				const [nx, ny, nz] = cell;
				gridRef.current.set(nx, ny, nz, true);
			}

			// Update Organism
			org.livingCells = new Set(
				rotatedCells.map(([x, y, z]) => makeKey(x, y, z)),
			);
			org.cytoplasm = computeCytoplasm(org.livingCells, gridSize);
			org.centroid = getCentroid(org.livingCells);

			// Keep community in sync
			_setCommunityInternal(rotatedCells);
			setOrganismsVersion(v => v + 1);
		},
		[
			selectedOrganismId,
			gridSize,
			
			neighborFaces,
			neighborEdges,
			neighborCorners,
		],
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
			organisms: organismManagerRef.current.organisms,
			organismsVersion,
			selectedOrganismId,
			showCytoplasm,
			showSkin,
			enableOrganisms,
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
			setSelectedOrganismId,
			disorganizeOrganism,
			selectOrganism,
			snapToOrientation,
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
			moveSelectedOrganism,
			rotateSelectedOrganism,
			setShowCytoplasm,
			setShowSkin,
			setEnableOrganisms,
		},
		meta: {
			gridRef,
			initialStateRef,
			cameraTargetRef,
			cameraActionsRef,
			eventBus: eventBusRef.current,
			movement,
			velocity,
			organismsRef: organismManagerRef as any,
		},
	};

	// --- DIAGNOSTIC ATTACHMENT ---
	useEffect(() => {
		(window as any).dumpSimulationState = () => {
			const state = {
				gridSize: value.state.gridSize,
				organisms: Array.from(organismManagerRef.current.organisms.entries()).map(([id, org]) => ({
					id,
					centroid: org.centroid,
					travelVector: org.travelVector,
					livingCells: Array.from(org.livingCells),
					outOfBounds: Array.from(org.livingCells).filter(key => {
						const [x, y, z] = parseKey(key);
						return x < 0 || x >= value.state.gridSize || y < 0 || y >= value.state.gridSize || z < 0 || z >= value.state.gridSize;
					})
				})),
				gridInfo: {
					size: gridRef.current.size,
					generation: gridRef.current.generation,
				}
			};
			console.log('--- SIMULATION DIAGNOSTIC DUMP ---');
			console.log(JSON.stringify(state, null, 2));
			console.log('---------------------------------');
			return 'Simulation state dumped to console. Please copy and paste above JSON.';
		};
	}, [value.state.gridSize, organismsVersion]);

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
