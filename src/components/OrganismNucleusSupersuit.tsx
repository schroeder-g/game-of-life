
import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'; // Import for merging geometries
import { Organism } from '../core/Organism';
import { parseKey, makeKey } from '../core/Organism';

// AiReminder: Test OrganismNucleusSupersuit component renders a merged mesh that clings to the organism's core.

interface OrganismNucleusSupersuitProps {
	organisms: Map<string, Organism>;
	organismsVersion: number; // To trigger re-render when organisms change
	gridSize: number;
	cellMargin: number;
}

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

interface OrganismSupersuitMeshProps {
	organism: Organism;
	organismsVersion: number;
	gridSize: number;
	cellMargin: number;
}

function OrganismSupersuitMesh({
	organism,
	organismsVersion,
	gridSize,
	cellMargin,
}: OrganismSupersuitMeshProps) {
	const meshRef = useRef<THREE.Mesh>(null);

	const offset = (gridSize - 1) / 2;
	const sphereRadiusCore = (1 - cellMargin) / 4;
	const beamRadiusCore = sphereRadiusCore / 3;

	// Supersuit dimensions (slightly larger than core visuals)
	const sphereRadiusSupersuit = sphereRadiusCore * 1.2;
	const beamRadiusSupersuit = beamRadiusCore * 1.5;
	const beamLengthSupersuit = (1 - cellMargin) - (2 * sphereRadiusSupersuit);

	const mergedGeometry = useMemo(() => {
		const geometries: THREE.BufferGeometry[] = [];
		const currentLivingCells = organism.livingCells;

		const tempVec1 = new THREE.Vector3();
		const tempVec2 = new THREE.Vector3();
		const upVector = new THREE.Vector3(0, 1, 0);

		currentLivingCells.forEach(key => {
			const [x, y, z] = parseKey(key);
			const spherePos = new THREE.Vector3(x - offset, y - offset, gridSize - 1 - z - offset);

			// Create sphere geometry for each living cell
			const sphereGeom = new THREE.SphereGeometry(sphereRadiusSupersuit, 8, 8);
			sphereGeom.translate(spherePos.x, spherePos.y, spherePos.z);
			geometries.push(sphereGeom);

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
					if (key < neighborKey) {
						tempVec1.set(x - offset, y - offset, gridSize - 1 - z - offset);
						tempVec2.set(nx - offset, ny - offset, gridSize - 1 - nz - offset);

						const direction = new THREE.Vector3().subVectors(tempVec2, tempVec1).normalize();

						// Adjust beam start/end to connect to the surface of the supersuit spheres
						const beamStart = new THREE.Vector3().copy(tempVec1).add(direction.clone().multiplyScalar(sphereRadiusSupersuit));
						const beamEnd = new THREE.Vector3().copy(tempVec2).sub(direction.clone().multiplyScalar(sphereRadiusSupersuit));
						const actualBeamMidPoint = new THREE.Vector3().addVectors(beamStart, beamEnd).multiplyScalar(0.5);
						const actualBeamLength = beamStart.distanceTo(beamEnd);

						// Create cylinder geometry for the beam
						const cylinderGeom = new THREE.CylinderGeometry(beamRadiusSupersuit, beamRadiusSupersuit, actualBeamLength, 4);
						cylinderGeom.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2)); // Align cylinder along X axis initially

						const beamQuaternion = new THREE.Quaternion().setFromUnitVectors(upVector, direction);
						cylinderGeom.applyQuaternion(beamQuaternion);
						cylinderGeom.translate(actualBeamMidPoint.x, actualBeamMidPoint.y, actualBeamMidPoint.z);
						geometries.push(cylinderGeom);
					}
				}
			});
		});

		if (geometries.length === 0) return null;

		// Merge all geometries into a single BufferGeometry
		const merged = BufferGeometryUtils.mergeBufferGeometries(geometries);
		return merged;

	}, [organism.livingCells, organismsVersion, gridSize, offset, sphereRadiusSupersuit, beamRadiusSupersuit, beamLengthSupersuit]);


	if (!mergedGeometry) return null;

	return (
		<mesh ref={meshRef} geometry={mergedGeometry}>
			<meshStandardMaterial
				color={organism.skinColor}
				transparent
				opacity={0.05} // Very subtle transparency
				depthWrite={false}
				roughness={0.5}
				metalness={0.5}
			/>
		</mesh>
	);
}
