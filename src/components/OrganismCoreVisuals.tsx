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
	onClick?: (e: any, organism: Organism) => void;
}

export function OrganismCoreVisuals({
	organisms,
	organismsVersion,
	gridSize,
	cellMargin,
	onClick,
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
					onClick={onClick}
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
	onClick?: (e: any, organism: Organism) => void;
}

function OrganismCoreMesh({
	organism,
	organismsVersion,
	gridSize,
	cellMargin,
	onClick,
}: OrganismCoreMeshProps) {
	const sphereMeshRef = useRef<THREE.InstancedMesh>(null);
	const beamMeshRef = useRef<THREE.InstancedMesh>(null);

	const offset = (gridSize - 1) / 2;
	// CHANGE: Make spheres 0.75 times the width of cell diameter
	const sphereRadius = (1 - cellMargin) * 0.375;
	const beamRadius = sphereRadius / 4; // 50% smaller (was /2)
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
				// Face neighbors (6)
				makeKey(x + 1, y, z), makeKey(x - 1, y, z),
				makeKey(x, y + 1, z), makeKey(x, y - 1, z),
				// Edge neighbors (12)
				makeKey(x + 1, y + 1, z), makeKey(x + 1, y - 1, z),
				makeKey(x - 1, y + 1, z), makeKey(x - 1, y - 1, z),
				makeKey(x + 1, y, z + 1), makeKey(x + 1, y, z - 1),
				makeKey(x - 1, y, z + 1), makeKey(x - 1, y, z - 1),
				makeKey(x, y + 1, z + 1), makeKey(x, y + 1, z - 1),
				makeKey(x, y - 1, z + 1), makeKey(x, y - 1, z - 1),
				// Corner neighbors (8)
				makeKey(x + 1, y + 1, z + 1), makeKey(x + 1, y + 1, z - 1),
				makeKey(x + 1, y - 1, z + 1), makeKey(x + 1, y - 1, z - 1),
				makeKey(x - 1, y + 1, z + 1), makeKey(x - 1, y + 1, z - 1),
				makeKey(x - 1, y - 1, z + 1), makeKey(x - 1, y - 1, z - 1),
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


	const sphereColor = useMemo(() => new THREE.Color(0xffffff), []);
	const emissiveColor = useMemo(() => new THREE.Color(0xffffff), []); // White for glow

	const targetObject = useMemo(() => new THREE.Object3D(), []);
	useEffect(() => {
		if (organism.travelVector) {
			targetObject.position.set(
				organism.travelVector[0] * 10,
				organism.travelVector[1] * 10,
				-organism.travelVector[2] * 10
			);
		}
	}, [organism.travelVector, targetObject]);


	return (
		<group>
			{/* Spheres for living cells */}
			<instancedMesh 
				ref={sphereMeshRef} 
				args={[undefined, undefined, MAX_CORE_INSTANCES]}
				onClick={(e) => onClick?.(e, organism)}
			>
				<sphereGeometry args={[sphereRadius, 8, 8]} /> {/* Low poly sphere for performance */}
				<meshStandardMaterial
					color={sphereColor}
					metalness={0.5}
					roughness={0.4}
				/>
			</instancedMesh>

			{/* Beams for connections */}
			<instancedMesh ref={beamMeshRef} args={[undefined, undefined, MAX_BEAM_INSTANCES]}>
				<cylinderGeometry args={[beamRadius, beamRadius, 1, 8]} /> {/* 8 segments for smoother cylinders */}
				<meshStandardMaterial 
					color={sphereColor} 
					metalness={0.5}
					roughness={0.4}
				/>
			</instancedMesh>

			{/* Navigation Arrow and Spotlight */}
			{organism.centroid && organism.travelVector && (
				<group position={new THREE.Vector3(...organism.centroid).set(organism.centroid[0] - offset, organism.centroid[1] - offset, gridSize - 1 - organism.centroid[2] - offset)}>
					{/* Travel Vector Arrow */}
					<primitive 
						object={new THREE.ArrowHelper(
							new THREE.Vector3(...organism.travelVector).set(organism.travelVector[0], organism.travelVector[1], -organism.travelVector[2]), 
							new THREE.Vector3(0, 0, 0), 
							1.5, 
							0xffffff,
							0.4,
							0.2
						)} 
					/>
					{/* Directional Spotlight */}
					<spotLight
						color={organism.skinColor}
						intensity={500} // Extra strong to hit walls
						distance={24}
						angle={15 * (Math.PI / 180)} // 15 degrees spread
						penumbra={0.3}
						position={[0, 0, 0]}
						target={targetObject}
					/>
					<primitive object={targetObject} />
				</group>
			)}
		</group>
	);
}
