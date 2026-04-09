import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Organism } from '../core/Organism';
import { parseKey, makeKey } from '../core/Organism';

/** Maximum cytoplasm surface spheres per organism. */
const MAX_CYTO_INSTANCES = 4000;

interface CytoplasmSkinProps {
	organisms: Map<string, Organism>;
	organismsVersion: number;
	gridSize: number;
	cellMargin: number;
}

/**
 * CytoplasmSkin renders a translucent, hazy membrane around each organism's
 * cytoplasm. It places a semi-transparent sphere only on cytoplasm cells that
 * sit on the outer surface of the cytoplasm cloud (i.e., have at least one
 * neighbor that is neither living nor cytoplasm). This creates a skin-like
 * membrane effect rather than a solid volume.
 */
export function CytoplasmSkin({
	organisms,
	organismsVersion,
	gridSize,
	cellMargin,
}: CytoplasmSkinProps) {
	const orgList = useMemo(() => Array.from(organisms.values()), [organisms, organismsVersion]);

	return (
		<>
			{orgList.map(organism => (
				<CytoplasmSkinMesh
					key={organism.id}
					organism={organism}
					organismsVersion={organismsVersion}
					gridSize={gridSize}
					cellMargin={cellMargin}
				/>
			))}
		</>
	);
}

const FACE_DIRS: Array<[number, number, number]> = [
	[1, 0, 0], [-1, 0, 0],
	[0, 1, 0], [0, -1, 0],
	[0, 0, 1], [0, 0, -1],
];

function CytoplasmSkinMesh({
	organism,
	organismsVersion,
	gridSize,
	cellMargin,
}: {
	organism: Organism;
	organismsVersion: number;
	gridSize: number;
	cellMargin: number;
}) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const offset = (gridSize - 1) / 2;

	// Sphere sized to sit just outside the living cell layer — slightly larger
	// than the cytoplasm cell itself to create a "puffy membrane" feel.
	const sphereRadius = (1 - cellMargin) / 2 * 0.72;

	// Skin color parsed from the organism's hex string.
	const skinColor = useMemo(() => new THREE.Color(organism.skinColor), [organism.skinColor]);

	// Determine which cytoplasm cells are on the outer surface.
	const surfacePositions = useMemo(() => {
		const { livingCells, cytoplasm } = organism;
		const inner = new Set([...livingCells, ...cytoplasm]);
		const surface: Array<[number, number, number]> = [];

		for (const key of cytoplasm) {
			const [x, y, z] = parseKey(key);
			// A cytoplasm cell is on the surface if any face-neighbor is outside
			// both living cells and cytoplasm (i.e., open grid space or out of bounds).
			for (const [dx, dy, dz] of FACE_DIRS) {
				const nx = x + dx, ny = y + dy, nz = z + dz;
				if (
					nx < 0 || nx >= gridSize ||
					ny < 0 || ny >= gridSize ||
					nz < 0 || nz >= gridSize ||
					!inner.has(makeKey(nx, ny, nz))
				) {
					// World-space position (matching Supersuit coordinate transform).
					surface.push([
						x - offset,
						y - offset,
						gridSize - 1 - z - offset,
					]);
					break; // Only add this cell once.
				}
			}
		}

		return surface;
	}, [organism.livingCells, organism.cytoplasm, organismsVersion, gridSize, offset]);

	// Push instance matrices whenever the surface set changes.
	useEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;

		const obj = new THREE.Object3D();
		const count = Math.min(surfacePositions.length, MAX_CYTO_INSTANCES);

		for (let i = 0; i < count; i++) {
			const [wx, wy, wz] = surfacePositions[i];
			obj.position.set(wx, wy, wz);
			obj.scale.setScalar(1);
			obj.updateMatrix();
			mesh.setMatrixAt(i, obj.matrix);
		}

		mesh.count = count;
		mesh.instanceMatrix.needsUpdate = true;
	}, [surfacePositions]);

	if (surfacePositions.length === 0) return null;

	return (
		<instancedMesh
			ref={meshRef}
			args={[undefined, undefined, MAX_CYTO_INSTANCES]}
			renderOrder={1}
			raycast={() => null}
		>
			<sphereGeometry args={[sphereRadius, 8, 8]} />
			<meshStandardMaterial
				color={skinColor}
				transparent={true}
				opacity={0.18}
				depthWrite={false}
				roughness={1.0}
				metalness={0.0}
				side={THREE.FrontSide}
			/>
		</instancedMesh>
	);
}
