import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Organism } from '../core/Organism';
import { parseKey, makeKey } from '../core/Organism';

const MAX_SKIN_INSTANCES = 6000;

interface OrganismSkinsProps {
	organisms: Map<string, Organism>;
	organismsVersion: number;
	gridSize: number;
	cellMargin: number;
}

/**
 * OrganismSkins renders the "organism skin" — the thin layer of grid cells
 * that sit just outside each organism's cytoplasm.
 *
 * Rules:
 *  - A skin cell is any grid cell that is a face/edge/corner neighbor of a
 *    cytoplasm cell, but is itself neither a living cell nor cytoplasm of
 *    ANY organism.
 *  - If a skin cell is claimed by only one organism → white, 2% opacity.
 *  - If claimed by two or more organisms → orange, 2% opacity  (they are
 *    getting close to each other).
 */
export function OrganismSkins({
	organisms,
	organismsVersion,
	gridSize,
	cellMargin,
}: OrganismSkinsProps) {
	// Collect every cell that belongs to any organism (living or cytoplasm)
	// so we can exclude them from the skin layer.
	const allOrgBodyKeys = useMemo(() => {
		const set = new Set<string>();
		for (const org of organisms.values()) {
			org.livingCells.forEach(k => set.add(k));
			org.cytoplasm.forEach(k => set.add(k));
		}
		return set;
	}, [organisms, organismsVersion]);

	// For each organism compute its skin cells, then find overlaps.
	const { whiteCells, orangeCells } = useMemo(() => {
		// Map from skin cell key → count of organisms claiming it.
		const skinCounts = new Map<string, number>();

		for (const org of organisms.values()) {
			const orgSkin = new Set<string>();

			for (const cytoKey of org.cytoplasm) {
				const [cx, cy, cz] = parseKey(cytoKey);

				// All 26 neighbors of each cytoplasm cell.
				for (let dz = -1; dz <= 1; dz++) {
					for (let dy = -1; dy <= 1; dy++) {
						for (let dx = -1; dx <= 1; dx++) {
							if (dx === 0 && dy === 0 && dz === 0) continue;
							const nx = cx + dx, ny = cy + dy, nz = cz + dz;
							if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize || nz < 0 || nz >= gridSize) continue;
							const nk = makeKey(nx, ny, nz);
							// Must not be inside any organism.
							if (!allOrgBodyKeys.has(nk)) {
								orgSkin.add(nk);
							}
						}
					}
				}
			}

			// Tally how many organisms claim each skin cell.
			for (const k of orgSkin) {
				skinCounts.set(k, (skinCounts.get(k) ?? 0) + 1);
			}
		}

		// Split into white (count === 1) and orange (count > 1).
		const whiteCells: Array<[number, number, number]> = [];
		const orangeCells: Array<[number, number, number]> = [];
		const offset = (gridSize - 1) / 2;

		for (const [key, count] of skinCounts) {
			const [x, y, z] = parseKey(key);
			const wp: [number, number, number] = [x - offset, y - offset, gridSize - 1 - z - offset];
			if (count === 1) whiteCells.push(wp);
			else orangeCells.push(wp);
		}

		return { whiteCells, orangeCells };
	}, [organisms, organismsVersion, allOrgBodyKeys, gridSize]);

	const sphereRadius = (1 - cellMargin) / 2 * 0.5;

	return (
		<>
			<SkinInstancedMesh
				key="white"
				positions={whiteCells}
				color="#ffffff"
				opacity={0.1}
				sphereRadius={sphereRadius}
			/>
			<SkinInstancedMesh
				key="orange"
				positions={orangeCells}
				color="#ff6600"
				opacity={0.5}
				sphereRadius={sphereRadius}
			/>
		</>
	);
}

function SkinInstancedMesh({
	positions,
	color,
	opacity,
	sphereRadius,
}: {
	positions: Array<[number, number, number]>;
	color: string;
	opacity: number;
	sphereRadius: number;
}) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const threeColor = useMemo(() => new THREE.Color(color), [color]);

	useEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;
		const obj = new THREE.Object3D();
		const count = Math.min(positions.length, MAX_SKIN_INSTANCES);
		for (let i = 0; i < count; i++) {
			const [x, y, z] = positions[i];
			obj.position.set(x, y, z);
			obj.scale.setScalar(1);
			obj.updateMatrix();
			mesh.setMatrixAt(i, obj.matrix);
		}
		mesh.count = count;
		mesh.instanceMatrix.needsUpdate = true;
	}, [positions]);

	if (positions.length === 0) return null;

	return (
		<instancedMesh
			ref={meshRef}
			args={[undefined, undefined, MAX_SKIN_INSTANCES]}
			renderOrder={0}
			raycast={() => null}
		>
			<sphereGeometry args={[sphereRadius, 6, 6]} />
			<meshStandardMaterial
				color={threeColor}
				transparent={true}
				opacity={opacity}
				depthWrite={false}
				roughness={1.0}
				metalness={0.0}
			/>
		</instancedMesh>
	);
}
