/**
 * Pure post-tick organism processing logic.
 *
 * Called after Grid3D.tick() completes and before any repaint.
 * Returns the updated organism map and the grid mutations to apply.
 */

import type { Grid3D } from './Grid3D';
import {
	type Organism,
	computeCytoplasm,
	computeSkinColor,
	makeKey,
	parseKey,
} from './Organism';

interface ProcessOrganismsResult {
	/** Updated organism map (organisms may be dissolved). */
	updatedOrganisms: Map<string, Organism>;
	/**
	 * Grid mutations to apply as [x, y, z, alive] tuples.
	 * Apply all before calling grid.version++.
	 */
	gridMutations: Array<[number, number, number, boolean]>;
}

/**
 * Generates the 26 unit offset vectors for neighbor checks.
 */
function unitOffsets(): Array<[number, number, number]> {
	const offsets: Array<[number, number, number]> = [];
	for (let dz = -1; dz <= 1; dz++) {
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0 && dz === 0) continue;
				offsets.push([dx, dy, dz]);
			}
		}
	}
	return offsets;
}

const UNIT_OFFSETS = unitOffsets();

/** Shuffles an array in-place (Fisher-Yates). Returns the array. */
function shuffle<T>(arr: T[]): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

/**
 * The 6 cardinal 90° rotations as quaternion-equivalent transform functions.
 * Each function takes [x, y, z] relative to origin and returns the rotated coords.
 */
const ROTATIONS: Array<(x: number, y: number, z: number) => [number, number, number]> = [
	(x, y, z) => [x, -z, y],   // +90° around X
	(x, y, z) => [x, z, -y],   // -90° around X
	(x, y, z) => [z, y, -x],   // +90° around Y
	(x, y, z) => [-z, y, x],   // -90° around Y
	(x, y, z) => [-y, x, z],   // +90° around Z
	(x, y, z) => [y, -x, z],   // -90° around Z
];

/**
 * Checks whether a proposed set of organism living cells is valid:
 * - All cells within bounds
 * - No overlap with cells NOT belonging to this organism
 * - Cytoplasm does not overlap with external living cells
 * - Cytoplasm does not extend outside grid (boundary avoidance)
 */
function isPositionValid(
	proposedCells: Array<[number, number, number]>,
	organismId: string,
	grid: Grid3D,
	organisms: Map<string, Organism>,
	gridSize: number,
	neighborFaces: boolean,
	neighborEdges: boolean,
	neighborCorners: boolean,
): boolean {
	const proposedSet = new Set<string>(proposedCells.map(([x, y, z]) => makeKey(x, y, z)));

	// Build a set of all living cells owned by OTHER organisms
	const otherOrgCells = new Set<string>();
	for (const [id, org] of organisms) {
		if (id === organismId) continue;
		for (const k of org.livingCells) otherOrgCells.add(k);
	}

	// Check bounds and non-overlap with other organisms
	for (const [x, y, z] of proposedCells) {
		if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize)
			return false;
		const k = makeKey(x, y, z);
		if (otherOrgCells.has(k)) return false;
		// Also check against any living cell in the grid not owned by this organism
		if (grid.get(x, y, z) && !proposedSet.has(k)) return false;
	}

	// Compute proposed cytoplasm and check it
	const proposedLivingSet = proposedSet;
	const proposedCyto = computeCytoplasm(
		proposedLivingSet,
		gridSize,
		neighborFaces,
		neighborEdges,
		neighborCorners,
	);

	for (const cytoKey of proposedCyto) {
		const [cx, cy, cz] = parseKey(cytoKey);
		// Boundary avoidance: cytoplasm must stay strictly within [1, gridSize-2]
		if (cx <= 0 || cx >= gridSize - 1 || cy <= 0 || cy >= gridSize - 1 || cz <= 0 || cz >= gridSize - 1)
			return false;
		// Cytoplasm must not overlap any living cell outside this organism
		if (grid.get(cx, cy, cz) && !proposedLivingSet.has(cytoKey)) return false;
		if (otherOrgCells.has(cytoKey)) return false;
	}

	return true;
}

/**
 * Applies a translation offset to a set of cell coords.
 */
function translateCells(
	cells: Array<[number, number, number]>,
	dx: number,
	dy: number,
	dz: number,
): Array<[number, number, number]> {
	return cells.map(([x, y, z]) => [x + dx, y + dy, z + dz]);
}

/**
 * Rotates cells around their centroid using the given rotation function.
 * Returns integer-rounded coordinates.
 */
function rotateCellsAroundCentroid(
	cells: Array<[number, number, number]>,
	rotFn: (x: number, y: number, z: number) => [number, number, number],
): Array<[number, number, number]> {
	if (cells.length === 0) return [];

	// Compute centroid
	let cx = 0, cy = 0, cz = 0;
	for (const [x, y, z] of cells) {
		cx += x; cy += y; cz += z;
	}
	cx /= cells.length; cy /= cells.length; cz /= cells.length;

	return cells.map(([x, y, z]) => {
		const [rx, ry, rz] = rotFn(x - cx, y - cy, z - cz);
		return [Math.round(rx + cx), Math.round(ry + cy), Math.round(rz + cz)];
	});
}

/**
 * Finds a single flood-fill connected component of living cells starting from a seed.
 * Only considers cells present in `searchSpace`.
 */
function getConnectedComponent(
	seedKey: string,
	searchSpace: Set<string>, // The set of keys to search within (e.g., potentialNewLivingCells)
	neighborFaces: boolean,
	neighborEdges: boolean,
	neighborCorners: boolean,
): Set<string> {
	const result = new Set<string>();
	const queue: string[] = [seedKey];
	const visited = new Set<string>(); // Track visited keys to prevent infinite loops and redundant processing

	visited.add(seedKey);

	while (queue.length > 0) {
		const key = queue.shift()!; // Use shift for BFS, pop for DFS. BFS is generally better for shortest path/component finding.
		if (!searchSpace.has(key)) continue; // Only process if it's in the search space

		result.add(key);

		const [x, y, z] = parseKey(key);
		// Iterate through neighbors
		for (let dz = -1; dz <= 1; dz++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0 && dz === 0) continue;
					const sum = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
					if (sum === 1 && !neighborFaces) continue;
					if (sum === 2 && !neighborEdges) continue;
					if (sum === 3 && !neighborCorners) continue;

					const nk = makeKey(x + dx, y + dy, z + dz);
					if (searchSpace.has(nk) && !visited.has(nk)) {
						visited.add(nk);
						queue.push(nk);
					}
				}
			}
		}
	}
	return result;
}

/**
 * Main post-tick organism processing. Pure function — no side effects on grid.
 * Returns updated organism map and list of grid mutations to apply.
 */
export function processOrganisms(
	grid: Grid3D,
	organisms: Map<string, Organism>,
	gridSize: number,
	neighborFaces: boolean,
	neighborEdges: boolean,
	neighborCorners: boolean,
): ProcessOrganismsResult {
	const updatedOrganisms = new Map<string, Organism>();
	const gridMutations: Array<[number, number, number, boolean]> = [];

	// Build current live-cell set from grid
	const allLivingKeys = new Set<string>();
	for (let z = 0; z < gridSize; z++) {
		for (let y = 0; y < gridSize; y++) {
			for (let x = 0; x < gridSize; x++) {
				if (grid.get(x, y, z)) allLivingKeys.add(makeKey(x, y, z));
			}
		}
	}

	for (const [id, organism] of organisms) {
		// Define the organism's "territory" from the previous generation
		// This includes its previous living cells AND its previous cytoplasm
		const organismTerritory = new Set<string>([
			...organism.livingCells, // These are the living cells from the *previous* tick
			...organism.cytoplasm,   // This is the cytoplasm from the *previous* tick
		]);

		// Filter `allLivingKeys` (all live cells in the grid after the tick)
		// to only include cells that are within the organism's previous territory.
		const potentialNewLivingCells = new Set<string>();
		for (const key of allLivingKeys) {
			if (organismTerritory.has(key)) {
				potentialNewLivingCells.add(key);
			}
		}

		let largestComponent: Set<string> = new Set();
		let visitedForComponents = new Set<string>(); // To track cells already processed into a component

		// Find all connected components within potentialNewLivingCells and pick the largest
		for (const seedKey of potentialNewLivingCells) {
			if (!visitedForComponents.has(seedKey)) { // If this cell hasn't been part of a component yet
				const component = getConnectedComponent(
					seedKey,
					potentialNewLivingCells, // Pass potentialNewLivingCells as the set to search within
					neighborFaces,
					neighborEdges,
					neighborCorners,
				);
				if (component.size > largestComponent.size) {
					largestComponent = component;
				}
				// Mark all cells in this component as visited to avoid re-processing
				component.forEach(k => visitedForComponents.add(k));
			}
		}

		const newLivingCells = largestComponent; // This is the new set of living cells for the organism

		if (newLivingCells.size === 0) {
			// Organism has no surviving cells within its territory — dissolve
			continue;
		}

		// Step 2: Recalculate cytoplasm
		const newCytoplasm = computeCytoplasm(
			newLivingCells,
			gridSize,
			neighborFaces,
			neighborEdges,
			neighborCorners,
		);

		// Step 3: Check for skin breach
		// A breach occurs if any cytoplasm cell is alive in the grid and
		// not part of THIS organism's living cells.
		let breached = false;
		for (const cytoKey of newCytoplasm) {
			if (allLivingKeys.has(cytoKey) && !newLivingCells.has(cytoKey)) {
				breached = true;
				break;
			}
		}

		if (breached) {
			// Dissolve organism, do not juke or rotate
			continue;
		}

		// Step 4: Check if juke is needed
		// A juke is needed if cytoplasm overlaps any external living cell
		const jukeNeeded = (() => {
			for (const cytoKey of newCytoplasm) {
				if (allLivingKeys.has(cytoKey) && !newLivingCells.has(cytoKey)) return true;
			}
			return false;
		})();

		let currentCells: Array<[number, number, number]> = Array.from(newLivingCells).map(parseKey);
		let currentLivingSet = newLivingCells;
		let currentCytoplasm = newCytoplasm;
		let didJuke = false;

		if (jukeNeeded) {
			// Try all 26 unit offsets, prefer ones that also allow a rotation
			const shuffledOffsets = shuffle([...UNIT_OFFSETS]);

			// For each candidate juke, check if any rotation would also be valid
			const validJukes: Array<{
				offset: [number, number, number];
				allowsRotation: boolean;
				cells: Array<[number, number, number]>;
			}> = [];

			for (const [dx, dy, dz] of shuffledOffsets) {
				const proposed = translateCells(currentCells, dx, dy, dz);
				if (
					isPositionValid(
						proposed,
						id,
						grid,
						organisms,
						gridSize,
						neighborFaces,
						neighborEdges,
						neighborCorners,
					)
				) {
					// Check if any rotation is valid from this juke position
					const shuffledRots = shuffle([...ROTATIONS]);
					let allowsRotation = false;
					for (const rotFn of shuffledRots) {
						const rotated = rotateCellsAroundCentroid(proposed, rotFn);
						if (
							isPositionValid(
								rotated,
								id,
								grid,
								organisms,
								gridSize,
								neighborFaces,
								neighborEdges,
								neighborCorners,
							)
						) {
							allowsRotation = true;
							break;
						}
					}
					validJukes.push({ offset: [dx, dy, dz], allowsRotation, cells: proposed });
				}
			}

			if (validJukes.length === 0) {
				// No valid juke — dissolve
				continue;
			}

			// Prefer jukes that allow a rotation
			const rotationAllowingJukes = validJukes.filter(j => j.allowsRotation);
			const chosen =
				rotationAllowingJukes.length > 0
					? rotationAllowingJukes[Math.floor(Math.random() * rotationAllowingJukes.length)]
					: validJukes[Math.floor(Math.random() * validJukes.length)];

			// Apply juke: queue mutations
			for (const k of currentLivingSet) {
				const [x, y, z] = parseKey(k);
				gridMutations.push([x, y, z, false]);
				allLivingKeys.delete(k);
			}
			for (const [x, y, z] of chosen.cells) {
				gridMutations.push([x, y, z, true]);
				allLivingKeys.add(makeKey(x, y, z));
			}

			currentCells = chosen.cells;
			currentLivingSet = new Set(currentCells.map(([x, y, z]) => makeKey(x, y, z)));
			currentCytoplasm = computeCytoplasm(
				currentLivingSet,
				gridSize,
				neighborFaces,
				neighborEdges,
				neighborCorners,
			);
			didJuke = true;
		}

		// Step 5: Random rotation (attempted whether or not a juke occurred)
		const shuffledRots = shuffle([...ROTATIONS]);
		for (const rotFn of shuffledRots) {
			const rotated = rotateCellsAroundCentroid(currentCells, rotFn);
			if (
				isPositionValid(
					rotated,
					id,
					grid,
					organisms,
					gridSize,
					neighborFaces,
					neighborEdges,
					neighborCorners,
				)
			) {
				// Apply rotation
				for (const k of currentLivingSet) {
					const [x, y, z] = parseKey(k);
					gridMutations.push([x, y, z, false]);
					allLivingKeys.delete(k);
				}
				for (const [x, y, z] of rotated) {
					gridMutations.push([x, y, z, true]);
					allLivingKeys.add(makeKey(x, y, z));
				}
				currentCells = rotated;
				currentLivingSet = new Set(currentCells.map(([x, y, z]) => makeKey(x, y, z)));
				currentCytoplasm = computeCytoplasm(
					currentLivingSet,
					gridSize,
					neighborFaces,
					neighborEdges,
					neighborCorners,
				);
				break;
			}
		}

		// Recompute skin color from updated cell positions
		const skinColor = computeSkinColor(currentLivingSet, gridSize);

		updatedOrganisms.set(id, {
			...organism,
			livingCells: currentLivingSet,
			cytoplasm: currentCytoplasm,
			skinColor,
			previousLivingCells: organism.livingCells, // Store the current livingCells for the next tick's processing
		});
	}

	return { updatedOrganisms, gridMutations };
}
