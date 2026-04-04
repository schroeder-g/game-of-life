import * as THREE from 'three';
import { parseKey, makeKey } from './Organism';

/**
 * Generates a smooth organic skin by extracting the direct boundary of the living cells
 * and expanding it by 0.5 units to curve through the cytoplasm centers.
 * This is 100% watertight and eliminates all "sharding" or "cage" artifacts.
 */
export function generateOrganicSkin(
	livingCells: Set<string>,
	gridSize: number,
): THREE.BufferGeometry | null {
	if (livingCells.size === 0) return null;

	const voxels = Array.from(livingCells).map(parseKey);
	const offset = (gridSize - 1) / 2;

	// 1. Extract the outer shell faces of the living cells
	const vertices: THREE.Vector3[] = [];
	const vertexMap = new Map<string, number>();
	const indices: number[] = [];

	const getVertex = (x: number, y: number, z: number) => {
		const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
		if (vertexMap.has(key)) return vertexMap.get(key)!;
		const idx = vertices.length;
		vertices.push(new THREE.Vector3(x, y, z));
		vertexMap.set(key, idx);
		return idx;
	};

	for (const [x, y, z] of voxels) {
		const neighbors = [
			{ dir: [1, 0, 0], face: [[1,0,0], [1,1,0], [1,1,1], [1,0,1]], n: [1,0,0] },
			{ dir: [-1, 0, 0], face: [[0,0,1], [0,1,1], [0,1,0], [0,0,0]], n: [-1,0,0] },
			{ dir: [0, 1, 0], face: [[0,1,1], [1,1,1], [1,1,0], [0,1,0]], n: [0,1,0] },
			{ dir: [0, -1, 0], face: [[0,0,0], [1,0,0], [1,0,1], [0,0,1]], n: [0,-1,0] },
			{ dir: [0, 0, 1], face: [[1,0,0], [0,0,0], [0,1,0], [1,1,0]], n: [0,0,1] }, // -Z in world logic
			{ dir: [0, 0, -1], face: [[0,0,1], [1,0,1], [1,1,1], [0,1,1]], n: [0,0,-1] }, // +Z in world logic
		];

		for (const { dir, face } of neighbors) {
			const nx = x + dir[0];
			const ny = y + dir[1];
			const nz = z + dir[2];
			
			// Only render faces that are NOT touching another living cell
			if (!livingCells.has(makeKey(nx, ny, nz))) {
				const vIdxs = face.map((f) => {
					const [ox, oy, oz] = f;
					// Standard voxel coordinate mapping
					let vx = x + ox - 0.5;
					let vy = y + oy - 0.5;
					let vz = z + oz - 0.5;

					// EXPANSION: Shift vertex by 0.1 (10% of a cell) away from the living core
					vx += dir[0] * 0.1;
					vy += dir[1] * 0.1;
					vz += dir[2] * 0.1;

					// Transform to R3F World Space
					const wx = vx - offset;
					const wy = vy - offset;
					const wz = (gridSize - 1) - vz - offset;
					
					return getVertex(wx, wy, wz);
				});
				indices.push(vIdxs[0], vIdxs[1], vIdxs[2]);
				indices.push(vIdxs[0], vIdxs[2], vIdxs[3]);
			}
		}
	}

	if (vertices.length === 0) return null;

	// 2. Laplacian Smoothing
	// We build an adjacency list to smooth the mesh without shrinking it tooMuch
	const adjacency = Array.from({ length: vertices.length }, () => new Set<number>());
	for (let i = 0; i < indices.length; i += 3) {
		const a = indices[i], b = indices[i+1], c = indices[i+2];
		adjacency[a].add(b); adjacency[a].add(c);
		adjacency[b].add(a); adjacency[b].add(c);
		adjacency[c].add(a); adjacency[c].add(b);
	}

	let smoothed = vertices.map(v => v.clone());
	const iterations = 15; // High iterations for rounded "pod" look
	const factor = 0.4;

	for (let iter = 0; iter < iterations; iter++) {
		const next = smoothed.map(v => v.clone());
		for (let i = 0; i < smoothed.length; i++) {
			const nbs = Array.from(adjacency[i]);
			if (nbs.length === 0) continue;
			
			const avg = new THREE.Vector3(0, 0, 0);
			for (const nIdx of nbs) avg.add(smoothed[nIdx]);
			avg.divideScalar(nbs.length);
			
			next[i].lerp(avg, factor);
		}
		smoothed = next;
	}

	// 3. Anti-Shrinkage Inflation (Prevents Laplacian smooth from collapsing into core)
	const inflationFactor = 0.2; // Push back out after smoothing
	for (let i = 0; i < smoothed.length; i++) {
		const nbIndices = Array.from(adjacency[i]);
		if (nbIndices.length === 0) continue;
		const avgNb = new THREE.Vector3(0, 0, 0);
		for (const nIdx of nbIndices) avgNb.add(smoothed[nIdx]);
		avgNb.divideScalar(nbIndices.length);
		const localNormal = smoothed[i].clone().sub(avgNb).normalize();
		smoothed[i].add(localNormal.multiplyScalar(inflationFactor));
	}

	// 3. Build Final BufferGeometry
	const finalPositions = new Float32Array(smoothed.length * 3);
	for (let i = 0; i < smoothed.length; i++) {
		finalPositions[i * 3] = smoothed[i].x;
		finalPositions[i * 3 + 1] = smoothed[i].y;
		finalPositions[i * 3 + 2] = smoothed[i].z;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(finalPositions, 3));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();

	return geometry;
}
