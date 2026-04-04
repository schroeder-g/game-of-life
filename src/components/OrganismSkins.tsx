import { useFrame } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { Organism } from '../core/Organism';
import { parseKey, computeCytoplasm } from '../core/Organism'; // Import computeCytoplasm

const MAX_SKIN_INSTANCES = 20000;

interface OrganismSkinsProps {
	organisms: Map<string, Organism>;
	organismsVersion: number;
	gridSize: number;
	cellMargin: number;
}

/**
 * Renders a semi-transparent instanced mesh for each organism's cytoplasm cells.
 * Each organism gets its own instancedMesh with the organism's average skin color.
 */
export function OrganismSkins({
	organisms,
	organismsVersion,
	gridSize,
	cellMargin,
}: OrganismSkinsProps) {
	// We render one mesh per organism. Since the organism count is small, this is fine.
	const orgList = Array.from(organisms.values());

	const offset = (gridSize - 1) / 2;
	const cellSize = 1 - cellMargin;

	// We build a stable array of organism renderers
	return (
		<>
			{orgList.map(organism => (
				<OrganismSkinMesh
					key={organism.id}
					organism={organism}
					organismsVersion={organismsVersion}
					offset={offset}
					cellSize={cellSize}
					gridSize={gridSize}
				/>
			))}
		</>
	);
}

/** Single organism cytoplasm renderer. */
function OrganismSkinMesh({
	organism,
	organismsVersion,
	offset,
	cellSize,
	gridSize,
}: {
	organism: Organism;
	organismsVersion: number;
	offset: number;
	cellSize: number;
	gridSize: number;
}) {
	const meshRef = useRef<THREE.InstancedMesh>(null);

	useEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;

		const cytoArray = Array.from(organism.cytoplasm);
		const count = Math.min(cytoArray.length, MAX_SKIN_INSTANCES);
		const tempObj = new THREE.Object3D();

		for (let i = 0; i < count; i++) {
			const [x, y, z] = parseKey(cytoArray[i]);
			tempObj.position.set(
				x - offset,
				y - offset,
				gridSize - 1 - z - offset,
			);
			tempObj.scale.set(1, 1, 1);
			tempObj.updateMatrix();
			mesh.setMatrixAt(i, tempObj.matrix);
		}

		mesh.count = count;
		mesh.instanceMatrix.needsUpdate = true;
		mesh.computeBoundingSphere();
	}, [organism.cytoplasm, organism.id, organismsVersion, offset, gridSize]);

	return (
		<instancedMesh
			ref={meshRef}
			args={[undefined, undefined, MAX_SKIN_INSTANCES]}
			raycast={() => null}
		>
			<boxGeometry args={[cellSize, cellSize, cellSize]} />
			<meshBasicMaterial
				color={organism.skinColor}
				transparent
				opacity={0.15}
				depthWrite={false}
			/>
		</instancedMesh>
	);
}
