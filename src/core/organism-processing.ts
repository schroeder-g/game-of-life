
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
	computeSkin,
	UNIT_OFFSETS,
} from './Organism';

// ── All 24 unique 90-degree orientations ──────────────────────────────
const ALL_24_ORIENTATIONS: Array<Array<['x'|'y'|'z', 90|180|270]>> = (() => {
    const testRotations: Array<Array<['x'|'y'|'z', 90|180|270]>> = [];
    const seenConfigs = new Set<string>();
    for (const ax of [0, 90, 180, 270]) {
        for (const ay of [0, 90, 180, 270]) {
            for (const az of [0, 90, 180, 270]) {
                let v: [number, number, number] = [1, 0, 0];
                let up: [number, number, number] = [0, 1, 0];
                if (ax) { v = rotateVector(v, 'x', ax as 90|180|270); up = rotateVector(up, 'x', ax as 90|180|270); }
                if (ay) { v = rotateVector(v, 'y', ay as 90|180|270); up = rotateVector(up, 'y', ay as 90|180|270); }
                if (az) { v = rotateVector(v, 'z', az as 90|180|270); up = rotateVector(up, 'z', az as 90|180|270); }
                
                const vx = Math.round(v[0]), vy = Math.round(v[1]), vz = Math.round(v[2]);
                const ux = Math.round(up[0]), uy = Math.round(up[1]), uz = Math.round(up[2]);
                
                const key = `${vx},${vy},${vz}|${ux},${uy},${uz}`;
                if (!seenConfigs.has(key)) {
                    seenConfigs.add(key);
                    const ops: Array<['x'|'y'|'z', 90|180|270]> = [];
                    if (ax) ops.push(['x', ax as 90|180|270]);
                    if (ay) ops.push(['y', ay as 90|180|270]);
                    if (az) ops.push(['z', az as 90|180|270]);
                    testRotations.push(ops);
                }
            }
        }
    }
    return testRotations;
})();


interface ProcessOrganismsResult {
	updatedOrganisms: Map<string, Organism>;
	gridMutations: Array<[number, number, number, boolean]>;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Find skin cells that are outside the cube bounds [0, gridSize-1]. */
function findSkinWallViolations(skin: Set<string>, gridSize: number): { violations: Set<string>; wallNormal: [number, number, number] } {
    const violations = new Set<string>();
    let nx = 0, ny = 0, nz = 0;
    for (const key of skin) {
        const [x, y, z] = parseKey(key);
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize) {
            violations.add(key);
            // Accumulate wall normal (points inward from the violated wall)
            if (x < 0) nx += 1;
            if (x >= gridSize) nx -= 1;
            if (y < 0) ny += 1;
            if (y >= gridSize) ny -= 1;
            if (z < 0) nz += 1;
            if (z >= gridSize) nz -= 1;
        }
    }
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
    const wallNormal: [number, number, number] = len > 0 ? [nx/len, ny/len, nz/len] : [0, 0, 0];
    return { violations, wallNormal };
}

/** Find skin cells that overlap with another organism's skin cells. */
function findSkinOverlaps(mySkin: Set<string>, otherSkins: Set<string>): Set<string> {
    const overlaps = new Set<string>();
    for (const key of mySkin) {
        if (otherSkins.has(key)) {
            overlaps.add(key);
        }
    }
    return overlaps;
}

/** Get the average coordinate of a set of cell keys. */
function getAveragePosition(keys: Set<string>): [number, number, number] {
    let sx = 0, sy = 0, sz = 0, count = 0;
    for (const key of keys) {
        const [x, y, z] = parseKey(key);
        sx += x; sy += y; sz += z; count++;
    }
    if (count === 0) return [0, 0, 0];
    return [sx / count, sy / count, sz / count];
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

/** Simulate GoL rules on proposed cells within the organism's territory. */
function simulateCytoplasmTick(
	proposedCells: Array<[number, number, number]>,
	otherLivingKeys: Set<string>,
	gridSize: number,
	surviveMin: number, surviveMax: number,
	birthMin: number, birthMax: number, birthMargin: number,
	neighborFaces: boolean, neighborEdges: boolean, neighborCorners: boolean
): Array<[number, number, number]> {
    const tempLiving = new Set<string>(otherLivingKeys);
    proposedCells.forEach(([x,y,z]) => tempLiving.add(makeKey(x,y,z)));

    // ── Bounding box cap: births only allowed within original footprint + 1 cell margin ──
    // This prevents cancerous growth where cytoplasm births expand DNA, which expands
    // the cytoplasm zone next tick, enabling more births — exponential runaway.
    let bbMinX = Infinity, bbMaxX = -Infinity, bbMinY = Infinity, bbMaxY = -Infinity, bbMinZ = Infinity, bbMaxZ = -Infinity;
    for (const [x, y, z] of proposedCells) {
        if (x < bbMinX) bbMinX = x; if (x > bbMaxX) bbMaxX = x;
        if (y < bbMinY) bbMinY = y; if (y > bbMaxY) bbMaxY = y;
        if (z < bbMinZ) bbMinZ = z; if (z > bbMaxZ) bbMaxZ = z;
    }
    bbMinX--; bbMaxX++; bbMinY--; bbMaxY++; bbMinZ--; bbMaxZ++;

    const proposedCytoplasm = computeCytoplasm(new Set(proposedCells.map(c => makeKey(...c))), gridSize);
    const testZone = new Set<string>([...proposedCells.map(c => makeKey(...c)), ...proposedCytoplasm]);

    const nextLiving = new Array<[number, number, number]>();

    const countNeighbors = (cx: number, cy: number, cz: number) => {
        let n = 0;
        for (let dz = -1; dz <= 1; dz++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    let match = false;
                    const sum = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                    if (neighborFaces && sum === 1) match = true;
                    if (neighborEdges && sum === 2) match = true;
                    if (neighborCorners && sum === 3) match = true;
                    if (match) {
                        const nx = cx + dx, ny = cy + dy, nz = cz + dz;
                        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && nz >= 0 && nz < gridSize) {
                            if (tempLiving.has(makeKey(nx, ny, nz))) n++;
                        }
                    }
                }
            }
        }
        return n;
    };

    for (const key of testZone) {
        const [x, y, z] = parseKey(key);
		if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize) continue;
        const isAlive = tempLiving.has(key);
        const neighbors = countNeighbors(x, y, z);
        
        if (isAlive) {
            // Existing DNA cells can survive freely
            if (neighbors >= surviveMin && neighbors <= surviveMax) {
                nextLiving.push([x, y, z]);
            }
        } else {
            // Births ONLY within the original bounding box + 1 margin — prevents cancerous expansion
            if (x >= bbMinX && x <= bbMaxX && y >= bbMinY && y <= bbMaxY && z >= bbMinZ && z <= bbMaxZ) {
                if (neighbors >= birthMin && neighbors <= birthMax) nextLiving.push([x, y, z]);
            }
        }
    }
    return nextLiving;
}

// ── Main Entry Point ─────────────────────────────────────────────────────

export function processOrganisms(
	grid: Grid3D,
	organismsMap: Map<string, Organism>,
	gridSize: number,
): ProcessOrganismsResult {
	const updatedOrganisms = new Map<string, Organism>();
	const gridMutations: Array<[number, number, number, boolean]> = [];

	if (organismsMap.size === 0) return { updatedOrganisms, gridMutations };

	// ── Step 1: Snapshot all organisms' "Tick Starting" state ──────────
	// Each organism senses its current skin for violations.
	// Build global space maps for skin computation.

	const allOrganismBodies = new Map<string, Set<string>>();
	const allOrganismSkins = new Map<string, Set<string>>();

	for (const [id, org] of organismsMap) {
		const body = new Set<string>([...org.livingCells, ...org.cytoplasm]);
		allOrganismBodies.set(id, body);
	}

	// Compute skins using universal body space
	for (const [id, org] of organismsMap) {
		const universalSpace = new Set<string>();
		for (const [, b] of allOrganismBodies) {
			for (const k of b) universalSpace.add(k);
		}
		const skin = computeSkin(org.cytoplasm, universalSpace, gridSize);
		allOrganismSkins.set(id, skin);
	}

	// ── Step 2: Randomize processing order ────────────────────────────
	const randomOrder = Array.from(organismsMap.keys());
	for (let i = randomOrder.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[randomOrder[i], randomOrder[j]] = [randomOrder[j], randomOrder[i]];
	}

	// ── Step 3: Check & Rotate ────────────────────────────────────────
	// Track which organisms are frozen (can't find safe rotation).
	const frozenOrganisms = new Set<string>();
	// Track the cells each organism will use going into GoL Phase 2.
	const resolvedCells = new Map<string, Array<[number, number, number]>>();
	const resolvedVectors = new Map<string, [number, number, number]>();
	const movementGrazingCount = new Map<string, number>();

	// Track all space currently occupied by any organism (Body: DNA + Cytoplasm)
	const globalOrganismOccupied = new Set<string>();
	for (const body of allOrganismBodies.values()) {
		for (const k of body) globalOrganismOccupied.add(k);
	}

	for (const id of randomOrder) {
		const organism = organismsMap.get(id)!;
		const currentCells = Array.from(organism.livingCells).map(parseKey);
		const currentSkin = allOrganismSkins.get(id)!;
		const travelVector: [number, number, number] = organism.travelVector || [0, 0, 1];

		// Build the set of ALL other organisms' skin cells
		const otherSkins = new Set<string>();
		for (const [otherId, otherSkin] of allOrganismSkins) {
			if (otherId !== id) {
				for (const k of otherSkin) otherSkins.add(k);
			}
		}

		// ── Sense: check for violations ───────────────────────────────
		const { violations: wallViolations, wallNormal } = findSkinWallViolations(currentSkin, gridSize);
		const skinOverlaps = findSkinOverlaps(currentSkin, otherSkins);

		const hasWallViolation = wallViolations.size > 0;
		const hasSkinOverlap = skinOverlaps.size > 0;

		if (!hasWallViolation && !hasSkinOverlap) {
			// No violations — organism proceeds normally
			resolvedCells.set(id, currentCells);
			resolvedVectors.set(id, travelVector);
			continue;
		}

		// ── Compute ideal and forbidden directions ────────────────────
		// For wall crossing: ideal vector is PARALLEL to the wall
		// For organism overlap: ideal vector is AWAY from the overlap
		let idealDirection = new THREE.Vector3(0, 0, 0);

		if (hasSkinOverlap) {
			// Vector AWAY from the average position of overlapping skin cells
			const overlapCenter = getAveragePosition(skinOverlaps);
			const centroid = getCentroid(currentCells);
			const awayVec = new THREE.Vector3(
				centroid[0] - overlapCenter[0],
				centroid[1] - overlapCenter[1],
				centroid[2] - overlapCenter[2],
			);
			if (awayVec.length() > 0.01) {
				awayVec.normalize();
				idealDirection.add(awayVec);
			}
		}

		// A "Juke Vector" represents the direction(s) that will move the organism
		// away from its current violations.
		const jukeVector = new THREE.Vector3(0, 0, 0);
		if (hasWallViolation) jukeVector.add(new THREE.Vector3(...wallNormal));
		if (hasSkinOverlap) {
			const overlapCenter = getAveragePosition(skinOverlaps);
			const centroid = getCentroid(currentCells);
			jukeVector.add(new THREE.Vector3(
				centroid[0] - overlapCenter[0],
				centroid[1] - overlapCenter[1],
				centroid[2] - overlapCenter[2],
			));
		}
		if (jukeVector.length() > 0.01) jukeVector.normalize();

		// Current violation penalty to compare against potential candidates
		const currentViolationPenalty = wallViolations.size + skinOverlaps.size;

		if (hasWallViolation) {
			// Vector PARALLEL to the wall. We remove the wall-normal component
			// from the current travel vector to get the parallel component.
			const wallNormalVec = new THREE.Vector3(...wallNormal);
			const currentTravel = new THREE.Vector3(...travelVector);
			// Project travel onto the wall plane: T - (T·N)N
			const parallelVec = currentTravel.clone().sub(
				wallNormalVec.clone().multiplyScalar(currentTravel.dot(wallNormalVec))
			);
			if (parallelVec.length() > 0.01) {
				parallelVec.normalize();
				idealDirection.add(parallelVec);
			} else {
				// Travel vector is perpendicular to wall. Pick the direction with most room.
				const centroid = getCentroid(currentCells);
				let bestAxis = -1, bestDist = -1;
				for (let axis = 0; axis < 3; axis++) {
					// Skip the wall axis
					if (Math.abs(wallNormal[axis]) > 0.5) continue;
					const distPos = (gridSize - 1) - centroid[axis];
					const distNeg = centroid[axis];
					const dist = Math.max(distPos, distNeg);
					if (dist > bestDist) {
						bestDist = dist;
						bestAxis = axis;
					}
				}
				if (bestAxis >= 0) {
					const centroid = getCentroid(currentCells);
					const distPos = (gridSize - 1) - centroid[bestAxis];
					const distNeg = centroid[bestAxis];
					const dir = [0, 0, 0];
					dir[bestAxis] = distPos > distNeg ? 1 : -1;
					idealDirection.add(new THREE.Vector3(dir[0], dir[1], dir[2]));
				}
			}
		}

		if (idealDirection.length() > 0.01) {
			idealDirection.normalize();
		}

		// Forbidden: vectors that point INTO a wall the organism is already crossing
		const forbiddenVec = hasWallViolation
			? new THREE.Vector3(-wallNormal[0], -wallNormal[1], -wallNormal[2]) // into the wall
			: null;

		// ── Try all 24 orientations + Juke Translations ─────────────────
		const centroid = getCentroid(currentCells);

		interface RotationCandidate {
			cells: Array<[number, number, number]>;
			rv: [number, number, number];
			score: number;
			skinOutside: number;
			organismOverlaps: number;
			penalty: number;
		}

		const tier1Candidates: RotationCandidate[] = []; // Perfectly clear
		const tier2Candidates: RotationCandidate[] = []; // Improved (safER)

		for (const ops of ALL_24_ORIENTATIONS) {
			let rv = [...travelVector] as [number, number, number];
			let rotatedCells = [...currentCells] as Array<[number, number, number]>;

			for (const [axis, angle] of ops) {
				rv = rotateVector(rv, axis, angle as 90|180|270);
				rotatedCells = rotateCells(rotatedCells, axis, angle as 90|180|270, centroid);
			}

			// Check if rotated vector points into a wall
			if (forbiddenVec) {
				const rvVec = new THREE.Vector3(...rv);
				if (rvVec.dot(forbiddenVec) > 0.5) continue;
			}

			// For each rotation, try 10 translations: [0,0,0], and up to 3 steps along the Juke vector
			// and standard axis-aligned jukes.
			const translationsToTry: Array<[number, number, number]> = [[0, 0, 0]];
			if (jukeVector.length() > 0.01) {
				translationsToTry.push([Math.round(jukeVector.x), Math.round(jukeVector.y), Math.round(jukeVector.z)]);
				translationsToTry.push([Math.round(jukeVector.x * 2), Math.round(jukeVector.y * 2), Math.round(jukeVector.z * 2)]);
				translationsToTry.push([Math.round(jukeVector.x * 3), Math.round(jukeVector.y * 3), Math.round(jukeVector.z * 3)]);
			}

			// For each translation candidate
			const triedPositions = new Set<string>();

			for (const [tx, ty, tz] of translationsToTry) {
				const posKey = `${tx},${ty},${tz}`;
				if (triedPositions.has(posKey)) continue;
				triedPositions.add(posKey);

				// 1. Initial translation
				let candidateCells = translateCells(rotatedCells, tx, ty, tz);

				// 2. Bounding clamp: shift cells inward ONLY if living cells are out/crossing
				let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
				for (const [x, y, z] of candidateCells) {
					minX = Math.min(minX, x); maxX = Math.max(maxX, x);
					minY = Math.min(minY, y); maxY = Math.max(maxY, y);
					minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
				}
				let cx = 0, cy = 0, cz = 0;
				if (maxX > gridSize - 1) cx = (gridSize - 1) - maxX;
				if (minX < 0) cx = -minX;
				if (maxY > gridSize - 1) cy = (gridSize - 1) - maxY;
				if (minY < 0) cy = -minY;
				if (maxZ > gridSize - 1) cz = (gridSize - 1) - maxZ;
				if (minZ < 0) cz = -minZ;

				const finalCells = (cx !== 0 || cy !== 0 || cz !== 0)
					? translateCells(candidateCells, cx, cy, cz)
					: candidateCells;

				// Compute costs
				const candidateLivingSet = new Set(finalCells.map(c => makeKey(...c)));
				const candidateCyto = computeCytoplasm(candidateLivingSet, gridSize);
				const candidateBody = new Set([...candidateLivingSet, ...candidateCyto]);

				const universalSpace = new Set<string>();
				for (const [otherId, otherBody] of allOrganismBodies) {
					if (otherId !== id) {
						for (const k of otherBody) universalSpace.add(k);
					}
				}
				for (const k of candidateBody) universalSpace.add(k);

				const candidateSkin = computeSkin(candidateCyto, universalSpace, gridSize);
				const candidateOverlaps = findSkinOverlaps(candidateSkin, otherSkins);
				const { violations: candidateWallViolations } = findSkinWallViolations(candidateSkin, gridSize);

				// Identify grazing opportunities in the NEW position (non-organism cells)
				let grazingOpportunities = 0;
				// Body + Skin
				const fullCandidateSpace = new Set([...candidateBody, ...candidateSkin]);
				for (const key of fullCandidateSpace) {
					const [x, y, z] = parseKey(key);
					if (grid.get(x, y, z)) {
						grazingOpportunities++;
					}
				}

				const penalty = candidateWallViolations.size + candidateOverlaps.size;

				// Skip if penalty is NOT improved AND it's not a perfect candidate
				if (penalty >= currentViolationPenalty && penalty > 0) continue;

				// Quality score: alignment with ideal direction
				const rvVec = new THREE.Vector3(...rv);
				const score = idealDirection.length() > 0.01 ? rvVec.dot(idealDirection) : 0;

				const candidate: RotationCandidate = {
					cells: finalCells,
					rv: rv,
					score,
					skinOutside: candidateWallViolations.size,
					organismOverlaps: candidateOverlaps.size,
					penalty,
					grazingCount: grazingOpportunities,
				};

				if (penalty === 0) {
					tier1Candidates.push(candidate);
				} else if (penalty < currentViolationPenalty) {
					tier2Candidates.push(candidate);
				}
			}
		}

		// Pick best candidate: Tier 1 (Perfect) > Tier 2 (Improved/SafER)
		let bestCandidate: RotationCandidate | null = null;
		if (tier1Candidates.length > 0) {
			tier1Candidates.sort((a, b) => b.score - a.score);
			bestCandidate = tier1Candidates[0];
		} else if (tier2Candidates.length > 0) {
			// Sort by absolute penalty first, then score
			tier2Candidates.sort((a, b) => {
				if (a.penalty !== b.penalty) return a.penalty - b.penalty;
				return b.score - a.score;
			});
			bestCandidate = tier2Candidates[0];
		}

		if (bestCandidate) {
			resolvedCells.set(id, bestCandidate.cells);
			resolvedVectors.set(id, bestCandidate.rv);

			// Update global maps so subsequent organisms see this organism's new position
			const newLivingSet = new Set(bestCandidate.cells.map(c => makeKey(...c)));
			const newCyto = computeCytoplasm(newLivingSet, gridSize);
			const newBody = new Set([...newLivingSet, ...newCyto]);
			allOrganismBodies.set(id, newBody);

			// Recompute skin for updated position
			const universalSpace = new Set<string>();
			for (const [, b] of allOrganismBodies) {
				for (const k of b) universalSpace.add(k);
			}
			allOrganismSkins.set(id, computeSkin(newCyto, universalSpace, gridSize));
		} else {
			resolvedCells.set(id, currentCells);
			resolvedVectors.set(id, travelVector);
		}

		// Update global occupancy for movement
		if (bestCandidate) {
			const oldBody = allOrganismBodies.get(id);
			if (oldBody) {
				for (const k of oldBody) globalOrganismOccupied.delete(k);
			}
			const newLivingSet = new Set(bestCandidate.cells.map(c => makeKey(...c)));
			const newCyto = computeCytoplasm(newLivingSet, gridSize);
			for (const k of newLivingSet) globalOrganismOccupied.add(k);
			for (const k of newCyto) globalOrganismOccupied.add(k);
		}

		// Store grazing count for Step 4
		movementGrazingCount.set(id, bestCandidate?.grazingCount || 0);

		// Apply movement grazing if any
		if (bestCandidate && bestCandidate.grazingCount > 0) {
			const body = new Set<string>();
			const livingSet = new Set(bestCandidate.cells.map(c => makeKey(...c)));
			const cyto = computeCytoplasm(livingSet, gridSize);
			for (const k of livingSet) body.add(k);
			for (const k of cyto) body.add(k);

			const skin = computeSkin(cyto, allOrganismBodies.get(id) || new Set(), gridSize); // Approx
			const fullSpace = new Set([...body, ...skin]);

			for (const key of fullSpace) {
				const [x, y, z] = parseKey(key);
				if (grid.get(x, y, z)) {
					gridMutations.push([x, y, z, false]);
					// We'll add this to org.eatenCount later when returning updatedOrganisms
				}
			}
		}
	}

	// ── Step 4: GoL Phase 2 on non-frozen organisms ──────────────────
	// Collect all living keys in the grid (post Phase 1 tick)
	const globalLivingKeys = new Set<string>();
	for (let z = 0; z < gridSize; z++) {
		for (let y = 0; y < gridSize; y++) {
			for (let x = 0; x < gridSize; x++) {
				if (grid.get(x, y, z)) globalLivingKeys.add(makeKey(x, y, z));
			}
		}
	}

	for (const id of randomOrder) {
		const organism = organismsMap.get(id)!;
		const rawCells = resolvedCells.get(id)!;
		// Ensure cells are rounded to grid integers before GoL processing
		const resolvedCellsForOrg = rawCells.map(([x, y, z]) => [
			Math.round(x),
			Math.round(y),
			Math.round(z)
		] as [number, number, number]);
		
		const resolvedVector = resolvedVectors.get(id)!;
		const isFrozen = frozenOrganisms.has(id);

		// ── PRE-GOL STEP A: Clear both old and new territory ──────────
		// We must clear where the organism WAS and where it is NOW (after movement).
		// This prevents "ghost" cells from remaining on the grid when moving into crowded space.
		const oldTerritory = new Set([...organism.livingCells, ...organism.cytoplasm]);
		const roster = new Set(resolvedCellsForOrg.map(c => makeKey(...c)));
		const preCyto = computeCytoplasm(roster, gridSize);
		const newTerritory = new Set([...roster, ...preCyto]);
		
		const totalClearZone = new Set([...oldTerritory, ...newTerritory]);

		let territoryEaten = 0;
		for (const key of totalClearZone) {
			if (globalLivingKeys.has(key)) {
				// Any cell here that isn't our own DNA (roster) is an intruder
				if (!roster.has(key)) {
					territoryEaten++;
				}
				const [x, y, z] = parseKey(key);
				gridMutations.push([x, y, z, false]);
				globalLivingKeys.delete(key);
			}
		}

		// ── PRE-GOL STEP 2: Fresh Skin from resolved DNA ──
		const preSkin = computeSkin(preCyto, globalOrganismOccupied, gridSize);

		// ── PRE-GOL STEP 3: THE SKIN MUST BE DEVOID OF LIVING CELLS ─────
		// Eat ALL living cells in skin unconditionally (they do not belong there).
		// Eat all non-roster living cells in cytoplasm.
		let preGolEaten = territoryEaten;
		for (const key of preSkin) {
			if (globalOrganismOccupied.has(key)) continue; // respect other organisms
			const [x, y, z] = parseKey(key);
			if (grid.get(x, y, z)) {
				grid.set(x, y, z, false);
				globalLivingKeys.delete(key);
				preGolEaten++;
			}
		}
		// (preCyto was already cleared by totalClearZone loop above)

		// ── STEP 4: ISOLATED GOL ─────────────────────────────────────
		const golResult = simulateCytoplasmTick(
			resolvedCellsForOrg,
			new Set<string>(), // ISOLATED: no external neighbors
			gridSize,
			organism.rules.surviveMin, organism.rules.surviveMax,
			organism.rules.birthMin, organism.rules.birthMax, organism.rules.birthMargin,
			organism.rules.neighborFaces, organism.rules.neighborEdges, organism.rules.neighborCorners,
		);

		const golSet = new Set(golResult.map(c => makeKey(...c)));

		// Keep only the SINGLE LARGEST connected component (≥3 cells).
		let largestComp = new Set<string>();
		const visited = new Set<string>();
		const bridgeSpace = new Set([...golSet, ...preCyto]);

		for (const seed of golSet) {
			if (!visited.has(seed)) {
				const comp = getConnectedComponent(seed, bridgeSpace);
				comp.forEach(k => { if (golSet.has(k)) visited.add(k); });
				const livingNucleus = new Set(Array.from(comp).filter(k => golSet.has(k)));
				if (livingNucleus.size > largestComp.size) {
					largestComp = livingNucleus;
				}
			}
		}

		let finalCells: Array<[number, number, number]>;
		if (largestComp.size >= 3) {
			finalCells = Array.from(largestComp).map(parseKey);
		} else {
			finalCells = [];
		}

		if (finalCells.length === 0) {
			const oldBody = allOrganismBodies.get(id);
			if (oldBody) for (const k of oldBody) globalOrganismOccupied.delete(k);
			continue;
		}

		// ── PLACE FINAL CELLS ON GRID ─────────────────────────────────
		const roundedFinal: Array<[number, number, number]> = [];
		for (const [x, y, z] of finalCells) {
			const rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
			if (rx >= 0 && rx < gridSize && ry >= 0 && ry < gridSize && rz >= 0 && rz < gridSize) {
				gridMutations.push([rx, ry, rz, true]);
				globalLivingKeys.add(makeKey(rx, ry, rz));
				roundedFinal.push([rx, ry, rz]);
			}
		}

		// ── STEP 6: 2-CELL GRAZING ────────────────────────────────────
		const finalLivingSet = new Set(roundedFinal.map(c => makeKey(...c)));

		// Eat any living cell within 2 cells of the new roster that is not in
		// the roster or another organism's space.
		let postGolEaten = 0;
		for (const key of finalLivingSet) {
			const [cx, cy, cz] = parseKey(key);
			for (let dz = -2; dz <= 2; dz++) {
				for (let dy = -2; dy <= 2; dy++) {
					for (let dx = -2; dx <= 2; dx++) {
						if (dx === 0 && dy === 0 && dz === 0) continue;
						const nx = cx + dx, ny = cy + dy, nz = cz + dz;
						if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize || nz < 0 || nz >= gridSize) continue;
						const nk = makeKey(nx, ny, nz);
						if (finalLivingSet.has(nk)) continue; // own DNA
						if (globalOrganismOccupied.has(nk)) continue; // other organism
						if (grid.get(nx, ny, nz)) {
							grid.set(nx, ny, nz, false);
							gridMutations.push([nx, ny, nz, false]);
							globalLivingKeys.delete(nk);
							postGolEaten++;
						}
					}
				}
			}
		}

		// ── STEP 7: RECONSTITUTE cytoplasm and skin ───────────────────
		const finalCytoplasm = computeCytoplasm(finalLivingSet, gridSize);

		// Update global occupancy with this organism's final footprint
		const oldBody = allOrganismBodies.get(id);
		if (oldBody) for (const k of oldBody) globalOrganismOccupied.delete(k);
		finalLivingSet.forEach(k => globalOrganismOccupied.add(k));
		finalCytoplasm.forEach(k => globalOrganismOccupied.add(k));

		const finalSkin = computeSkin(finalCytoplasm, globalOrganismOccupied, gridSize);

		const finalEatenCount = (organism.eatenCount || 0)
			+ (movementGrazingCount.get(id) || 0)
			+ preGolEaten
			+ postGolEaten;

		// Derive updated travel vector from centroid drift
		let nextVector: [number, number, number] = resolvedVector;
		const newCentroid = getCentroid(roundedFinal);
		if (organism.centroid) {
			const [prevCx, prevCy, prevCz] = organism.centroid;
			const [currCx, currCy, currCz] = newCentroid;
			const dx = currCx - prevCx, dy = currCy - prevCy, dz = currCz - prevCz;
			const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
			if (len > 0.01) nextVector = [dx / len, dy / len, dz / len];
		}

		updatedOrganisms.set(id, {
			...organism,
			livingCells: finalLivingSet,
			cytoplasm: finalCytoplasm,
			skinColor: computeSkinColor(finalLivingSet, gridSize),
			previousLivingCells: organism.livingCells, // Correctly preserve the state from start of tick
			centroid: newCentroid,
			travelVector: nextVector,
			straightSteps: 0, avoidanceSteps: 0, parallelSteps: 0, stuckTicks: isFrozen ? (organism.stuckTicks + 1) : 0,
			eatenCount: finalEatenCount,
		});
	}


	return { updatedOrganisms, gridMutations };
}
