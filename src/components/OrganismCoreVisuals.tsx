import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Organism } from '../core/Organism';
import { parseKey, makeKey } from '../core/Organism';

// AiReminder: Test OrganismCoreVisuals component renders spheres and beams correctly for various organisms and updates on change.

const MAX_CORE_INSTANCES = 1000; // Max number of spheres (living cells) per organism
const MAX_BEAM_INSTANCES = 3000; // Max number of beams (connections) per organism (each cell can have up to 6 neighbors)

interface OrganismCoreVisualsProps {
	organisms: Map<string, Organism>;
	organismsVersion: number; // To trigger re-render when organisms change
	gridSize: number;
	cellMargin: number;
}

export function OrganismCoreVisuals({
	organisms,
	organismsVersion,
	gridSize,
	cellMargin,
}: OrganismCoreVisualsProps) {
	const orgList = Array.from(organisms.values());

	return (
		<>
			{orgList.map(organism => (
				<OrganismCoreMesh
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

interface OrganismCoreMeshProps {
	organism: Organism;
	organismsVersion: number;
	gridSize: number;
	cellMargin: number;
}

function OrganismCoreMesh({
	organism,
	organismsVersion,
	gridSize,
	cellMargin,
}: OrganismCoreMeshProps) {
	const sphereMeshRef = useRef<THREE.InstancedMesh>(null);
	const beamMeshRef = useRef<THREE.InstancedMesh>(null);

	const offset = (gridSize - 1) / 2;
	// CHANGE: Make spheres tinier (e.g., 1/8th of cell width instead of 1/4)
	const sphereRadius = (1 - cellMargin) / 4; // Make spheres larger for better visibility
	const beamRadius = sphereRadius / 2; // Adjust beam radius to be relative to new sphere size
	const beamLength = (1 - cellMargin) - (2 * sphereRadius); // Distance between sphere surfaces

	// Memoize data for spheres and beams
	const { sphereData, beamData } = useMemo(() => {
		const currentLivingCells = organism.livingCells;
		const spherePositions: Array<[number, number, number]> = [];
		const beamTransforms: Array<{ position: THREE.Vector3; quaternion: THREE.Quaternion; length: number }> = [];

		const tempVec1 = new THREE.Vector3();
		const tempVec2 = new THREE.Vector3();
		const tempQuaternion = new THREE.Quaternion();
		const upVector = new THREE.Vector3(0, 1, 0); // Default cylinder orientation

		currentLivingCells.forEach(key => {
			const [x, y, z] = parseKey(key);
			// Sphere position (centered in the cell)
			spherePositions.push([x - offset, y - offset, gridSize - 1 - z - offset]);

			// Check neighbors for beams (only direct face neighbors)
			const neighbors = [
				makeKey(x + 1, y, z), makeKey(x - 1, y, z),
				makeKey(x, y + 1, z), makeKey(x, y - 1, z),
				makeKey(x, y, z + 1), makeKey(x, y, z - 1),
			];

			neighbors.forEach(neighborKey => {
				if (currentLivingCells.has(neighborKey)) {
					const [nx, ny, nz] = parseKey(neighborKey);

					// Ensure each beam is only added once (e.g., from lower-coord cell to higher-coord cell)
					// This simple comparison works for unique pairs regardless of axis
					if (key < neighborKey) {
						tempVec1.set(x - offset, y - offset, gridSize - 1 - z - offset);
						tempVec2.set(nx - offset, ny - offset, gridSize - 1 - nz - offset);

						const direction = new THREE.Vector3().subVectors(tempVec2, tempVec1).normalize();

						// Adjust beam start/end to connect to the surface of the spheres
						const beamStart = new THREE.Vector3().copy(tempVec1).add(direction.clone().multiplyScalar(sphereRadius));
						const beamEnd = new THREE.Vector3().copy(tempVec2).sub(direction.clone().multiplyScalar(sphereRadius));
						const actualBeamMidPoint = new THREE.Vector3().addVectors(beamStart, beamEnd).multiplyScalar(0.5);
						const actualBeamLength = beamStart.distanceTo(beamEnd);

						tempQuaternion.setFromUnitVectors(upVector, direction);

						beamTransforms.push({
							position: actualBeamMidPoint,
							quaternion: tempQuaternion.clone(),
							length: actualBeamLength,
						});
					}
				}
			});
		});

		return { sphereData: spherePositions, beamData: beamTransforms };
	}, [organism.livingCells, organismsVersion, gridSize, offset, sphereRadius, beamLength]);


	// Update sphere instances
	useEffect(() => {
		const mesh = sphereMeshRef.current;
		if (!mesh) return;

		const tempObject = new THREE.Object3D();
		sphereData.forEach((pos, i) => {
			tempObject.position.set(pos[0], pos[1], pos[2]);
			tempObject.updateMatrix();
			mesh.setMatrixAt(i, tempObject.matrix);
		});
		mesh.instanceMatrix.needsUpdate = true;
		mesh.count = sphereData.length;
	}, [sphereData]);

	// Update beam instances
	useEffect(() => {
		const mesh = beamMeshRef.current;
		if (!mesh) return;

		const tempObject = new THREE.Object3D();
		beamData.forEach((transform, i) => {
			tempObject.position.copy(transform.position);
			tempObject.quaternion.copy(transform.quaternion);
			tempObject.scale.set(1, transform.length, 1); // Cylinder is Y-up by default, so scale Y for length
			tempObject.updateMatrix();
			mesh.setMatrixAt(i, tempObject.matrix);
		});
		mesh.instanceMatrix.needsUpdate = true;
		mesh.count = beamData.length;
	}, [beamData]);


	// Pulsing effect for spheres
	const sphereColor = useMemo(() => new THREE.Color(organism.skinColor), [organism.skinColor]);
	const emissiveColor = useMemo(() => new THREE.Color(0xffffff), []); // White for pulsing

	useFrame(({ clock }) => {
		if (sphereMeshRef.current && sphereMeshRef.current.material) {
			const time = clock.getElapsedTime();
			// Sine wave from 0 to 1 over 2 seconds (Math.PI * time / 2)
			const pulseFactor = (Math.sin(time * Math.PI) + 1) / 2;
			// Increase base and peak emissive intensity for a stronger glow
			const intensity = 2.0 + (pulseFactor * 3.0); // Pulse from 2.0 to 5.0 intensity
			(sphereMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
		}
	});


	return (
		<group>
			{/* Spheres for living cells */}
			<instancedMesh ref={sphereMeshRef} args={[undefined, undefined, MAX_CORE_INSTANCES]}>
				<sphereGeometry args={[sphereRadius, 8, 8]} /> {/* Low poly sphere for performance */}
				<meshStandardMaterial
					color={sphereColor}
					emissive={emissiveColor}
					emissiveIntensity={2.0} // Base emissive intensity
				/>
			</instancedMesh>

			{/* Beams for connections */}
			<instancedMesh ref={beamMeshRef} args={[undefined, undefined, MAX_BEAM_INSTANCES]}>
				<cylinderGeometry args={[beamRadius, beamRadius, 1, 4]} /> {/* Thin cylinder, length 1 */}
				<meshStandardMaterial color={organism.skinColor} />
			</instancedMesh>
		</group>
	);
}
