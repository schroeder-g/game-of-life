import * as THREE from 'three';
import { ShapeType, generateShape } from './shapes';

/**
 * Checks if at least one cell of the brush (at the given selector position and rotation)
 * is within the grid boundaries [0, gridSize - 1].
 */
export function isAnyBrushCellInside(
	pos: [number, number, number],
	shape: ShapeType,
	size: number,
	isHollow: boolean,
	quaternion: THREE.Quaternion,
	gridSize: number,
	customOffsets?: [number, number, number][],
): boolean {
	if (shape === 'None') {
		return (
			pos[0] >= 0 &&
			pos[0] < gridSize &&
			pos[1] >= 0 &&
			pos[1] < gridSize &&
			pos[2] >= 0 &&
			pos[2] < gridSize
		);
	}

	const offsets = generateShape(shape, size, isHollow, customOffsets);
	return offsets.some(([dx, dy, dz]) => {
		const v = new THREE.Vector3(dx, dy, dz);
		v.applyQuaternion(quaternion);
		const tx = Math.round(v.x) + pos[0];
		const ty = Math.round(v.y) + pos[1];
		const tz = Math.round(v.z) + pos[2];

		return (
			tx >= 0 &&
			tx < gridSize &&
			ty >= 0 &&
			ty < gridSize &&
			tz >= 0 &&
			tz < gridSize
		);
	});
}
