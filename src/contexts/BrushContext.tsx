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
import { OrganismBrush, makeKey, parseKey, Organism, OrganismRules } from '../core/Organism'; // Import OrganismBrush, makeKey, parseKey, Organism, OrganismRules
import { useSimulation } from './SimulationContext'; // Import useSimulation
import { STANDARD_ORGANISM_BRUSHES } from '../data/standard-organisms'; // Import standard brushes

// Default rules for organisms, consistent with deserializeOrganism
const DEFAULT_ORGANISM_RULES: OrganismRules = {
	surviveMin: 4,
	surviveMax: 5,
	birthMin: 5,
	birthMax: 5,
	birthMargin: 0,
	neighborFaces: true,
	neighborEdges: true,
	neighborCorners: false,
};

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
	selectedOrganismBrushRules: OrganismRules | null; // Added for selected organism brush rules
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
	selectOrganismBrush: (id: string | null, brush?: OrganismBrush) => void;
}

export interface BrushContextValue {
	state: BrushState;
	actions: BrushActions;
}

export const BrushContext = createContext<BrushContextValue | null>(null);

export function BrushProvider({ children }: { children: ReactNode }) {
	const { state: { gridSize } } = useSimulation(); // Get gridSize from SimulationContext

	const [selectedShape, setSelectedShape] =
		useState<ShapeType>('Single Cell');
	const [shapeSize, setShapeSize] = useState<number>(1);
	const [isHollow, setIsHollow] = useState<boolean>(false);
	const [showProjectionGuides, setShowProjectionGuides] =
		useState<boolean>(true);
	const [selectorPos, setSelectorPos] = useState<
		[number, number, number] | null
	>(null); // Initialized to null, will be set to grid center when an organism brush is selected
	const [brushRotationVersion, setBrushRotationVersion] =
		useState<number>(0);
	const [shapeSelectionVersion, setShapeSelectionVersion] =
		useState<number>(0);
	const [customOffsets, setCustomOffsets] = useState<
		[number, number, number][]
	>([]);
	const [paintMode, setPaintMode] = useState<1 | 0 | -1>(0); // 1: Toggle, 0: Idle, -1: Clear
	const [selectedOrganismBrushRules, setSelectedOrganismBrushRules] = useState<OrganismRules | null>(null); // State for selected organism brush rules
	const brushQuaternion = useRef(new THREE.Quaternion());

	// Persistent state for organism brushes
	const [organismBrushesArray, setOrganismBrushesArray] = usePersistentState<
		OrganismBrush[]
	>(
		'gol_organism_brush_collection_v5', 
		[]
	);

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
					typeof b === 'object' && 
					b !== null && 
					typeof b.id === 'string' && 
					typeof b.name === 'string' &&
					Array.isArray(b.cells) &&
					typeof b.rules === 'object' &&
					b.rules !== null
			);

			// Combine standard brushes with persistent user brushes
			const allBrushes = [...STANDARD_ORGANISM_BRUSHES, ...validBrushes];
			return new Map(allBrushes.map(b => [b.id, b]));
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
		usePersistentState<string | null>('gol_selected_organism_brush_v5', null);

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
				// Set shape to 'Organism Brush'
				setSelectedShape('Organism Brush');
				// Set selector position to the center of the grid when an organism brush is selected
				setSelectorPos([
					Math.floor(gridSize / 2),
					Math.floor(gridSize / 2),
					Math.floor(gridSize / 2),
				]);
				// Only set customOffsets and rules if they haven't been set by selectOrganismBrush already
				// This avoids redundant updates and ensures consistency.
				if (customOffsets.length === 0 || selectedOrganismBrushRules === null) {
					setCustomOffsets(brush.cells);
					setSelectedOrganismBrushRules(brush.rules); // Set rules from the selected brush
				}
				// Organism brushes don't use shapeSize or isHollow, but we might want to set rules
				// For now, we just ensure they are not active.
				setShapeSize(1);
				setIsHollow(false);
			} else {
				// If selected organism brush is no longer valid, clear it
				_setSelectedOrganismBrushId(null);
				setSelectedShape('Single Cell'); // Default to single cell
				setCustomOffsets([]);
				setSelectedOrganismBrushRules(null); // Clear rules
				setSelectorPos(null); // Clear selector position
			}
		} else if (selectedShape === 'Organism Brush') {
			// If no organism brush is selected but shape is 'Organism Brush', reset
			setSelectedShape('Single Cell');
			setCustomOffsets([]);
			setSelectedOrganismBrushRules(null); // Clear rules
			setSelectorPos(null); // Clear selector position
		}
	}, [selectedOrganismBrushId, organismBrushes, selectedShape, setCustomOffsets, setSelectedShape, setShapeSize, setIsHollow, _setSelectedOrganismBrushId, setSelectedOrganismBrushRules, gridSize, setSelectorPos]);

	const addOrganismBrush = useCallback(
		(brush: OrganismBrush) => {
			setOrganismBrushesArray(prevBrushesArray => {
				// Ensure prevBrushesArray is an array before mapping
				const safePrevBrushesArray = Array.isArray(prevBrushesArray) ? prevBrushesArray : [];
				const prevBrushesMap = new Map(safePrevBrushesArray.map(b => [b.id, b]));
				prevBrushesMap.set(brush.id, brush);
				return Array.from(prevBrushesMap.values());
			});
		},
		[setOrganismBrushesArray],
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
		(id: string | null, brushToSelect?: OrganismBrush) => {
			_setSelectedOrganismBrushId(id);
			if (id) {
				// When an organism brush is selected, set the shape type accordingly
				setSelectedShape('Organism Brush');
				// Set selector position to the center of the grid
				setSelectorPos([
					Math.floor(gridSize / 2),
					Math.floor(gridSize / 2),
					Math.floor(gridSize / 2),
				]);
				// If the brush object is provided, use it directly to set customOffsets and rules
				if (brushToSelect) {
					setCustomOffsets(brushToSelect.cells);
					setSelectedOrganismBrushRules(brushToSelect.rules);
				}
				// The useEffect above will handle setting customOffsets from the brush.cells
				// if brushToSelect is not provided, or if the useEffect runs later.
			} else {
				// If we're deselecting an organism brush, only revert to 'Single Cell'
				// if the current shape was actually 'Organism Brush'.
				if (selectedShape === 'Organism Brush') {
					setSelectedShape('Single Cell');
				}
				setCustomOffsets([]);
				setSelectedOrganismBrushRules(null); // Clear rules
			}
		},
		[_setSelectedOrganismBrushId, setSelectedShape, setSelectorPos, gridSize, setCustomOffsets, setSelectedOrganismBrushRules],
	);

	const saveOrganismAsBrush = useCallback(
		(organism: Organism) => {
			// Calculate relative cell offsets from the organism's centroid
			const communityCells = Array.from(organism.livingCells).map(parseKey);
			if (communityCells.length === 0) return;

			const minX = Math.min(...communityCells.map(c => c[0]));
			const maxX = Math.max(...communityCells.map(c => c[0]));
			const minY = Math.min(...communityCells.map(c => c[1]));
			const maxY = Math.max(...communityCells.map(c => c[1]));
			const minZ = Math.min(...communityCells.map(c => c[2]));
			const maxZ = Math.max(...communityCells.map(c => c[2]));

			const centerX = (minX + maxX) / 2;
			const centerY = (minY + maxY) / 2;
			const centerZ = (minZ + maxZ) / 2;

			const relativeCells = communityCells.map(
				([x, y, z]) =>
					[
						Math.round(x - centerX),
						Math.round(y - centerY),
						Math.round(z - centerZ),
					] as [number, number, number],
			);

			// Ensure organism.rules is defined, use defaults if not
			const organismRules = organism.rules || DEFAULT_ORGANISM_RULES;

			const newBrush: OrganismBrush = {
				id: organism.id, // Use organism's ID as brush ID
				name: organism.name,
				cells: relativeCells,
				rules: { // Group rules under a 'rules' object
					surviveMin: organismRules.surviveMin,
					surviveMax: organismRules.surviveMax,
					birthMin: organismRules.birthMin,
					birthMax: organismRules.birthMax,
					birthMargin: organismRules.birthMargin,
					neighborFaces: organismRules.neighborFaces,
					neighborEdges: organismRules.neighborEdges,
					neighborCorners: organismRules.neighborCorners,
				},
			};
			addOrganismBrush(newBrush);
			selectOrganismBrush(newBrush.id, newBrush); // Select the newly saved brush, passing the brush object directly
		},
		[addOrganismBrush, selectOrganismBrush],
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
			selectedOrganismBrushRules, // Expose selected organism brush rules
		},
		actions: {
			setSelectedShape: (shape: ShapeType) => {
				setShapeSelectionVersion(v => v + 1);
				// When selecting a non-organism shape, clear organism brush rules
				if (shape !== 'Organism Brush') {
					setSelectedOrganismBrushRules(null);
				}
				setSelectedShape(shape);

				// Initialize selector position if it's currently null and we're selecting a valid shape
				if (shape !== 'None' && selectorPos === null) {
					setSelectorPos([
						Math.floor(gridSize / 2),
						Math.floor(gridSize / 2),
						Math.floor(gridSize / 2),
					]);
				}
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
				if (shape !== 'Organism Brush') {
					_setSelectedOrganismBrushId(null);
				}
			},
			setShapeSize,
			setIsHollow,
			setShowProjectionGuides,
			setSelectorPos,
			setPaintMode,
			clearShape: () => {
				setShapeSelectionVersion(v => v + 1);
				setSelectedShape('Single Cell');
				setShapeSize(1);
				setPaintMode(0);
				_setSelectedOrganismBrushId(null); // Clear selected organism brush
				setCustomOffsets([]); // Clear custom offsets
				setSelectedOrganismBrushRules(null); // Clear rules
				setSelectorPos(null); // Clear selector position
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
			saveOrganismAsBrush, // New action
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
