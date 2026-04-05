import sys

with open('src/core/organism-processing.ts', 'r') as f:
    orig = f.read()

# We need to inject the 24 orientations generator at the top, and modify the Pointing at Wall block.
new_code = orig.replace(
    "const AVOIDANCE_LOOK_AHEAD_DISTANCE = 4; // Cells",
"""const AVOIDANCE_LOOK_AHEAD_DISTANCE = 4; // Cells

const ALL_24_ORIENTATIONS: Array<Array<['x'|'y'|'z', Exclude<number, 0>]>> = (() => {
    const testRotations: Array<Array<['x'|'y'|'z', number]>> = [];
    const seenConfigs = new Set<string>();
    for (const ax of [0, 90, 180, 270]) {
        for (const ay of [0, 90, 180, 270]) {
            for (const az of [0, 90, 180, 270]) {
                let v: [number, number, number] = [1, 0, 0];
                let up: [number, number, number] = [0, 1, 0];
                if (ax) { v = rotateVector(v, 'x', ax); up = rotateVector(up, 'x', ax); }
                if (ay) { v = rotateVector(v, 'y', ay); up = rotateVector(up, 'y', ay); }
                if (az) { v = rotateVector(v, 'z', az); up = rotateVector(up, 'z', az); }
                
                const vx = Math.round(v[0]), vy = Math.round(v[1]), vz = Math.round(v[2]);
                const ux = Math.round(up[0]), uy = Math.round(up[1]), uz = Math.round(up[2]);
                
                const key = `${vx},${vy},${vz}|${ux},${uy},${uz}`;
                if (!seenConfigs.has(key)) {
                    seenConfigs.add(key);
                    const ops: Array<['x'|'y'|'z', number]> = [];
                    if (ax) ops.push(['x', ax]);
                    if (ay) ops.push(['y', ay]);
                    if (az) ops.push(['z', az]);
                    testRotations.push(ops);
                }
            }
        }
    }
    return testRotations as Array<Array<['x'|'y'|'z', Exclude<number, 0>]>>;
})();
""")

search_str = """                // rotation attempts
                for (const axis of (['x', 'y', 'z'] as const)) {
                    for (const angle of ([90, 270] as const)) {
                        const rv = rotateVector(currentTravelVector as [number, number, number], axis, angle);
                        if (new THREE.Vector3(...rv).dot(new THREE.Vector3(...bestParallelDirection)) > 0.6) {
                            const rotatedCellsCandidate = rotateCells(cellsForProcessing, axis, angle, centroidForRotation);
                            
                            // Does it need retreat? Check basic grid bounds and other bodies
                            const tempCyto = computeCytoplasm(new Set(rotatedCellsCandidate.map(c => makeKey(...c))), gridSize);
                            const bounding = getBoundingBoxDimensions(Array.from(tempCyto).map(parseKey));
                            let rx = 0, ry = 0, rz = 0;
                            if (avoidanceNormal[0] > 0) rx = (gridSize - 1) - bounding.maxX;
                            if (avoidanceNormal[0] < 0) rx = 0 - bounding.minX;
                            if (avoidanceNormal[1] > 0) ry = (gridSize - 1) - bounding.maxY;
                            if (avoidanceNormal[1] < 0) ry = 0 - bounding.minY;
                            if (avoidanceNormal[2] > 0) rz = (gridSize - 1) - bounding.maxZ;
                            if (avoidanceNormal[2] < 0) rz = 0 - bounding.minZ;

                            const finalCandidate = translateCells(rotatedCellsCandidate, rx, ry, rz);
                            if (checkAdjustmentSafe(finalCandidate)) {
                                nextCells = finalCandidate;
                                travelVector = rv as [number, number, number];
                                nextVector = rv as [number, number, number];
                                finalizedTranslation = true;
                                safeCandidateFound = true;
                                break;
                            }
                        }
                    }
                    if (safeCandidateFound) break;
                }"""

replace_str = """                // Map all 24 orientation attempts
                let attempts = ALL_24_ORIENTATIONS.map(ops => {
                    let rv = [...currentTravelVector] as [number, number, number];
                    let candidateCells = [...cellsForProcessing];
                    for (const [axis, angle] of ops) {
                        rv = rotateVector(rv, axis, angle);
                        candidateCells = rotateCells(candidateCells, axis, angle, centroidForRotation);
                    }
                    
                    // Does it need retreat?
                    const tempCyto = computeCytoplasm(new Set(candidateCells.map(c => makeKey(...c))), gridSize);
                    const bounding = getBoundingBoxDimensions(Array.from(tempCyto).map(parseKey));
                    let rx = 0, ry = 0, rz = 0;
                    if (avoidanceNormal[0] > 0) rx = (gridSize - 1) - bounding.maxX;
                    if (avoidanceNormal[0] < 0) rx = 0 - bounding.minX;
                    if (avoidanceNormal[1] > 0) ry = (gridSize - 1) - bounding.maxY;
                    if (avoidanceNormal[1] < 0) ry = 0 - bounding.minY;
                    if (avoidanceNormal[2] > 0) rz = (gridSize - 1) - bounding.maxZ;
                    if (avoidanceNormal[2] < 0) rz = 0 - bounding.minZ;

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
                }"""

new_code = new_code.replace(search_str, replace_str)

with open('src/core/organism-processing.ts', 'w') as f:
    f.write(new_code)
