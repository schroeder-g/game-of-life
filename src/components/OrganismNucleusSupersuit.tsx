
import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Organism, parseKey, makeKey } from '../core/Organism';

const MAX_SUPERSUIT_INSTANCES = 1000;
const MAX_SUPERSUIT_BEAM_INSTANCES = 3000;

interface OrganismNucleusSupersuitProps {
	organisms: Map<string, Organism>;
	organismsVersion: number;
	gridSize: number;
	cellMargin: number;
}

/**
 * OrganismNucleusSupersuit renders a "supersuit" around the organism's core.
 * It uses InstancedMesh for performance and to avoid the memory leaks of geometry merging.
 */
export function OrganismNucleusSupersuit({
	organisms,
	organismsVersion,
	gridSize,
	cellMargin,
}: OrganismNucleusSupersuitProps) {
	const orgList = Array.from(organisms.values());

	return (
		<>
			{orgList.map(organism => (
				<OrganismSupersuitMesh
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

function OrganismSupersuitMesh({
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
	const sphereMeshRef = useRef<THREE.InstancedMesh>(null);
	const beamMeshRef = useRef<THREE.InstancedMesh>(null);

	const offset = (gridSize - 1) / 2;
	// Core dimensions for reference
	const sphereRadiusCore = (1 - cellMargin) / 4;
	const beamRadiusCore = sphereRadiusCore / 2;

	// Supersuit dimensions (Smooth and rounded, clinging to the skeleton)
	const sphereRadiusSupersuit = sphereRadiusCore * 1.6; // 1.6x core for a "bloopy" look
	// Thick beams that "cling" and merge with the spheres
	const beamRadiusSupersuit = sphereRadiusSupersuit * 0.8;

	const { sphereData, beamData } = useMemo(() => {
		const currentLivingCells = organism.livingCells;
		const spherePositions: Array<[number, number, number]> = [];
		const beamTransforms: Array<{ position: THREE.Vector3; quaternion: THREE.Quaternion; length: number }> = [];

		const tempVec1 = new THREE.Vector3();
		const tempVec2 = new THREE.Vector3();
		const upVector = new THREE.Vector3(0, 1, 0);

		currentLivingCells.forEach(key => {
			const [x, y, z] = parseKey(key);
			const pos = [x - offset, y - offset, gridSize - 1 - z - offset] as [number, number, number];
			spherePositions.push(pos);

			// Neighbors for beams
			const neighbors = [
				// Face neighbors
				makeKey(x + 1, y, z), makeKey(x - 1, y, z),
				makeKey(x, y + 1, z), makeKey(x, y - 1, z),
				// Edge neighbors
				makeKey(x + 1, y + 1, z), makeKey(x + 1, y - 1, z),
				makeKey(x - 1, y + 1, z), makeKey(x - 1, y - 1, z),
				makeKey(x + 1, y, z + 1), makeKey(x + 1, y, z - 1),
				makeKey(x - 1, y, z + 1), makeKey(x - 1, y, z - 1),
				makeKey(x, y + 1, z + 1), makeKey(x, y + 1, z - 1),
				makeKey(x, y - 1, z + 1), makeKey(x, y - 1, z - 1),
				// Corner neighbors
				makeKey(x + 1, y + 1, z + 1), makeKey(x + 1, y + 1, z - 1),
				makeKey(x + 1, y - 1, z + 1), makeKey(x + 1, y - 1, z - 1),
				makeKey(x - 1, y + 1, z + 1), makeKey(x - 1, y + 1, z - 1),
				makeKey(x - 1, y - 1, z + 1), makeKey(x - 1, y - 1, z - 1),
			];

			neighbors.forEach(neighborKey => {
				if (currentLivingCells.has(neighborKey)) {
					if (key < neighborKey) {
						const [nx, ny, nz] = parseKey(neighborKey);
						tempVec1.set(x - offset, y - offset, gridSize - 1 - z - offset);
						tempVec2.set(nx - offset, ny - offset, gridSize - 1 - nz - offset);

						const direction = new THREE.Vector3().subVectors(tempVec2, tempVec1).normalize();
						// Beams connect from sphere surface to sphere surface
						const beamStart = tempVec1.clone().add(direction.clone().multiplyScalar(sphereRadiusSupersuit * 0.5));
						const beamEnd = tempVec2.clone().sub(direction.clone().multiplyScalar(sphereRadiusSupersuit * 0.5));
						const midPoint = new THREE.Vector3().addVectors(beamStart, beamEnd).multiplyScalar(0.5);
						const length = beamStart.distanceTo(beamEnd);

						const quat = new THREE.Quaternion().setFromUnitVectors(upVector, direction);

						beamTransforms.push({
							position: midPoint,
							quaternion: quat,
							length: length,
						});
					}
				}
			});
		});

		return { sphereData: spherePositions, beamData: beamTransforms };
	}, [organism.livingCells, organismsVersion, gridSize, offset, sphereRadiusSupersuit]);

	useEffect(() => {
		if (!sphereMeshRef.current) return;
		const tempObject = new THREE.Object3D();
		sphereData.forEach((pos, i) => {
			tempObject.position.set(pos[0], pos[1], pos[2]);
			tempObject.updateMatrix();
			sphereMeshRef.current!.setMatrixAt(i, tempObject.matrix);
		});
		sphereMeshRef.current.count = sphereData.length;
		sphereMeshRef.current.instanceMatrix.needsUpdate = true;
	}, [sphereData]);

	useEffect(() => {
		if (!beamMeshRef.current) return;
		const tempObject = new THREE.Object3D();
		beamData.forEach((transform, i) => {
			tempObject.position.copy(transform.position);
			tempObject.quaternion.copy(transform.quaternion);
			tempObject.scale.set(1, transform.length, 1);
			tempObject.updateMatrix();
			beamMeshRef.current!.setMatrixAt(i, tempObject.matrix);
		});
		beamMeshRef.current.count = beamData.length;
		beamMeshRef.current.instanceMatrix.needsUpdate = true;
	}, [beamData]);

	const redColor = useMemo(() => new THREE.Color('#ff0000'), []); // Brighter red
	const crimsonEmissive = useMemo(() => new THREE.Color('#ff2222'), []); // Brighter red emissive

	useFrame(({ clock }) => {
		const time = clock.getElapsedTime();
		if (sphereMeshRef.current && sphereMeshRef.current.material) {
			const pulse = (Math.sin(time * 3) + 1) / 2;
			// Brighter pulses (2.0 to 5.0 base intensity)
			(sphereMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.0 + pulse * 3.0;
		}
		if (beamMeshRef.current && beamMeshRef.current.material) {
			const pulse = (Math.sin(time * 3) + 1) / 2;
			(beamMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + pulse * 3.5;
		}
	});

	return (
		<group>
			{/* Smooth Organic Skeleton Nodes (Spheres) */}
			<instancedMesh ref={sphereMeshRef} args={[undefined, undefined, MAX_SUPERSUIT_INSTANCES]}>
				<sphereGeometry args={[sphereRadiusSupersuit, 16, 16]} />
				<meshStandardMaterial
					color={redColor}
					transparent={false}
					opacity={1.0}
					depthWrite={true}
					emissive={crimsonEmissive}
					emissiveIntensity={2.0}
					roughness={0.15}
					metalness={0.8}
				/>
			</instancedMesh>

			{/* Smooth Organic Skeleton Beams (Thickened Cylinders) */}
			<instancedMesh ref={beamMeshRef} args={[undefined, undefined, MAX_SUPERSUIT_BEAM_INSTANCES]}>
				<cylinderGeometry args={[beamRadiusSupersuit, beamRadiusSupersuit, 1, 12]} />
				<meshStandardMaterial
					color={redColor}
					transparent={false}
					opacity={1.0}
					depthWrite={true}
					emissive={crimsonEmissive}
					emissiveIntensity={1.5}
					roughness={0.15}
					metalness={0.8}
				/>
			</instancedMesh>
		</group>
	);
}

