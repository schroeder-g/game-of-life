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
	getCentroid,
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
const WALL_REPULSION_RADIUS = 3; // Cells away from wall to start avoiding

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
	(x, y, z) => [x, -y, -z],  // 180° around X
	(x, y, z) => [-x, y, -z],  // 180° around Y
	(x, y, z) => [-x, -y, z],  // 180° around Z
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
	currentOrgCells: Set<string>, // The organism's current living cells in the grid
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
		if (grid.get(x, y, z) && !proposedSet.has(k) && !currentOrgCells.has(k)) return false;
	}

	// Compute proposed cytoplasm and check it
	const proposedLivingSet = proposedSet;
	const proposedCyto = computeCytoplasm(
		proposedLivingSet,
		gridSize,
	);

	for (const cytoKey of proposedCyto) {
		const [cx, cy, cz] = parseKey(cytoKey);
		// Boundary avoidance: cytoplasm must stay strictly within [1, gridSize-2]
		if (cx <= 0 || cx >= gridSize - 1 || cy <= 0 || cy >= gridSize - 1 || cz <= 0 || cz >= gridSize - 1)
			return false;
		// Cytoplasm must not overlap any living cell outside this organism
		if (grid.get(cx, cy, cz) && !proposedLivingSet.has(cytoKey) && !currentOrgCells.has(cytoKey)) return false;
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
): Set<string> {
	const result = new Set<string>();
	const queue: string[] = [seedKey];
	const visited = new Set<string>();

	visited.add(seedKey);

	while (queue.length > 0) {
		const key = queue.shift()!;
		if (!searchSpace.has(key)) continue;

		result.add(key);

		const [x, y, z] = parseKey(key);
		// Iterate through all 26 neighbors
		for (let dz = -1; dz <= 1; dz++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0 && dz === 0) continue;

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
 * Calculates a score representing the minimum distance from ANY living cell to any wall.
 * This is "shell-aware" avoidance because it notices when a limb is close to the boundary.
 */
export function getShellSafetyScore(cells: Array<[number, number, number]>, gridSize: number): number {
	if (cells.length === 0) return gridSize;
	let minX = gridSize, maxX = 0;
	let minY = gridSize, maxY = 0;
	let minZ = gridSize, maxZ = 0;
	
	for (const [x, y, z] of cells) {
		if (x < minX) minX = x;
		if (x > maxX) maxX = x;
		if (y < minY) minY = y;
		if (y > maxY) maxY = y;
		if (z < minZ) minZ = z;
		if (z > maxZ) maxZ = z;
	}

	return Math.min(
		minX, gridSize - 1 - maxX,
		minY, gridSize - 1 - maxY,
		minZ, gridSize - 1 - maxZ
	);
}

/**
 * Calculates a high-precision score for a "Safe Lunge".
 * Priority 1: Minimum body clearance (must not be 0).
 * Priority 2: Centroid distance from nearest wall (pushing bulk inland).
 */
function getSafeLungeScore(cells: Array<[number, number, number]>, gridSize: number): number {
	if (cells.length === 0) return 0;
	
	const minClearance = getShellSafetyScore(cells, gridSize);
	const centroid = getCentroid(cells);
	
	// Distance of centroid to nearest wall
	const centroidDist = Math.min(
		centroid[0], gridSize - 1 - centroid[0],
		centroid[1], gridSize - 1 - centroid[1],
		centroid[2], gridSize - 1 - centroid[2]
	);

	// Priority 1: Shell clearance (x100)
	// Priority 2: Centroid distance (tie-breaker)
	return (minClearance * 100) + centroidDist;
}

/**
 * Calculates a high-precision score for comparing two positions.
 * Priority 1: Minimum body clearance (coarse).
 * Priority 2: Average body distance from walls (fine-grained "torque").
 * This ensures organisms pivot their bulk away from walls even during ties.
 */
function getWeightedSafetyScore(cells: Array<[number, number, number]>, gridSize: number): number {
	if (cells.length === 0) return 0;
	
	const minDist = getShellSafetyScore(cells, gridSize);
	
	// Calculate average distance to nearest wall for all cells
	let totalDist = 0;
	for (const [x, y, z] of cells) {
		const d = Math.min(
			x, gridSize - 1 - x,
			y, gridSize - 1 - y,
			z, gridSize - 1 - z
		);
		totalDist += d;
	}
	const avgDist = totalDist / cells.length;

	// Scale minDist by 100 to make it the primary sort key
	return (minDist * 100) + avgDist;
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
		const previousCentroid = organism.centroid || getCentroid(organism.livingCells);

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
					potentialNewLivingCells,
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
		);

		// Step 3: Check for skin breach
		// A breach occurs if any cytoplasm cell is alive in the grid and
		// was NOT part of this organism's territory (foreigner).
		// Internal splitting/shedding does NOT trigger a dissolve.
		let breached = false;
		for (const cytoKey of newCytoplasm) {
			if (
				allLivingKeys.has(cytoKey) && 
				!newLivingCells.has(cytoKey) && 
				!organismTerritory.has(cytoKey)
			) {
				breached = true;
				break;
			}
		}

		if (breached) {
			// Dissolve organism if a true foreigner enters the moat
			continue;
		}

		let currentCells: Array<[number, number, number]> = Array.from(newLivingCells).map(parseKey);
		let currentLivingSet = newLivingCells;
		let currentCytoplasm = newCytoplasm;

		// Unified Step 4 & 5: Safe Lunge (Combined Translation + Rotation)
		// Triggered if too close to wall or if a breach is detected.
		const currentShellScore = getShellSafetyScore(currentCells, gridSize);
		const needsManoeuvre = (() => {
			if (currentShellScore < WALL_REPULSION_RADIUS) return true;
			for (const cytoKey of currentCytoplasm) {
				if (allLivingKeys.has(cytoKey) && !newLivingCells.has(cytoKey)) return true;
				const [cx, cy, cz] = parseKey(cytoKey);
				if (cx <= 0 || cx >= gridSize - 1 || cy <= 0 || cy >= gridSize - 1 || cz <= 0 || cz >= gridSize - 1)
					return true;
			}
			return false;
		})();

		if (needsManoeuvre) {
			const currentLungeScore = getSafeLungeScore(currentCells, gridSize);
			const candidates: Array<{ cells: Array<[number, number, number]>, score: number }> = [];

			// Identity rotation function
			const IDENTITY = (x: number, y: number, z: number) => [x, y, z] as [number, number, number];
			const allRotFns = [IDENTITY, ...ROTATIONS];

			// Evaluate all combinations of 7 rotations and 27 translations (189 total)
			for (const rotFn of allRotFns) {
				const rotatedBase = rotateCellsAroundCentroid(currentCells, rotFn);
				for (const [dx, dy, dz] of [[0, 0, 0], ...UNIT_OFFSETS]) {
					const lunged = translateCells(rotatedBase, dx as number, dy as number, dz as number);
					
					if (isPositionValid(lunged, id, grid, organisms, gridSize, neighborFaces, neighborEdges, neighborCorners, currentLivingSet)) {
						let score = getSafeLungeScore(lunged, gridSize);
						// Add a "Novelty Bonus" for any orientation change to break wall-fluttering ties
						if (rotFn !== IDENTITY) {
							score += 0.05;
						}
						candidates.push({ cells: lunged, score });
					}
				}
			}

			if (candidates.length > 0) {
				candidates.sort((a, b) => b.score - a.score);
				// High-intelligence choice: Pick the absolute best lunge-turn.
				// If tied, pick randomly among best to allow fluid movement.
				const bestScore = candidates[0].score;
				if (bestScore > currentLungeScore || (Math.abs(bestScore - currentLungeScore) < 0.01)) {
					const bestCandidates = candidates.filter(c => Math.abs(c.score - bestScore) < 0.01);
					const chosen = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];

					// Apply the move
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
					currentCytoplasm = computeCytoplasm(currentLivingSet, gridSize);
				}
			}
		}

		// Recompute skin color and wall distance from updated cell positions
		const skinColor = computeSkinColor(currentLivingSet, gridSize);
		const minWallDistance = getShellSafetyScore(currentCells, gridSize);
		const currentCentroid = getCentroid(currentCells);

		// Compute travel vector (normalized direction of movement)
		let travelVector = organism.travelVector || [0, 0, 1]; // Default to Forward if never moved
		const dx = currentCentroid[0] - previousCentroid[0];
		const dy = currentCentroid[1] - previousCentroid[1];
		const dz = currentCentroid[2] - previousCentroid[2];
		const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);

		if (mag > 0.05) {
			// Significant movement occurred
			travelVector = [dx / mag, dy / mag, dz / mag];
		}

		updatedOrganisms.set(id, {
			...organism,
			livingCells: currentLivingSet,
			cytoplasm: currentCytoplasm,
			skinColor,
			previousLivingCells: new Set(currentLivingSet), // Store the current livingCells for the next tick's processing
			minWallDistance,
			centroid: currentCentroid,
			travelVector: travelVector as [number, number, number],
		});
	}

	return { updatedOrganisms, gridMutations };
}
