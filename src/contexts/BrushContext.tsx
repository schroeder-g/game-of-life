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
	setCommunityBrush: (cells: [number, number, number][]) => void; // Renamed
	setPaintMode: (
		mode: 1 | 0 | -1 | ((prev: 1 | 0 | -1) => 1 | 0 | -1),
	) => void;
	addOrganismBrush: (brush: OrganismBrush) => void;
	removeOrganismBrush: (id: string) => void;
	selectOrganismBrush: (id: string | null) => void;
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
		deserialize: json => {
			try {
				const parsed = JSON.parse(json);
				return Array.isArray(parsed) ? parsed : [];
			} catch (e) {
				console.error("Failed to parse organism brushes from local storage:", e);
				return [];
			}
		},
	});
	const organismBrushes = useMemo(
		() => {
			// Explicitly ensure organismBrushesArray is an array before attempting to map.
			// This handles cases where `usePersistentState` might return a non-array value
			// that `Array.isArray` might incorrectly identify as an array (e.g., a custom object
			// with a `Symbol.toStringTag` set to 'Array' but no `map` method), or if the
			// line number in the error is misleading and the `if` check is bypassed.
			const safeOrganismBrushesArray = Array.isArray(organismBrushesArray)
				? organismBrushesArray
				: []; // Fallback to an empty array if it's not a true array

			// Filter out any non-object or malformed items before mapping to prevent further errors
			const validBrushes = safeOrganismBrushesArray.filter(
				(b): b is OrganismBrush =>
					typeof b === 'object' && b !== null && 'id' in b && 'cells' in b
			);
			return new Map(validBrushes.map(b => [b.id, b]));
		},
		[organismBrushesArray],
	);
	const setOrganismBrushes = useCallback(
		(newBrushes: Map<string, OrganismBrush>) => {
			setOrganismBrushesArray(Array.from(newBrushes.values()));
		},
		[setOrganismBrushesArray],
	);

	const [selectedOrganismBrushId, _setSelectedOrganismBrushId] =
		usePersistentState<string | null>(null, 'gol_selected_organism_brush');

	// clear hollow when switching to an unsupported shape
	useEffect(() => {
		if (!supportsHollow(selectedShape) && isHollow) {
			setIsHollow(false);
		}
	}, [selectedShape, isHollow]);

	// Ensure selectedOrganismBrushId is valid and update shape/offsets if an organism brush is selected
	useEffect(() => {
		if (selectedOrganismBrushId) {
			const brush = organismBrushes.get(selectedOrganismBrushId);
			if (brush) {
				// Set shape to 'Organism Brush' and custom offsets
				setSelectedShape('Organism Brush');
				setCustomOffsets(brush.cells);
				// Organism brushes don't use shapeSize or isHollow, but we might want to set rules
				// For now, we just ensure they are not active.
				setShapeSize(1);
				setIsHollow(false);
			} else {
				// If selected organism brush is no longer valid, clear it
				_setSelectedOrganismBrushId(null);
				setSelectedShape('Single Cell'); // Default to single cell
				setCustomOffsets([]);
			}
		} else if (selectedShape === 'Organism Brush') {
			// If no organism brush is selected but shape is 'Organism Brush', reset
			setSelectedShape('Single Cell');
			setCustomOffsets([]);
		}
	}, [selectedOrganismBrushId, organismBrushes, selectedShape, setCustomOffsets, setSelectedShape, setShapeSize, setIsHollow, _setSelectedOrganismBrushId]);

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
				_setSelectedOrganismBrushId(null);
			}
		},
		[organismBrushes, setOrganismBrushes, selectedOrganismBrushId],
	);

	const selectOrganismBrush = useCallback(
		(id: string | null) => {
			_setSelectedOrganismBrushId(id);
			if (id) {
				// When an organism brush is selected, set the shape type accordingly
				setSelectedShape('Organism Brush');
				// The useEffect above will handle setting customOffsets from the brush.cells
			} else {
				// If no organism brush is selected, revert to default shape
				setSelectedShape('Single Cell');
				setCustomOffsets([]);
			}
		},
		[_setSelectedOrganismBrushId],
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
			organismBrushes,
			selectedOrganismBrushId,
		},
		actions: {
			setSelectedShape: (shape: ShapeType) => {
				setShapeSelectionVersion(v => v + 1);
				setSelectedShape(shape);
				setShapeSize(prev => {
					if (shape === 'Single Cell' || shape === 'None' || shape === 'Organism Brush') {
						return 1;
					}
					const minRequired =
						shape === 'Cube' || shape === 'Square' ? 2 : 3;
					if (shape !== 'Selected Community' && prev < minRequired) {
						return minRequired;
					}
					return prev;
				});
				// When selecting a standard shape, deselect any organism brush
				_setSelectedOrganismBrushId(null);
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
				_setSelectedOrganismBrushId(null); // Clear selected organism brush
				setCustomOffsets([]); // Clear custom offsets
			},
			changeSize: (delta: number, maxGridSize: number) => {
				if (
					selectedShape === 'Single Cell' ||
					selectedShape === 'None' ||
					selectedShape === 'Selected Community' ||
					selectedShape === 'Organism Brush' // Organism brushes don't change size
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
			setCommunityBrush: (cells: Array<[number, number, number]>) => { // Renamed
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
				_setSelectedOrganismBrushId(null); // Clear selected organism brush
			},
			setPaintMode,
			addOrganismBrush,
			removeOrganismBrush,
			selectOrganismBrush,
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
