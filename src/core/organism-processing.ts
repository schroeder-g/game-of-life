/**
 * Pure post-tick organism processing logic.
 */

import type { Grid3D } from './Grid3D';
import * as THREE from 'three';
import {
	type Organism,
	computeCytoplasm,
	computeSkinColor,
	makeKey,
	parseKey,
	getCentroid,
	rotateVector,
	rotateCells,
} from './Organism';

const AVOIDANCE_LOOK_AHEAD_DISTANCE = 4; // Cells


interface ProcessOrganismsResult {
	updatedOrganisms: Map<string, Organism>;
	gridMutations: Array<[number, number, number, boolean]>;
}

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

/** Standard validator: ensures cells stay within bounds and do not collide with other organisms. */
function isPositionValid(
	proposedCells: Array<[number, number, number]>,
	otherOrgCells: Set<string>,
	gridSize: number,
): boolean {
	const proposedSet = new Set<string>(proposedCells.map(([x,y,z]) => makeKey(x,y,z)));

	for (const [x, y, z] of proposedCells) {
		if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize)
			return false;
		const k = makeKey(x, y, z);
		if (otherOrgCells.has(k)) return false;
	}

	const proposedCyto = computeCytoplasm(proposedSet, gridSize);
	for (const cytoKey of proposedCyto) {
		const [cx, cy, cz] = parseKey(cytoKey);
		if (cx < 0 || cx >= gridSize || cy < 0 || cy >= gridSize || cz < 0 || cz >= gridSize)
			return false;
		if (otherOrgCells.has(cytoKey)) return false;
	}

	return true;
}

function translateCells(cells: Array<[number, number, number]>, dx: number, dy: number, dz: number): Array<[number, number, number]> {
	return cells.map(([x, y, z]) => [Math.round(x + dx), Math.round(y + dy), Math.round(z + dz)]);
}

function getConnectedComponent(seedKey: string, searchSpace: Set<string>): Set<string> {
	const result = new Set<string>();
	const queue: string[] = [seedKey];
	const visited = new Set<string>([seedKey]);
	while (queue.length > 0) {
		const key = queue.shift()!;
		if (!searchSpace.has(key)) continue;
		result.add(key);
		const [x, y, z] = parseKey(key);
		for (const [dx, dy, dz] of UNIT_OFFSETS) {
			const nk = makeKey(x + dx, y + dy, z + dz);
			if (searchSpace.has(nk) && !visited.has(nk)) {
				visited.add(nk);
				queue.push(nk);
			}
		}
	}
	return result;
}

// Replaces the old getOverlapNormal function
function getAvoidanceNormal(
    livingCells: Array<[number, number, number]>,
    cytoplasm: Set<string>, // current cytoplasm
    travelVector: [number, number, number],
    gridSize: number,
    otherOrgExclusionZone: Set<string>,
    lookAheadDistance: number,
): [number, number, number] {
    let totalNormal: [number, number, number] = [0, 0, 0];
    let collisionDetected = false;

    // Helper to add to totalNormal and set collisionDetected
    const addNormalComponent = (component: [number, number, number]) => {
        totalNormal[0] += component[0];
        totalNormal[1] += component[1];
        totalNormal[2] += component[2];
        collisionDetected = true;
    };

    // --- Reactive Collision Detection (Current Position) ---

    // 1. Immediate Wall Overlap
    let currentWallOverlapTempNormal: [number, number, number] = [0, 0, 0];
    let currentWallOverlap = false;
    for (const key of cytoplasm) {
        const [x, y, z] = parseKey(key);
        if (x <= 0) { currentWallOverlapTempNormal[0] -= 1; currentWallOverlap = true; }
        if (x >= gridSize - 1) { currentWallOverlapTempNormal[0] += 1; currentWallOverlap = true; }
        if (y <= 0) { currentWallOverlapTempNormal[1] -= 1; currentWallOverlap = true; }
        if (y >= gridSize - 1) { currentWallOverlapTempNormal[1] += 1; currentWallOverlap = true; }
        if (z <= 0) { currentWallOverlapTempNormal[2] -= 1; currentWallOverlap = true; }
        if (z >= gridSize - 1) { currentWallOverlapTempNormal[2] += 1; currentWallOverlap = true; }
    }
    if (currentWallOverlap) {
        const len = Math.sqrt(currentWallOverlapTempNormal[0]*currentWallOverlapTempNormal[0] + currentWallOverlapTempNormal[1]*currentWallOverlapTempNormal[1] + currentWallOverlapTempNormal[2]*currentWallOverlapTempNormal[2]);
        if (len > 0) {
            addNormalComponent([currentWallOverlapTempNormal[0]/len, currentWallOverlapTempNormal[1]/len, currentWallOverlapTempNormal[2]/len]);
        }
    }

    // 2. Immediate Other Organism Overlap
    const currentExtendedBody = new Set<string>(livingCells.map(c => makeKey(...c)));
    cytoplasm.forEach(k => currentExtendedBody.add(k));
    for (const key of currentExtendedBody) {
        if (otherOrgExclusionZone.has(key)) {
            // Immediate collision with another organism. Repel strongly.
            // A simple repulsion: away from the grid center, or opposite to travel vector if at center.
            const [x, y, z] = parseKey(key);
            const center = gridSize / 2;
            const repelX = x - center;
            const repelY = y - center;
            const repelZ = z - center;
            const len = Math.sqrt(repelX*repelX + repelY*repelY + repelZ*repelZ);
            if (len > 0) {
                addNormalComponent([-repelX/len, -repelY/len, -repelZ/len]);
            } else { // If at center, just push back along travel vector
                addNormalComponent([-travelVector[0], -travelVector[1], -travelVector[2]]);
            }
            // No break here, as multiple points of contact might contribute to the total normal
        }
    }

    // --- Proactive Collision Detection (Look Ahead) ---
    for (let i = 1; i <= lookAheadDistance; i++) {
        const proposedDx = travelVector[0] * i;
        const proposedDy = travelVector[1] * i;
        const proposedDz = travelVector[2] * i;

        const translatedCells = translateCells(livingCells, proposedDx, proposedDy, proposedDz);
        const translatedCytoplasm = computeCytoplasm(new Set(translatedCells.map(c => makeKey(...c))), gridSize);

        // Proactive Wall Collision
        let proactiveWallTempNormal: [number, number, number] = [0, 0, 0];
        let proactiveWallHit = false;
        for (const key of translatedCytoplasm) {
            const [x, y, z] = parseKey(key);
            if (x < 0) { proactiveWallTempNormal[0] -= 1; proactiveWallHit = true; }
            if (x >= gridSize) { proactiveWallTempNormal[0] += 1; proactiveWallHit = true; }
            if (y < 0) { proactiveWallTempNormal[1] -= 1; proactiveWallHit = true; }
            if (y >= gridSize) { proactiveWallTempNormal[1] += 1; proactiveWallHit = true; }
            if (z < 0) { proactiveWallTempNormal[2] -= 1; proactiveWallHit = true; }
            if (z >= gridSize) { proactiveWallTempNormal[2] += 1; proactiveWallHit = true; }
        }
        if (proactiveWallHit) {
            const len = Math.sqrt(proactiveWallTempNormal[0]*proactiveWallTempNormal[0] + proactiveWallTempNormal[1]*proactiveWallTempNormal[1] + proactiveWallTempNormal[2]*proactiveWallTempNormal[2]);
            if (len > 0) {
                addNormalComponent([proactiveWallTempNormal[0]/len, proactiveWallTempNormal[1]/len, proactiveWallTempNormal[2]/len]);
            }
        }

        // Proactive Other Organism Collision
        for (const key of translatedCytoplasm) {
            if (otherOrgExclusionZone.has(key)) {
                // Proactive collision with another organism.
                // Repel in the opposite direction of travel.
                addNormalComponent([-travelVector[0], -travelVector[1], -travelVector[2]]);
                // No break here, as multiple points of contact might contribute to the total normal
            }
        }
    }

    if (collisionDetected) {
        const len = Math.sqrt(totalNormal[0]*totalNormal[0] + totalNormal[1]*totalNormal[1] + totalNormal[2]*totalNormal[2]);
        if (len > 0) {
            return [totalNormal[0]/len, totalNormal[1]/len, totalNormal[2]/len];
        }
    }
    return [0, 0, 0];
}

// Helper to get bounding box dimensions
function getBoundingBoxDimensions(cells: Array<[number, number, number]>): { minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number, largestDim: number } {
	if (cells.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, largestDim: 0 };

	let minX = Infinity, maxX = -Infinity;
	let minY = Infinity, maxY = -Infinity;
	let minZ = Infinity, maxZ = -Infinity;

	for (const [x, y, z] of cells) {
		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x);
		minY = Math.min(minY, y);
		maxY = Math.max(maxY, y);
		minZ = Math.min(minZ, z);
		maxZ = Math.max(maxZ, z);
	}

	const dimX = maxX - minX + 1;
	const dimY = maxY - minY + 1;
	const dimZ = maxZ - minZ + 1;
	const largestDim = Math.max(dimX, dimY, dimZ);

	return { minX, maxX, minY, maxY, minZ, maxZ, largestDim };
}

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

	const allLivingKeys = new Set<string>();
	for (let z = 0; z < gridSize; z++) {
		for (let y = 0; y < gridSize; y++) {
			for (let x = 0; x < gridSize; x++) {
				if (grid.get(x, y, z)) allLivingKeys.add(makeKey(x, y, z));
			}
		}
	}

	// NEW: Pre-calculate extended bodies (living cells + cytoplasm) for all organisms
	const allOrganismsExtendedBodies = new Map<string, Set<string>>();
	for (const [id, org] of organisms) {
		const extendedBody = new Set<string>();
		org.livingCells.forEach(key => extendedBody.add(key));
		// Note: org.cytoplasm is already computed and up-to-date from the previous tick,
		// or from organism creation/deserialization.
		org.cytoplasm.forEach(key => extendedBody.add(key));
		allOrganismsExtendedBodies.set(id, extendedBody);
	}

	for (const [id, organism] of organisms) {
		const organismTerritory = new Set<string>([...organism.livingCells, ...organism.cytoplasm]);
		const potentialNewLivingCells = new Set<string>();
		for (const key of allLivingKeys) if (organismTerritory.has(key)) potentialNewLivingCells.add(key);

		let allComps: Array<Set<string>> = [];
		const visitedForComp = new Set<string>();
		for (const seed of potentialNewLivingCells) {
			if (!visitedForComp.has(seed)) {
				const comp = getConnectedComponent(seed, potentialNewLivingCells);
				if (comp.size > 2) allComps.push(comp);
				comp.forEach(k => visitedForComp.add(k));
			}
		}

		if (allComps.length === 0) continue;

		let currentLivingSet = new Set<string>();
		for (const comp of allComps) comp.forEach(k => currentLivingSet.add(k));

		let currentCytoplasm = computeCytoplasm(currentLivingSet, gridSize);
		let currentCells: Array<[number, number, number]> = Array.from(currentLivingSet).map(parseKey);
		let currentCentroid = getCentroid(currentCells);

		// --- DERIVE TRAVEL VECTOR FROM GOL MOVEMENT ---
		let derivedTravelVector: [number, number, number] = organism.travelVector || [0, 0, 1]; // Default if no previous
		if (organism.centroid) {
			const [prevCx, prevCy, prevCz] = organism.centroid;
			const [currCx, currCy, currCz] = currentCentroid;
			const dx = currCx - prevCx;
			const dy = currCy - prevCy;
			const dz = currCz - prevCz;
			const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
			if (len > 0.01) { // Only update if there was significant movement
				derivedTravelVector = [dx / len, dy / len, dz / len];
			}
		}
		let travelVector = derivedTravelVector; // Use this derived vector for wall avoidance logic
		// ----------------------------------------------

		// NEW: Construct the exclusion zone for *this* organism, including living cells and cytoplasm of others
		const otherOrgExclusionZone = new Set<string>();
		for (const [otherOrgId, otherOrgBody] of allOrganismsExtendedBodies) {
			if (otherOrgId !== id) { // Only add bodies of *other* organisms
				otherOrgBody.forEach(k => otherOrgExclusionZone.add(k));
			}
		}

		// --- RULE-BASED NAVIGATION ---
		// Use the new combined avoidance normal function for both reactive and proactive detection
		const avoidanceNormal = getAvoidanceNormal(
			currentCells, // Pass current living cells
			currentCytoplasm,
			travelVector,
			gridSize,
			otherOrgExclusionZone,
			AVOIDANCE_LOOK_AHEAD_DISTANCE,
		);

		if (avoidanceNormal[0] !== 0 || avoidanceNormal[1] !== 0 || avoidanceNormal[2] !== 0) {
			// Diagnostic logs on Wall Encounter
			const v = new THREE.Vector3(...travelVector);
			const n = new THREE.Vector3(...avoidanceNormal);
			const dot = v.dot(n);
			console.log(`[NAV] ID:${id} avoidance: ${avoidanceNormal.map(x=>x.toFixed(2)).join(',')} at Z:[${currentCentroid[2].toFixed(1)}] dot:${dot.toFixed(2)}`);

			let nextCells: Array<[number, number, number]> = [...currentCells];
			let nextVector: [number, number, number] = [...travelVector];
			let moveChosen = false;

			// 1. POINTING AT WALL (dot > 0.15)
			if (dot > 0.15) {
				const previousCells = Array.from(organism.previousLivingCells).map(parseKey);
				
				// Step 1: Start with the organism's previous valid position (or current if no previous)
				// This ensures we revert to a known good state before attempting complex maneuvers.
				let cellsForProcessing = previousCells.length > 0 ? previousCells : currentCells;
				let centroidForRotation = getCentroid(cellsForProcessing);
				let currentTravelVector = [...travelVector]; // Use the current travel vector for rotation

				// Step 2: Determine the rotation needed to point towards the furthest adjacent wall
				const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
				// BUG FIX: Use avoidanceNormal here
				const absNorm = [Math.abs(avoidanceNormal[0]), Math.abs(avoidanceNormal[1]), Math.abs(avoidanceNormal[2])];
				const wallAxisIdx = absNorm.indexOf(Math.max(...absNorm)); // Identify the primary axis of the wall
				const wallAxis = axes[wallAxisIdx];
				const parallelAxes = axes.filter(a => a !== wallAxis); // Axes parallel to the wall

				let bestParallelDirection: [number, number, number] = [0, 0, 0];
				let maxDist = -1;

				// Find the parallel direction that points towards the largest open space
				for (const axis of parallelAxes) {
					const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
					const distPos = (gridSize - 1) - centroidForRotation[idx]; // Distance to positive boundary
					const distNeg = centroidForRotation[idx]; // Distance to negative boundary
					const currentMax = Math.max(distPos, distNeg);
					
					// Prioritize Y-axis (up) for equal or near-equal distances to encourage upward movement
					const weight = (axis === 'y') ? 1.2 : 1.0;
					if (currentMax * weight > maxDist) {
						maxDist = currentMax * weight;
						bestParallelDirection = [0, 0, 0];
						bestParallelDirection[idx] = distPos > distNeg ? 1 : -1; // Set direction (1 or -1)
					}
				}

				console.log(`[NAV] ID:${id} pivoting towards: [${bestParallelDirection.join(',')}] (Dist: ${maxDist.toFixed(1)})`);

				let rotatedCellsCandidate = [...cellsForProcessing];
				let rotatedTravelVectorCandidate = [...currentTravelVector];
				let rotationApplied = false;

				// Attempt to rotate the organism's cells and travel vector
				for (const axis of (['x', 'y', 'z'] as const)) {
					for (const angle of ([90, 270] as const)) { // Only consider 90-degree rotations
						const rv = rotateVector(currentTravelVector as [number, number, number], axis, angle);
						const rvVec = new THREE.Vector3(...rv);
						// Check if the rotated vector aligns with the best parallel direction
						if (rvVec.dot(new THREE.Vector3(...bestParallelDirection)) > 0.6) {
							rotatedCellsCandidate = rotateCells(cellsForProcessing, axis, angle, centroidForRotation);
							rotatedTravelVectorCandidate = rv;
							rotationApplied = true;
							break;
						}
					}
					if (rotationApplied) break;
				}

				// Step 3: Determine if retreat is needed after rotation
				let finalProposedCells = rotatedCellsCandidate;
				// BUG FIX: Check if rotated cells (and their cytoplasm) are within grid boundaries
				// Pass an empty Set for otherOrgExclusionZone to only check against grid boundaries
				let retreatNeeded = !isPositionValid(rotatedCellsCandidate, new Set(), gridSize);

				if (retreatNeeded) {
					console.log(`[NAV] ID:${id} rotated cells (or cytoplasm) are out of bounds, calculating retreat.`);
					// Calculate the precise retreat distance so cytoplasm grazes the wall
					const rotatedCytoplasm = computeCytoplasm(new Set(rotatedCellsCandidate.map(c => makeKey(...c))), gridSize);
					const { minX, maxX, minY, maxY, minZ, maxZ } = getBoundingBoxDimensions(Array.from(rotatedCytoplasm).map(parseKey));

					let retreat_dx = 0, retreat_dy = 0, retreat_dz = 0;

					// Determine the translation needed for each axis based on the avoidanceNormal
					// BUG FIX: Use avoidanceNormal here
					if (avoidanceNormal[0] > 0) retreat_dx = (gridSize - 1) - maxX;
					if (avoidanceNormal[0] < 0) retreat_dx = 0 - minX;

					if (avoidanceNormal[1] > 0) retreat_dy = (gridSize - 1) - maxY;
					if (avoidanceNormal[1] < 0) retreat_dy = 0 - minY;

					if (avoidanceNormal[2] > 0) retreat_dz = (gridSize - 1) - maxZ;
					if (avoidanceNormal[2] < 0) retreat_dz = 0 - minZ;

					// Apply the calculated retreat translation
					finalProposedCells = translateCells(rotatedCellsCandidate, retreat_dx, retreat_dy, retreat_dz);
				} else {
					console.log(`[NAV] ID:${id} rotated cells (and cytoplasm) are in bounds, no retreat needed.`);
				}

				// Step 4: Validate the final proposed position (after rotation and potential retreat)
				if (isPositionValid(finalProposedCells, otherOrgExclusionZone, gridSize)) {
					nextCells = finalProposedCells;
					travelVector = rotatedTravelVectorCandidate as [number, number, number];
					moveChosen = true;
					currentCentroid = getCentroid(nextCells); // Update centroid for the final position
					console.log(`[NAV] ID:${id} rotated and potentially retreated. Final centroid: [${currentCentroid.map(c => c.toFixed(1)).join(',')}]`);
				} else {
					console.log(`[NAV] ID:${id} rotation/retreat failed, staying put.`);
					// If the final position is not valid (e.g., pushed into another organism),
					// the organism effectively stays in its original position for this tick.
					// `nextCells` and `travelVector` will retain their values from before this wall avoidance attempt.
				}
			}
			// 2. PARALLEL TO WALL (Math.abs(dot) <= 0.15)
			else if (Math.abs(dot) <= 0.15) {
				const awayVector: [number, number, number] = [-avoidanceNormal[0], -avoidanceNormal[1], -avoidanceNormal[2]]; // Use avoidanceNormal
				console.log(`[NAV] ID:${id} parallel slide. Normal:[${avoidanceNormal.map(x=>x.toFixed(2)).join(',')}] dot:${dot.toFixed(2)}. Repelling towards center.`); // Use avoidanceNormal
				
				let bestCandidateCells = [...currentCells];
				let bestCandidateVector = [...travelVector];
				let bestCandidateMoveChosen = false; // Tracks if any valid move was found in this parallel block

				// --- Rotation Attempt ---
				// Try to align travelVector with awayVector through rotation
				let currentBestDotProduct = new THREE.Vector3(...travelVector).dot(new THREE.Vector3(...awayVector));
				let rotationApplied = false;

				// Consider no rotation first if it's already well-aligned
				if (currentBestDotProduct > 0.6) {
					rotationApplied = true;
					bestCandidateMoveChosen = true;
				} else {
					// Try 90, 180, 270 degree rotations around principal axes
					for (const axis of (['x', 'y', 'z'] as const)) {
						for (const angle of ([90, 180, 270] as const)) { // Include 180 for parallel case
							const rv = rotateVector(travelVector as [number, number, number], axis, angle);
							const rvVec = new THREE.Vector3(...rv);
							const dotProductWithAway = rvVec.dot(new THREE.Vector3(...awayVector));
							
							if (dotProductWithAway > currentBestDotProduct) { // Found a better alignment
								const candidateCellsAfterRotation = rotateCells(currentCells, axis, angle, getCentroid(currentCells));
								// Check if this rotated position is valid before considering it
								if (isPositionValid(candidateCellsAfterRotation, otherOrgExclusionZone, gridSize)) {
									currentBestDotProduct = dotProductWithAway;
									bestCandidateCells = candidateCellsAfterRotation;
									bestCandidateVector = rv;
									rotationApplied = true;
									bestCandidateMoveChosen = true;
								}
							}
						}
					}
				}

				if (rotationApplied) {
					console.log(`[NAV] ID:${id} parallel: applied rotation. New vector: [${bestCandidateVector.map(v => v.toFixed(2)).join(',')}]`);
				} else {
					console.log(`[NAV] ID:${id} parallel: no beneficial rotation found or valid.`);
				}

				// --- Nudge Attempt (after potential rotation) ---
				let cellsForNudge = [...bestCandidateCells]; // Start nudging from the best rotated position
				let nudgeApplied = false;

				for (let i = 0; i < 2; i++) { // Try up to 2 nudges
					const proposedNudgeCells = translateCells(cellsForNudge, Math.sign(awayVector[0]), Math.sign(awayVector[1]), Math.sign(awayVector[2]));
					if (isPositionValid(proposedNudgeCells, otherOrgExclusionZone, gridSize)) {
						cellsForNudge = proposedNudgeCells;
						nudgeApplied = true;
						bestCandidateMoveChosen = true; // A nudge was successfully applied
						console.log(`[NAV] ID:${id} parallel: applied nudge ${i+1}.`);
					} else {
						// If this nudge is invalid, stop trying further nudges in this direction
						break;
					}
				}

				if (nudgeApplied) {
					nextCells = cellsForNudge;
					travelVector = bestCandidateVector as [number, number, number];
					moveChosen = true; // Final move chosen for this tick
				} else if (bestCandidateMoveChosen) { // Only rotation was applied, no nudge
					nextCells = bestCandidateCells;
					travelVector = bestCandidateVector as [number, number, number];
					moveChosen = true; // Final move chosen for this tick
				} else {
					// No valid rotation or nudge was found. Organism stays put.
					console.log(`[NAV] ID:${id} parallel: no valid move found, staying put.`);
					// nextCells and travelVector retain their initial values (currentCells, derivedTravelVector)
					moveChosen = false; // Ensure moveChosen is false if nothing happened
				}
			}

			if (moveChosen) {
				for (const k of currentLivingSet) {
					const [x, y, z] = parseKey(k);
					gridMutations.push([x, y, z, false]);
					allLivingKeys.delete(k);
				}
				const roundedNext: Array<[number, number, number]> = [];
				for (const [x, y, z] of nextCells) {
					const rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
					gridMutations.push([rx, ry, rz, true]);
					allLivingKeys.add(makeKey(rx, ry, rz));
					roundedNext.push([rx, ry, rz]);
				}
				currentCells = roundedNext;
				currentLivingSet = new Set(currentCells.map(([x,y,z]) => makeKey(x,y,z)));
				currentCytoplasm = computeCytoplasm(currentLivingSet, gridSize);
				travelVector = nextVector as [number, number, number];
			}
		}

		// Update centroid here, after all potential movements are finalized for this organism
		currentCentroid = getCentroid(currentCells);
		updatedOrganisms.set(id, {
			...organism,
			livingCells: currentLivingSet,
			cytoplasm: currentCytoplasm,
			skinColor: computeSkinColor(currentLivingSet, gridSize),
			previousLivingCells: new Set(currentLivingSet),
			centroid: currentCentroid,
			travelVector: travelVector,
			straightSteps: 0,
			avoidanceSteps: 0,
			parallelSteps: 0,
			stuckTicks: 0,
		});
	}

	return { updatedOrganisms, gridMutations };
}
