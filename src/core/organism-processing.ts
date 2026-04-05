
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

function computeSkin(cytoplasmSpace: Set<string>, allOrganismSpaces: Set<string>, gridSize: number): Set<string> {
    const skin = new Set<string>();
    for (const cytoKey of cytoplasmSpace) {
        const [cx, cy, cz] = parseKey(cytoKey);
        for (const [dx, dy, dz] of UNIT_OFFSETS) {
            const nx = cx + dx, ny = cy + dy, nz = cz + dz;
			// NOTE: We do NOT bounds check yet. If skin is outside bounds, we want to know!
            const nk = makeKey(nx, ny, nz);
            if (!allOrganismSpaces.has(nk)) {
                skin.add(nk);
            }
        }
    }
    return skin;
}

// Hypothesizes the organism shape after applying GoL rules strictly to its territory in liminal space
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
            if (neighbors >= surviveMin && neighbors <= surviveMax) nextLiving.push([x, y, z]);
        } else {
            if (neighbors >= birthMin && neighbors <= birthMax) nextLiving.push([x, y, z]);
        }
    }
    return nextLiving;
}

function isSkinValid(
	nextCellsHypothesis: Array<[number, number, number]>,
	allOtherOrganismBodies: Set<string>,
	allOtherOrganismSkins: Set<string>,
	gridSize: number
): boolean {
    const hypLivingMap = new Set(nextCellsHypothesis.map(c => makeKey(...c)));
    const hypCytoplasm = computeCytoplasm(hypLivingMap, gridSize);
    const combinedHypSpace = new Set<string>([...hypLivingMap, ...hypCytoplasm]);

    // All spaces occupied by THIS organism and OTHER organisms
    const universalSpace = new Set<string>([...allOtherOrganismBodies, ...combinedHypSpace]);

    const hypSkin = computeSkin(hypCytoplasm, universalSpace, gridSize);

    for (const sk of hypSkin) {
        const [x, y, z] = parseKey(sk);
        // Condition B: Skin outside cube
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize || z < 0 || z >= gridSize) {
            return false;
        }
        // Condition C: Skin overlaps another skin
        if (allOtherOrganismSkins.has(sk)) {
            return false;
        }
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

function getAvoidanceNormal(
    livingCells: Array<[number, number, number]>,
    cytoplasm: Set<string>,
    travelVector: [number, number, number],
    gridSize: number,
    otherOrgExclusionZone: Set<string>,
    lookAheadDistance: number,
): [number, number, number] {
    let totalNormal: [number, number, number] = [0, 0, 0];
    let collisionDetected = false;

    const addNormalComponent = (component: [number, number, number]) => {
        totalNormal[0] += component[0];
        totalNormal[1] += component[1];
        totalNormal[2] += component[2];
        collisionDetected = true;
    };

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

    const currentExtendedBody = new Set<string>(livingCells.map(c => makeKey(...c)));
    cytoplasm.forEach(k => currentExtendedBody.add(k));
    for (const key of currentExtendedBody) {
        if (otherOrgExclusionZone.has(key)) {
            const [x, y, z] = parseKey(key);
            const center = gridSize / 2;
            const repelX = x - center;
            const repelY = y - center;
            const repelZ = z - center;
            const len = Math.sqrt(repelX*repelX + repelY*repelY + repelZ*repelZ);
            if (len > 0) {
                addNormalComponent([-repelX/len, -repelY/len, -repelZ/len]);
            } else {
                addNormalComponent([-travelVector[0], -travelVector[1], -travelVector[2]]);
            }
        }
    }

    for (let i = 1; i <= lookAheadDistance; i++) {
        const proposedDx = travelVector[0] * i;
        const proposedDy = travelVector[1] * i;
        const proposedDz = travelVector[2] * i;

        const translatedCells = translateCells(livingCells, proposedDx, proposedDy, proposedDz);
        const translatedSet = new Set<string>(translatedCells.map(c => makeKey(c[0], c[1], c[2])));
        const translatedCytoplasm = computeCytoplasm(translatedSet, gridSize);

        let tempNormal: [number, number, number] = [0, 0, 0];
        let foundCollisionAtThisStep = false;

        for (const key of translatedCytoplasm) {
            const [x, y, z] = parseKey(key);
            if (x < 0) { tempNormal[0] -= 1; foundCollisionAtThisStep = true; }
            if (x >= gridSize) { tempNormal[0] += 1; foundCollisionAtThisStep = true; }
            if (y < 0) { tempNormal[1] -= 1; foundCollisionAtThisStep = true; }
            if (y >= gridSize) { tempNormal[1] += 1; foundCollisionAtThisStep = true; }
            if (z < 0) { tempNormal[2] -= 1; foundCollisionAtThisStep = true; }
            if (z >= gridSize) { tempNormal[2] += 1; foundCollisionAtThisStep = true; }
        }

        const translatedExtendedBody = new Set<string>([...translatedSet, ...translatedCytoplasm]);
        for (const key of translatedExtendedBody) {
            if (otherOrgExclusionZone.has(key)) {
                foundCollisionAtThisStep = true;
                const [x, y, z] = parseKey(key);
                const repelX = travelVector[0];
                const repelY = travelVector[1];
                const repelZ = travelVector[2];
                const len = Math.sqrt(repelX*repelX + repelY*repelY + repelZ*repelZ);
                if (len > 0) {
                    tempNormal[0] -= repelX/len;
                    tempNormal[1] -= repelY/len;
                    tempNormal[2] -= repelZ/len;
                }
            }
        }

        if (foundCollisionAtThisStep) {
            const len = Math.sqrt(tempNormal[0]*tempNormal[0] + tempNormal[1]*tempNormal[1] + tempNormal[2]*tempNormal[2]);
            if (len > 0) {
                const weight = 1 / Math.pow(i, 2);
                addNormalComponent([tempNormal[0]/len * weight, tempNormal[1]/len * weight, tempNormal[2]/len * weight]);
            }
        }
    }

    const totalLen = Math.sqrt(totalNormal[0]*totalNormal[0] + totalNormal[1]*totalNormal[1] + totalNormal[2]*totalNormal[2]);
    if (totalLen > 0) {
        return [totalNormal[0]/totalLen, totalNormal[1]/totalLen, totalNormal[2]/totalLen];
    }

    return [0, 0, 0];
}

function getBoundingBoxDimensions(cells: Array<[number, number, number]>): { minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number, largestDim: number } {
	if (cells.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0, largestDim: 0 };
	let minX = Infinity, maxX = -Infinity;
	let minY = Infinity, maxY = -Infinity;
	let minZ = Infinity, maxZ = -Infinity;
	for (const [x, y, z] of cells) {
		minX = Math.min(minX, x); maxX = Math.max(maxX, x);
		minY = Math.min(minY, y); maxY = Math.max(maxY, y);
		minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
	}
	return { minX, maxX, minY, maxY, minZ, maxZ, largestDim: Math.max(maxX-minX+1, maxY-minY+1, maxZ-minZ+1) };
}

export function processOrganisms(
	grid: Grid3D,
	organismsMap: Map<string, Organism>,
	gridSize: number,
	surviveMin: number, surviveMax: number,
	birthMin: number, birthMax: number, birthMargin: number,
	neighborFaces: boolean, neighborEdges: boolean, neighborCorners: boolean,
): ProcessOrganismsResult {
	const updatedOrganisms = new Map<string, Organism>();
	const gridMutations: Array<[number, number, number, boolean]> = [];

	const globalLivingKeys = new Set<string>();
	for (let z = 0; z < gridSize; z++) {
		for (let y = 0; y < gridSize; y++) {
			for (let x = 0; x < gridSize; x++) {
				if (grid.get(x, y, z)) globalLivingKeys.add(makeKey(x, y, z));
			}
		}
	}

    // Step 2: Randomize Adjustment Order
    const randomOrder = Array.from(organismsMap.keys());
    for (let i = randomOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [randomOrder[i], randomOrder[j]] = [randomOrder[j], randomOrder[i]];
    }

    // State Tracking
    const updatedGlobalBodies = new Map<string, Set<string>>();
    const updatedGlobalSkins = new Map<string, Set<string>>();

    const rebuildGlobalSpaces = () => {
        const allBodies = new Set<string>();
        const allSkins = new Set<string>();
        for (const bodySet of updatedGlobalBodies.values()) {
            for (const key of bodySet) allBodies.add(key);
        }
        for (const skinSet of updatedGlobalSkins.values()) {
            for (const key of skinSet) allSkins.add(key);
        }
        return { allBodies, allSkins };
    };

    // Initialize all existing positions before adjustments
    for (const [id, org] of organismsMap) {
        // We use the start-of-tick components to build the baseline masks
        const orgLiving = new Set(org.previousLivingCells); // Fallback to previous living to freeze properly
        const orgCyto = org.cytoplasm;
        const orgBody = new Set<string>([...orgLiving, ...orgCyto]);
        updatedGlobalBodies.set(id, orgBody);
    }
    
    // Now calc baseline skins using the universal bodies map
    for (const [id, _] of organismsMap) {
        const orgCyto = organismsMap.get(id)!.cytoplasm;
        const excludeSpaces = new Set<string>();
        for (const [oID, b] of updatedGlobalBodies) if (oID !== id) { for (const k of b) excludeSpaces.add(k); }
        for (const k of updatedGlobalBodies.get(id)!) excludeSpaces.add(k);
        const orgSkin = computeSkin(orgCyto, excludeSpaces, gridSize);
        updatedGlobalSkins.set(id, orgSkin);
    }

	for (const id of randomOrder) {
        const organism = organismsMap.get(id)!;
        
        // 1: "Tick Starting" Configuration
        const startCells = Array.from(organism.previousLivingCells).map(parseKey);
        
        // Find what GoL produced for this organism's territory during Grid3D.tick()
        const previousTerritory = new Set<string>([...organism.previousLivingCells, ...organism.cytoplasm]);
        const tickProducedLivingCells = new Set<string>();
        for (const key of globalLivingKeys) {
            if (previousTerritory.has(key)) tickProducedLivingCells.add(key);
        }
        
		let allComps: Array<Set<string>> = [];
		const visitedForComp = new Set<string>();
		for (const seed of tickProducedLivingCells) {
			if (!visitedForComp.has(seed)) {
				const comp = getConnectedComponent(seed, tickProducedLivingCells);
				if (comp.size > 2) allComps.push(comp);
				comp.forEach(k => visitedForComp.add(k));
			}
		}

        let currentLivingSet = new Set<string>();
        for (const comp of allComps) comp.forEach(k => currentLivingSet.add(k));
        let currentCells = Array.from(currentLivingSet).map(parseKey);
        let currentCytoplasm = computeCytoplasm(currentLivingSet, gridSize);

        // Calculate travel vector based on standard rules
		let derivedTravelVector: [number, number, number] = organism.travelVector || [0, 0, 1];
        const currentCentroid = getCentroid(currentCells);
		if (organism.centroid) {
			const [prevCx, prevCy, prevCz] = organism.centroid;
			const [currCx, currCy, currCz] = currentCentroid;
			const dx = currCx - prevCx; const dy = currCy - prevCy; const dz = currCz - prevCz;
			const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
			if (len > 0.01) derivedTravelVector = [dx / len, dy / len, dz / len];
		}
		let travelVector = derivedTravelVector;

        // Exclusion Zone calculation for collision logic
		const otherOrgExclusionZone = new Set<string>();
		for (const [otherOrgId, otherOrgBody] of updatedGlobalBodies) {
			if (otherOrgId !== id) {
				otherOrgBody.forEach(k => otherOrgExclusionZone.add(k));
			}
		}
        
        const otherLivingList = new Set<string>(globalLivingKeys);
        for (const k of currentLivingSet) otherLivingList.delete(k); // remove self

        // Function that evaluates the generalized skin rule constraint
        const checkAdjustmentSafe = (candidateCells: Array<[number, number, number]>) => {
            const hypNext = simulateCytoplasmTick(candidateCells, otherLivingList, gridSize, surviveMin, surviveMax, birthMin, birthMax, birthMargin, neighborFaces, neighborEdges, neighborCorners);
            const spaces = rebuildGlobalSpaces();
            const { allBodies, allSkins } = spaces;
            
            // Remove own bodies and skin to check purely against *others*
            const ownCurrentBody = updatedGlobalBodies.get(id);
            if (ownCurrentBody) ownCurrentBody.forEach(k => allBodies.delete(k));
            const ownCurrentSkin = updatedGlobalSkins.get(id);
            if (ownCurrentSkin) ownCurrentSkin.forEach(k => allSkins.delete(k));

            return isSkinValid(hypNext, allBodies, allSkins, gridSize);
        };

        // --- RULE-BASED NAVIGATION ---
		let nextCells: Array<[number, number, number]> = [...currentCells];
		let nextVector: [number, number, number] = [...travelVector];
        let finalizedTranslation = false;

        const dot = new THREE.Vector3(...travelVector).dot(new THREE.Vector3(...getAvoidanceNormal(currentCells, currentCytoplasm, travelVector, gridSize, otherOrgExclusionZone, AVOIDANCE_LOOK_AHEAD_DISTANCE)));
        const avoidanceNormal = getAvoidanceNormal(currentCells, currentCytoplasm, travelVector, gridSize, otherOrgExclusionZone, AVOIDANCE_LOOK_AHEAD_DISTANCE);

        let safeCandidateFound = false;

        if (avoidanceNormal[0] !== 0 || avoidanceNormal[1] !== 0 || avoidanceNormal[2] !== 0) {
            if (dot > 0.15) { // POINTING AT WALL
                let cellsForProcessing = startCells;
                let centroidForRotation = getCentroid(cellsForProcessing);
                let currentTravelVector = [...travelVector];
                
                const absNorm = [Math.abs(avoidanceNormal[0]), Math.abs(avoidanceNormal[1]), Math.abs(avoidanceNormal[2])];
                const wallAxisIdx = absNorm.indexOf(Math.max(...absNorm));
                const parallelAxes = ['x', 'y', 'z'].filter(a => a !== ['x', 'y', 'z'][wallAxisIdx]) as Array<'x'|'y'|'z'>;
                
                let bestParallelDirection: [number, number, number] = [0, 0, 0];
                let maxDist = -1;
                for (const axis of parallelAxes) {
                    const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
                    const distPos = (gridSize - 1) - centroidForRotation[idx];
                    const distNeg = centroidForRotation[idx];
                    const weight = (axis === 'y') ? 1.2 : 1.0;
                    if (Math.max(distPos, distNeg) * weight > maxDist) {
                        maxDist = Math.max(distPos, distNeg) * weight;
                        bestParallelDirection = [0, 0, 0];
                        bestParallelDirection[idx] = distPos > distNeg ? 1 : -1;
                    }
                }

                // Map all 24 orientation attempts
                let attempts = ALL_24_ORIENTATIONS.map(ops => {
                    let rv = [...currentTravelVector] as [number, number, number];
                    let candidateCells = [...cellsForProcessing];
                    for (const [axis, angle] of ops) {
                        rv = rotateVector(rv, axis, angle as 90|180|270);
                        candidateCells = rotateCells(candidateCells, axis, angle as 90|180|270, centroidForRotation);
                    }
                    
                    // Does it need retreat?
                    const tempCyto = computeCytoplasm(new Set(candidateCells.map(c => makeKey(...c))), gridSize);
                    const bounding = getBoundingBoxDimensions(Array.from(tempCyto).map(parseKey));
                    let rx = 0, ry = 0, rz = 0;
                    if (avoidanceNormal[0] > 0) rx = (gridSize - 2) - bounding.maxX;
                    if (avoidanceNormal[0] < 0) rx = 1 - bounding.minX;
                    if (avoidanceNormal[1] > 0) ry = (gridSize - 2) - bounding.maxY;
                    if (avoidanceNormal[1] < 0) ry = 1 - bounding.minY;
                    if (avoidanceNormal[2] > 0) rz = (gridSize - 2) - bounding.maxZ;
                    if (avoidanceNormal[2] < 0) rz = 1 - bounding.minZ;

                    const finalCandidate = translateCells(candidateCells, rx, ry, rz);
                    
                    // Score the attempt. Higher score means closer to bestParallelDirection
                    const score = new THREE.Vector3(...rv).dot(new THREE.Vector3(...bestParallelDirection));
                    return { finalCandidate, rv, score, ops };
                });

                // Sort by score descending (ideal rotations investigated first)
                attempts.sort((a, b) => b.score - a.score);

                for (const attempt of attempts) {
                    if (checkAdjustmentSafe(attempt.finalCandidate)) {
                        nextCells = attempt.finalCandidate;
                        travelVector = attempt.rv as [number, number, number];
                        nextVector = attempt.rv as [number, number, number];
                        finalizedTranslation = true;
                        safeCandidateFound = true;
                        break;
                    }
                }
            } else if (Math.abs(dot) <= 0.15) { // PARALLEL
                const awayVector: [number, number, number] = [-avoidanceNormal[0], -avoidanceNormal[1], -avoidanceNormal[2]];
                let bestDotProduct = new THREE.Vector3(...travelVector).dot(new THREE.Vector3(...awayVector));
                
                // Rotation attempt
                if (bestDotProduct > 0.6 && checkAdjustmentSafe(currentCells)) {
                    safeCandidateFound = true;
                } else {
                    for (const axis of (['x', 'y', 'z'] as const)) {
                        for (const angle of ([90, 180, 270] as const)) {
                            const rv = rotateVector(travelVector as [number, number, number], axis, angle);
                            if (new THREE.Vector3(...rv).dot(new THREE.Vector3(...awayVector)) > bestDotProduct) {
                                const rotatedCandidate = rotateCells(currentCells, axis, angle, getCentroid(currentCells));
                                if (checkAdjustmentSafe(rotatedCandidate)) {
                                    bestDotProduct = new THREE.Vector3(...rv).dot(new THREE.Vector3(...awayVector));
                                    nextCells = rotatedCandidate;
                                    nextVector = rv as [number, number, number];
                                    finalizedTranslation = true;
                                    safeCandidateFound = true;
                                    travelVector = nextVector;
                                }
                            }
                        }
                    }
                }

                // Nudge attempt
                for (let i = 0; i < 2; i++) {
                    const proposedNudge = translateCells(nextCells, Math.sign(awayVector[0]), Math.sign(awayVector[1]), Math.sign(awayVector[2]));
                    if (checkAdjustmentSafe(proposedNudge)) {
                        nextCells = proposedNudge;
                        finalizedTranslation = true;
                        safeCandidateFound = true;
                        break;
                    }
                }
            }
        }

        // 4. Hard Fallback constraint 
        // If we didn't actively avoid walls, we must still check if standard movement breaks rules
        if (!finalizedTranslation) {
            if (!checkAdjustmentSafe(currentCells)) {
                console.log(`[NAV] ID:${id} standard movement violated safe skin lookahead. Hard freezing.`);
                // 5. If organism has no safe adjustments (including its default tick attempt), it stays in Tick Starting pos.
                nextCells = startCells; // Revert strictly back to start of generation components
                // Reset standard GoL products that were created
                travelVector = organism.travelVector || [0,0,1];
                nextVector = travelVector;
            } else {
                nextCells = currentCells;
            }
        }

        // Apply final state
        for (const k of Array.from(tickProducedLivingCells)) {
            const [x, y, z] = parseKey(k);
            gridMutations.push([x, y, z, false]); // Clear the original generated ones
            globalLivingKeys.delete(k);
        }

        const roundedNext: Array<[number, number, number]> = [];
        for (const [x, y, z] of nextCells) {
            const rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
            gridMutations.push([rx, ry, rz, true]);
            globalLivingKeys.add(makeKey(rx, ry, rz));
            roundedNext.push([rx, ry, rz]);
        }
        
        currentLivingSet = new Set(roundedNext.map(c => makeKey(...c)));
        currentCytoplasm = computeCytoplasm(currentLivingSet, gridSize);
        
        // Immediately push to update Global Maps for the next sequence item
        updatedGlobalBodies.set(id, new Set([...currentLivingSet, ...currentCytoplasm]));
        
        const excludeSpaces = new Set<string>();
        for (const [oID, b] of updatedGlobalBodies) if (oID !== id) { for (const k of b) excludeSpaces.add(k); }
        for (const k of updatedGlobalBodies.get(id)!) excludeSpaces.add(k);
        updatedGlobalSkins.set(id, computeSkin(currentCytoplasm, excludeSpaces, gridSize));

		updatedOrganisms.set(id, {
			...organism,
			livingCells: currentLivingSet,
			cytoplasm: currentCytoplasm,
			skinColor: computeSkinColor(currentLivingSet, gridSize),
			previousLivingCells: currentLivingSet,
			centroid: getCentroid(roundedNext),
			travelVector: nextVector,
			straightSteps: 0, avoidanceSteps: 0, parallelSteps: 0, stuckTicks: 0,
		});
	}

	return { updatedOrganisms, gridMutations };
}

