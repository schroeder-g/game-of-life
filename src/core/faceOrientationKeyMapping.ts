// @vitest-environment jsdom
// AGENT INSTRUCTION:
// This file is the single source of truth for keyboard controls related to orientation.
// Do not add orientation-based keyboard logic elsewhere. Modify this file instead.
// All keyboard actions for rotation and translation should derive their behavior
// from the mappings defined in this file.

import * as THREE from 'three';

export type CameraFace =
	| 'front'
	| 'back'
	| 'top'
	| 'bottom'
	| 'right'
	| 'left';
export type CameraRotation = 0 | 90 | 180 | 270;

export interface CameraOrientation {
	face: CameraFace | 'unknown';
	rotation: CameraRotation | 'unknown';
}

const BASE_ORIENTATIONS: Record<
	CameraFace,
	{ look: THREE.Vector3; up: THREE.Vector3 }
> = {
	front: {
		look: new THREE.Vector3(0, 0, -1),
		up: new THREE.Vector3(0, 1, 0),
	},
	back: {
		look: new THREE.Vector3(0, 0, 1),
		up: new THREE.Vector3(0, 1, 0),
	},
	top: {
		look: new THREE.Vector3(0, -1, 0),
		up: new THREE.Vector3(0, 0, 1),
	},
	bottom: {
		look: new THREE.Vector3(0, 1, 0),
		up: new THREE.Vector3(0, 0, -1),
	},
	right: {
		look: new THREE.Vector3(-1, 0, 0),
		up: new THREE.Vector3(0, 1, 0),
	},
	left: {
		look: new THREE.Vector3(1, 0, 0),
		up: new THREE.Vector3(0, 1, 0),
	},
};

function getLocalQuaternion(
	face: CameraFace,
	rotation: CameraRotation,
): THREE.Quaternion {
	const { look, up } = BASE_ORIENTATIONS[face];
	const m = new THREE.Matrix4().lookAt(
		new THREE.Vector3(0, 0, 0),
		look,
		up,
	);
	const q = new THREE.Quaternion().setFromRotationMatrix(m);
	const roll = new THREE.Quaternion().setFromAxisAngle(
		new THREE.Vector3(0, 0, 1),
		THREE.MathUtils.degToRad(-rotation),
	);
	return q.multiply(roll);
}

export function getRotationAxis(
	face: CameraFace,
	rotation: CameraRotation,
	type: 'horizontal' | 'vertical' | 'roll',
): THREE.Vector3 {
	const q = getLocalQuaternion(face, rotation);
	let localVector: THREE.Vector3;

	switch (type) {
		case 'vertical':
			localVector = new THREE.Vector3(1, 0, 0);
			break; // Local +X maps to 'd' in old logic
		case 'horizontal':
			localVector = new THREE.Vector3(0, 1, 0);
			break; // Local +Y maps to 'w' in old logic
		case 'roll':
			localVector = new THREE.Vector3(0, 0, -1);
			break; // Local -Z maps to 'q' in old logic
	}

	// Adjust for actual output expected by existing mappings:
	// vertical actually wants 'd', which is local X.
	// horizontal actually wants 'w', which is local Y.
	// roll wants 'q', which is local -Z.
	// NOTE: Wait, I should make sure we correctly map them.
	// Actually, horizontal in standard mapping returns 'w' (local Y).
	// vertical returns 'd' (local X).
	// roll returns 'q' (local -Z).
	return localVector.applyQuaternion(q).round();
}

export function getExplicitRotationAxis(
	face: CameraFace,
	rotation: CameraRotation,
	key: 'o' | 'k' | 'period' | 'semicolon' | 'i' | 'p',
): THREE.Vector3 {
	const q = getLocalQuaternion(face, rotation);
	let localVector = new THREE.Vector3();

	// Based on old lookup mappings:
	// o -> looking up -> Pitch around Local +X
	// period -> looking down -> Pitch around Local -X
	// semicolon -> turning left -> Yaw around Local -Y
	// k -> turning right -> Yaw around Local +Y
	// i -> roll left -> Roll around Local +Z
	// p -> roll right -> Roll around Local -Z

	switch (key) {
		case 'o':
			localVector.set(1, 0, 0);
			break;
		case 'period':
			localVector.set(-1, 0, 0);
			break;
		case 'semicolon':
			localVector.set(0, -1, 0);
			break;
		case 'k':
			localVector.set(0, 1, 0);
			break;
		case 'i':
			localVector.set(0, 0, 1);
			break;
		case 'p':
			localVector.set(0, 0, -1);
			break;
	}

	return localVector.applyQuaternion(q).round();
}

/**
 * Returns the exact mapped vectors for WASD movement keys, dynamically generated
 * based on the current camera orientation.
 */
export function getWASDMapping(
	face: CameraFace,
	rotation: CameraRotation,
): Record<string, number[]> {
	const q = getLocalQuaternion(face, rotation);
	return {
		w: new THREE.Vector3(0, 1, 0).applyQuaternion(q).round().toArray(),
		x: new THREE.Vector3(0, -1, 0).applyQuaternion(q).round().toArray(),
		a: new THREE.Vector3(-1, 0, 0).applyQuaternion(q).round().toArray(),
		d: new THREE.Vector3(1, 0, 0).applyQuaternion(q).round().toArray(),
		q: new THREE.Vector3(0, 0, -1).applyQuaternion(q).round().toArray(),
		z: new THREE.Vector3(0, 0, 1).applyQuaternion(q).round().toArray(),
	};
}
