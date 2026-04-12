import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import * as THREE from 'three';
import { usePersistentState } from '../hooks/usePersistentState'; // Import usePersistentState
import { ShapeType, supportsHollow } from '../core/shapes';
import { OrganismBrush, makeKey } from '../core/Organism'; // Import OrganismBrush and makeKey

export interface BrushState {
	selectedShape: ShapeType;
	shapeSize: number;
	isHollow: boolean;
	showProjectionGuides: boolean;
	selectorPos: [number, number, number] | null;
	brushRotationVersion: number;
	shapeSelectionVersion: number;
	brushQuaternion: React.MutableRefObject<THREE.Quaternion>;
	customOffsets: [number, number, number][];
	paintMode: 1 | 0 | -1; // 1: Activate, 0: Idle, -1: Clear
	organismBrushes: Map<string, OrganismBrush>; // Added for organism brushes
	selectedOrganismBrushId: string | null; // Added for selected organism brush
}

export interface BrushActions {
	setSelectedShape: (shape: ShapeType) => void;
	setShapeSize: (size: number) => void;
	setIsHollow: (hollow: boolean) => void;
	setShowProjectionGuides: (show: boolean) => void;
	setSelectorPos: (
		pos:
			| [number, number, number]
			| null
			| ((
					prev: [number, number, number] | null,
			  ) => [number, number, number] | null),
	) => void;
	clearShape: () => void;
	changeSize: (delta: number, maxGridSize: number) => void;
	incrementBrushRotationVersion: () => void;
	setCustomBrush: (cells: [number, number, number][]) => void;
	setPaintMode: (
		mode: 1 | 0 | -1 | ((prev: 1 | 0 | -1) => 1 | 0 | -1),
	) => void;
	addOrganismBrush: (brush: OrganismBrush) => void; // Added action
	removeOrganismBrush: (id: string) => void; // Added action
	setSelectedOrganismBrushId: (id: string | null) => void; // Added action
}

export interface BrushContextValue {
	state: BrushState;
	actions: BrushActions;
}

export const BrushContext = createContext<BrushContextValue | null>(null);

export function BrushProvider({ children }: { children: ReactNode }) {
	const [selectedShape, setSelectedShape] =
		useState<ShapeType>('Single Cell');
	const [shapeSize, setShapeSize] = useState<number>(1);
	const [isHollow, setIsHollow] = useState<boolean>(false);
	const [showProjectionGuides, setShowProjectionGuides] =
		useState<boolean>(true);
	const [selectorPos, setSelectorPos] = useState<
		[number, number, number] | null
	>(null);
	const [brushRotationVersion, setBrushRotationVersion] =
		useState<number>(0);
	const [shapeSelectionVersion, setShapeSelectionVersion] =
		useState<number>(0);
	const [customOffsets, setCustomOffsets] = useState<
		[number, number, number][]
	>([]);
	const [paintMode, setPaintMode] = useState<1 | 0 | -1>(0); // 1: Toggle, 0: Idle, -1: Clear
	const brushQuaternion = useRef(new THREE.Quaternion());

	// Persistent state for organism brushes
	const [organismBrushesArray, setOrganismBrushesArray] = usePersistentState<
		OrganismBrush[]
	>([], 'gol_organism_brushes', {
		serialize: brushes => JSON.stringify(brushes),
		deserialize: json => JSON.parse(json),
	});
	const organismBrushes = useMemo(
		() => new Map(organismBrushesArray.map(b => [b.id, b])),
		[organismBrushesArray],
	);
	const setOrganismBrushes = useCallback(
		(newBrushes: Map<string, OrganismBrush>) => {
			setOrganismBrushesArray(Array.from(newBrushes.values()));
		},
		[setOrganismBrushesArray],
	);

	const [selectedOrganismBrushId, setSelectedOrganismBrushId] =
		usePersistentState<string | null>(null, 'gol_selected_organism_brush');

	// clear hollow when switching to an unsupported shape
	useEffect(() => {
		if (!supportsHollow(selectedShape) && isHollow) {
			setIsHollow(false);
		}
	}, [selectedShape, isHollow]);

	// Ensure selectedOrganismBrushId is valid
	useEffect(() => {
		if (
			selectedOrganismBrushId &&
			!organismBrushes.has(selectedOrganismBrushId)
		) {
			setSelectedOrganismBrushId(null);
		}
	}, [organismBrushes, selectedOrganismBrushId]);

	const addOrganismBrush = useCallback(
		(brush: OrganismBrush) => {
			const newBrushes = new Map(organismBrushes);
			newBrushes.set(brush.id, brush);
			setOrganismBrushes(newBrushes);
		},
		[organismBrushes, setOrganismBrushes],
	);

	const removeOrganismBrush = useCallback(
		(id: string) => {
			const newBrushes = new Map(organismBrushes);
			newBrushes.delete(id);
			setOrganismBrushes(newBrushes);
			if (selectedOrganismBrushId === id) {
				setSelectedOrganismBrushId(null);
			}
		},
		[organismBrushes, setOrganismBrushes, selectedOrganismBrushId],
	);

	const value: BrushContextValue = {
		state: {
			selectedShape,
			shapeSize,
			isHollow,
			showProjectionGuides,
			selectorPos,
			brushRotationVersion,
			shapeSelectionVersion,
			brushQuaternion,
			customOffsets,
			paintMode,
			organismBrushes, // Added to state
			selectedOrganismBrushId, // Added to state
		},
		actions: {
			setSelectedShape: (shape: ShapeType) => {
				setShapeSelectionVersion(v => v + 1);
				setSelectedShape(shape);
				setShapeSize(prev => {
					if (shape === 'Single Cell' || shape === 'None') {
						return 1;
					}
					const minRequired =
						shape === 'Cube' || shape === 'Square' ? 2 : 3;
					if (shape !== 'Selected Community' && prev < minRequired) {
						return minRequired;
					}
					return prev;
				});
				// When selecting a shape, deselect any organism brush
				setSelectedOrganismBrushId(null);
			},
			setShapeSize,
			setIsHollow,
			setShowProjectionGuides,
			setSelectorPos,
			clearShape: () => {
				setShapeSelectionVersion(v => v + 1);
				setSelectedShape('Single Cell');
				setShapeSize(1);
				setPaintMode(0);
				setSelectedOrganismBrushId(null); // Clear selected organism brush
			},
			changeSize: (delta: number, maxGridSize: number) => {
				if (
					selectedShape === 'Single Cell' ||
					selectedShape === 'None' ||
					selectedShape === 'Selected Community'
				)
					return;
				const minRequired =
					selectedShape === 'Cube' || selectedShape === 'Square'
						? 2
						: 3;
				setShapeSize(prev =>
					Math.max(minRequired, Math.min(maxGridSize, prev + delta)),
				);
			},
			incrementBrushRotationVersion: () =>
				setBrushRotationVersion(v => v + 1),
			setCustomBrush: (cells: Array<[number, number, number]>) => {
				if (cells.length === 0) return;

				// Always anchor to the community's own centroid for exact overlap.
				// This ensures the brush perfectly overlaps the cells regardless of where selectorPos is.
				const minX = Math.min(...cells.map(c => c[0]));
				const maxX = Math.max(...cells.map(c => c[0]));
				const minY = Math.min(...cells.map(c => c[1]));
				const maxY = Math.max(...cells.map(c => c[1]));
				const minZ = Math.min(...cells.map(c => c[2]));
				const maxZ = Math.max(...cells.map(c => c[2]));
				const anchorX = Math.round((minX + maxX) / 2);
				const anchorY = Math.round((minY + maxY) / 2);
				const anchorZ = Math.round((minZ + maxZ) / 2);

				// Compute offsets relative to the centroid
				const offsets = cells.map(
					([x, y, z]) =>
						[x - anchorX, y - anchorY, z - anchorZ] as [
							number,
							number,
							number,
						],
				);

				// Move cursor to the centroid so brush renders exactly over the community
				setSelectorPos([anchorX, anchorY, anchorZ]);

				// Reset rotation so no previous brush rotation is applied
				brushQuaternion.current.identity();

				setCustomOffsets(offsets);
				setSelectedShape('Selected Community');
				setSelectedOrganismBrushId(null); // Clear selected organism brush
			},
			setPaintMode,
			addOrganismBrush, // Added action
			removeOrganismBrush, // Added action
			setSelectedOrganismBrushId, // Added action
		},
	};

	useEffect(() => {
		(window as any).brushActions = value.actions;
	}, [value.actions]);

	return (
		<BrushContext.Provider value={value}>
			{children}
		</BrushContext.Provider>
	);
}

export function useBrush() {
	const context = useContext(BrushContext);
	if (!context) {
		throw new Error('useBrush must be used within a BrushProvider');
	}
	return context;
}
