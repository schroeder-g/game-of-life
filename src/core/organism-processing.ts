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

function getOverlapNormal(cytoplasm: Set<string>, gridSize: number): [number, number, number] {
	let nx = 0, ny = 0, nz = 0;
	for (const key of cytoplasm) {
		const [x, y, z] = parseKey(key);
		if (x <= 0) nx -= 1; else if (x >= gridSize - 1) nx += 1;
		if (y <= 0) ny -= 1; else if (y >= gridSize - 1) ny += 1;
		if (z <= 0) nz -= 1; else if (z >= gridSize - 1) nz += 1;
	}
	const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
	if (len === 0) return [0, 0, 0];
	return [nx/len, ny/len, nz/len];
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

	const allOrgKeyMap = new Map<string, Set<string>>();
	for (const [id, org] of organisms) allOrgKeyMap.set(id, org.livingCells);

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

		const otherOrgCells = new Set<string>();
		for (const [oid, oCells] of allOrgKeyMap) if (oid !== id) oCells.forEach(k => otherOrgCells.add(k));

		// --- RULE-BASED NAVIGATION ---
		const overlapNormal = getOverlapNormal(currentCytoplasm, gridSize);
		if (overlapNormal[0] !== 0 || overlapNormal[1] !== 0 || overlapNormal[2] !== 0) {
			// Diagnostic logs on Wall Encounter
			const v = new THREE.Vector3(...travelVector);
			const n = new THREE.Vector3(...overlapNormal);
			const dot = v.dot(n);
			console.log(`[NAV] ID:${id} wall: ${overlapNormal.map(x=>x.toFixed(2)).join(',')} at Z:[${currentCentroid[2].toFixed(1)}] dot:${dot.toFixed(2)}`);

			let nextCells: Array<[number, number, number]> = [...currentCells];
			let nextVector: [number, number, number] = [...travelVector];
			let moveChosen = false;

			// 1. POINTING AT WALL (dot > 0.15)
			if (dot > 0.15) {
				const previousCells = Array.from(organism.previousLivingCells).map(parseKey);
					// --- RETREAT: Move back from the wall by 1/2 of its largest dimension ---
					const { largestDim } = getBoundingBoxDimensions(currentCells);
					const retreatDistance = Math.ceil(largestDim / 2); // Round up to ensure sufficient retreat

					// Calculate retreat vector opposite to overlapNormal
					const retreatVector: [number, number, number] = [
						-Math.sign(overlapNormal[0]) * retreatDistance,
						-Math.sign(overlapNormal[1]) * retreatDistance,
						-Math.sign(overlapNormal[2]) * retreatDistance,
					];

					const retreatedCells = translateCells(currentCells, retreatVector[0], retreatVector[1], retreatVector[2]);

					// Check if the retreated position is valid (within bounds and no collisions with other organisms)
					// Note: We don't check for self-collision here, as the organism is moving its entire body.
					// We also don't check for cytoplasm collision yet, as this is just a temporary retreat for pivoting.
					// The full validity check will happen after rotation and forward step.
					let retreatValid = true;
					for (const [x, y, z] of retreatedCells) {
						if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize) {
							retreatValid = false;
							break;
						}
						// No need to check collision with other organisms here, as the organism is just moving itself.
						// The main `isPositionValid` check later will handle this for the final proposed position.
					}

					if (retreatValid) {
						nextCells = retreatedCells;
						currentCentroid = getCentroid(nextCells); // Update centroid for rotation
						console.log(`[NAV] ID:${id} retreated by ${retreatDistance} units. New centroid: [${currentCentroid.map(c => c.toFixed(1)).join(',')}]`);
					} else {
						// If retreat is not valid (e.g., pushes it out of bounds on the other side),
						// fall back to previous cells or current cells if no previous.
						const previousCells = Array.from(organism.previousLivingCells).map(parseKey);
						if (previousCells.length > 0) {
							nextCells = previousCells;
							currentCentroid = getCentroid(nextCells);
							console.log(`[NAV] ID:${id} retreat failed, falling back to previous cells.`);
						} else {
							nextCells = currentCells; // Stay put if no previous and retreat fails
							console.log(`[NAV] ID:${id} retreat failed, staying put.`);
						}
					}

				const axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
				const absNorm = [Math.abs(overlapNormal[0]), Math.abs(overlapNormal[1]), Math.abs(overlapNormal[2])];
				const wallAxisIdx = absNorm.indexOf(Math.max(...absNorm));
				const wallAxis = axes[wallAxisIdx];
				const parallelAxes = axes.filter(a => a !== wallAxis);
				
				let bestParallel: [number, number, number] = [0, 0, 0];
				let maxDist = -1;

				for (const axis of parallelAxes) {
					const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
					const distPos = (gridSize - 1) - currentCentroid[idx];
					const distNeg = currentCentroid[idx];
					const currentMax = Math.max(distPos, distNeg);
					
					// PRIORITIZE Y-AXIS (Top) for equal or near-equal distances
					const weight = (axis === 'y') ? 1.2 : 1.0;
					if (currentMax * weight > maxDist) {
						maxDist = currentMax * weight;
						bestParallel = [0, 0, 0];
						bestParallel[idx] = distPos > distNeg ? 1 : -1;
					}
				}

				console.log(`[NAV] ID:${id} pivoting towards: [${bestParallel.join(',')}] (Dist: ${maxDist.toFixed(1)})`);

				for (const axis of (['x', 'y', 'z'] as const)) {
					for (const angle of ([90, 180, 270] as const)) {
						const rv = rotateVector(travelVector as [number, number, number], axis, angle);
						const rvVec = new THREE.Vector3(...rv);
						if (rvVec.dot(new THREE.Vector3(...bestParallel)) > 0.6) {
							nextCells = rotateCells(nextCells, axis, angle, getCentroid(nextCells));
							nextVector = rv;
							break;
						}
					}
				}

				const proposed = translateCells(nextCells, nextVector[0], nextVector[1], nextVector[2]);
				if (isPositionValid(proposed, otherOrgCells, gridSize)) {
					nextCells = proposed;
					moveChosen = true;
				}
			}
			// 2. PARALLEL TO WALL (Math.abs(dot) <= 0.15)
			else if (Math.abs(dot) <= 0.15) {
				const awayVector: [number, number, number] = [-overlapNormal[0], -overlapNormal[1], -overlapNormal[2]];
				console.log(`[NAV] ID:${id} parallel slide. Normal:[${overlapNormal.map(x=>x.toFixed(2)).join(',')}] dot:${dot.toFixed(2)}. Repelling towards center.`);
				
				for (const axis of (['x', 'y', 'z'] as const)) {
					for (const angle of ([90, 180, 270] as const)) {
						const rv = rotateVector(travelVector as [number, number, number], axis, angle);
						const rvVec = new THREE.Vector3(...rv);
						if (rvVec.dot(new THREE.Vector3(...awayVector)) > 0.6) {
							nextCells = rotateCells(nextCells, axis, angle, getCentroid(nextCells));
							nextVector = rv;
							break;
						}
					}
				}

				let nudged = nextCells;
				for (let i = 0; i < 2; i++) {
					const proposed = translateCells(nudged, Math.sign(awayVector[0]), Math.sign(awayVector[1]), Math.sign(awayVector[2]));
					if (isPositionValid(proposed, otherOrgCells, gridSize)) {
						nudged = proposed;
						moveChosen = true;
						break;
					}
					nudged = proposed;
				}
				nextCells = nudged;
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
				currentCentroid = getCentroid(currentCells);
				travelVector = nextVector as [number, number, number];
			}
		}

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
