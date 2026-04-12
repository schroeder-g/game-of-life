// @vitest-environment jsdom
/**
 * 🚨 CRITICAL AI INSTRUCTION 🚨
 * ----------------------------
 * THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR ALL KEYBOARD CONTROLS.
 * 
 * DO NOT:
 * 1. Modify the KEY_MAP, ROTATION_KEY_MAP, or any lookup table here. 
 * 2. Add or hardcode keyboard movement logic in other files (like Grid.tsx or useAppShortcuts.ts) 
 *    that ignores these mappings.
 * 3. Assume screen-relative movement is correct if it conflicts with these vectors.
 * 
 * IF KEYBOARD CONTROLS ARE REVERSED OR BROKEN:
 * The issue is ALMOST CERTAINLY in the CONSUMPTION of these maps elsewhere, NOT in this file.
 * Ensure that Grid.tsx and useAppShortcuts.ts are correctly fetching and applying 
 * the vectors from getWAXDQZMapping and getExplicitRotationAxis.
 * 
 * Modifications to this file require explicit user approval and a deep understanding 
 * of the 3D coordinate system. 
 */
import * as THREE from 'three';

export type CubeFace =
	| 'front'
	| 'back'
	| 'top'
	| 'bottom'
	| 'right'
	| 'left';
export type CameraRotation = 0 | 90 | 180 | 270;

export interface CameraOrientation {
	face: CubeFace | 'unknown';
	rotation: CameraRotation | 'unknown';
}
export const KEY_MAP = {
	"front": {
		0: { x: [0, 1, 0], w: [0, -1, 0], a: [1, 0, 0], d: [-1, 0, 0], q: [0, 0, 1], z: [0, 0, -1] },
		90: { x: [-1, 0, 0], w: [1, 0, 0], a: [0, 1, 0], d: [0, -1, 0], q: [0, 0, 1], z: [0, 0, -1] },
		180: { w: [0, -1, 0], x: [0, 1, 0], a: [-1, 0, 0], d: [1, 0, 0], q: [0, 0, 1], z: [0, 0, -1] },
		270: { x: [1, 0, 0], w: [-1, 0, 0], a: [0, -1, 0], d: [0, 1, 0], q: [0, 0, 1], z: [0, 0, -1] }
	},
	"right": {
		0: { x: [0, 1, 0], w: [0, -1, 0], d: [0, 0, 1], a: [0, 0, -1], z: [-1, 0, 0], q: [1, 0, 0] },
		90: { x: [0, 0, 1], w: [0, 0, -1], a: [0, 1, 0], d: [0, -1, 0], z: [-1, 0, 0], q: [1, 0, 0] },
		180: { x: [0, -1, 0], w: [0, 1, 0], d: [0, 0, -1], a: [0, 0, 1], z: [-1, 0, 0], q: [1, 0, 0] },
		270: { x: [0, 0, -1], w: [0, 0, 1], a: [0, -1, 0], d: [0, 1, 0], z: [-1, 0, 0], q: [1, 0, 0] }
	},
	"back": {
		0: { x: [0, 1, 0], w: [0, -1, 0], a: [-1, 0, 0], d: [1, 0, 0], z: [0, 0, 1], q: [0, 0, -1] },
		90: { w: [1, 0, 0], x: [-1, 0, 0], d: [0, 1, 0], a: [0, -1, 0], z: [0, 0, 1], q: [0, 0, -1] },
		180: { x: [0, -1, 0], w: [0, 1, 0], a: [1, 0, 0], d: [-1, 0, 0], z: [0, 0, 1], q: [0, 0, -1] },
		270: { w: [-1, 0, 0], x: [1, 0, 0], d: [0, -1, 0], a: [0, 1, 0], z: [0, 0, 1], q: [0, 0, -1] }
	},

	"left": {
		0: { x: [0, 1, 0], w: [0, -1, 0], d: [0, 0, -1], a: [0, 0, 1], z: [1, 0, 0], q: [-1, 0, 0] },
		90: { x: [0, 0, -1], w: [0, 0, 1], a: [0, 1, 0], d: [0, -1, 0], z: [1, 0, 0], q: [-1, 0, 0] },
		180: { x: [0, -1, 0], w: [0, 1, 0], d: [0, 0, 1], a: [0, 0, -1], z: [1, 0, 0], q: [-1, 0, 0] },
		270: { x: [0, 0, 1], w: [0, 0, -1], a: [0, -1, 0], d: [0, 1, 0], z: [1, 0, 0], q: [-1, 0, 0] }
	},

	"top": {
		0: { w: [0, 0, 1], x: [0, 0, -1], d: [-1, 0, 0], a: [1, 0, 0], q: [0, 1, 0], z: [0, -1, 0] },
		90: { w: [-1, 0, 0], x: [1, 0, 0], a: [0, 0, -1], d: [0, 0, 1], q: [0, 1, 0], z: [0, -1, 0] },
		180: { w: [0, 0, -1], x: [0, 0, 1], d: [1, 0, 0], a: [-1, 0, 0], q: [0, 1, 0], z: [0, -1, 0] },
		270: { x: [1, 0, 0], w: [-1, 0, 0], a: [0, 0, 1], d: [0, 0, -1], q: [0, 1, 0], z: [0, -1, 0] }
	},
	"bottom": {
		0: { d: [-1, 0, 0], a: [1, 0, 0], x: [0, 0, 1], w: [0, 0, -1], q: [0, -1, 0], z: [0, 1, 0] },
		90: { x: [-1, 0, 0], w: [1, 0, 0], a: [0, 0, 1], d: [0, 0, -1], q: [0, -1, 0], z: [0, 1, 0] },
		180: { d: [1, 0, 0], a: [-1, 0, 0], x: [0, 0, -1], w: [0, 0, 1], q: [0, -1, 0], z: [0, 1, 0] },
		270: { w: [1, 0, 0], x: [-1, 0, 0], a: [0, 0, -1], d: [0, 0, 1], q: [0, -1, 0], z: [0, 1, 0] }
	}

};

// 2. ROTATION LOOKUP (o, k, ., ;)
export const ROTATION_KEY_MAP = {
	"front": {
		0: { period: [1, 0, 0], o: [-1, 0, 0], semicolon: [0, 1, 0], k: [0, -1, 0], i: [0, 0, 1], p: [0, 0, -1] },
		90: { o: [0, -1, 0], period: [0, 1, 0], semicolon: [-1, 0, 0], k: [1, 0, 0], i: [0, 0, 1], p: [0, 0, -1] },
		180: { period: [-1, 0, 0], o: [1, 0, 0], semicolon: [0, -1, 0], k: [0, 1, 0], i: [0, 0, 1], p: [0, 0, -1] },
		270: { o: [0, 1, 0], period: [0, -1, 0], semicolon: [1, 0, 0], k: [-1, 0, 0], i: [0, 0, 1], p: [0, 0, -1] }
	},
	"right": {
		0: { o: [0, 0, 1], period: [0, 0, -1], k: [0, -1, 0], semicolon: [0, 1, 0], i: [1, 0, 0], p: [-1, 0, 0] },
		90: { semicolon: [0, 0, 1], k: [0, 0, -1], o: [0, -1, 0], period: [0, 1, 0], i: [1, 0, 0], p: [-1, 0, 0] },
		180: { semicolon: [0, -1, 0], k: [0, 1, 0], period: [0, 0, 1], o: [0, 0, -1], i: [1, 0, 0], p: [-1, 0, 0] },
		270: { semicolon: [0, 0, -1], k: [0, 0, 1], o: [0, 1, 0], period: [0, -1, 0], i: [1, 0, 0], p: [-1, 0, 0] }
	},
	"back": {
		0: { semicolon: [0, 1, 0], k: [0, -1, 0], o: [1, 0, 0], period: [-1, 0, 0], i: [0, 0, -1], p: [0, 0, 1] },
		90: { k: [1, 0, 0], semicolon: [-1, 0, 0], period: [0, -1, 0], o: [0, 1, 0], i: [0, 0, -1], p: [0, 0, 1] },
		180: { semicolon: [0, -1, 0], k: [0, 1, 0], o: [-1, 0, 0], period: [1, 0, 0], i: [0, 0, -1], p: [0, 0, 1] },
		270: { k: [-1, 0, 0], semicolon: [1, 0, 0], period: [0, 1, 0], o: [0, -1, 0], i: [0, 0, -1], p: [0, 0, 1] }
	},

	"left": {
		0: { o: [0, 0, -1], period: [0, 0, 1], semicolon: [0, 1, 0], k: [0, -1, 0], i: [-1, 0, 0], p: [1, 0, 0] },
		90: { semicolon: [0, 0, -1], k: [0, 0, 1], o: [0, -1, 0], period: [0, 1, 0], i: [-1, 0, 0], p: [1, 0, 0] },
		180: { semicolon: [0, -1, 0], k: [0, 1, 0], o: [0, 0, -1], period: [0, 0, 1], i: [-1, 0, 0], p: [1, 0, 0] },
		270: { semicolon: [0, 0, 1], k: [0, 0, -1], o: [0, 1, 0], period: [0, -1, 0], i: [-1, 0, 0], p: [1, 0, 0] }
	},
	"top": {
		0: { semicolon: [0, 0, -1], k: [0, 0, 1], o: [-1, 0, 0], period: [1, 0, 0], i: [0, 1, 0], p: [0, -1, 0] },
		90: { semicolon: [-1, 0, 0], k: [1, 0, 0], o: [0, 0, 1], period: [0, 0, -1], i: [0, 1, 0], p: [0, -1, 0] },
		180: { semicolon: [0, 0, 1], k: [0, 0, -1], o: [1, 0, 0], period: [-1, 0, 0], i: [0, 1, 0], p: [0, -1, 0] },
		270: { semicolon: [1, 0, 0], k: [-1, 0, 0], o: [0, 0, -1], period: [0, 0, 1], i: [0, 1, 0], p: [0, -1, 0] }
	},
	"bottom": {
		0: { semicolon: [0, 0, 1], k: [0, 0, -1], o: [-1, 0, 0], period: [1, 0, 0], i: [0, -1, 0], p: [0, 1, 0] },
		90: { semicolon: [-1, 0, 0], k: [1, 0, 0], o: [0, 0, -1], period: [0, 0, 1], i: [0, -1, 0], p: [0, 1, 0] },
		180: { semicolon: [0, 0, -1], k: [0, 0, 1], o: [1, 0, 0], period: [-1, 0, 0], i: [0, -1, 0], p: [0, 1, 0] },
		270: { semicolon: [1, 0, 0], k: [-1, 0, 0], o: [0, 0, 1], period: [0, 0, -1], i: [0, -1, 0], p: [0, 1, 0] }
	}
};



// 3 ROTATION SNAP ORIENTATION LOOKUP  
export const nextSquareOrientationLookup = {
	"front": {
		0: { o: ["top", 0], period: ["bottom", 0], k: ["left", 0], semicolon: ["right", 0], i: ["front", 90], p: ["front", 270] },
		270: { o: ["right", 270], period: ["left", 270], k: ["top", 270], semicolon: ["bottom", 270], i: ["front", 0], p: ["front", 180] },
		180: { o: ["bottom", 180], period: ["top", 180], k: ["right", 180], semicolon: ["left", 180], i: ["front", 270], p: ["front", 90] },
		90: { o: ["left", 90], period: ["right", 90], k: ["top", 90], semicolon: ["top", 90], i: ["front", 180], p: ["front", 0] },
	},
	"back": {
		0: { o: ["top", 180], period: ["bottom", 180], k: ["right", 0], semicolon: ["left", 0], i: ["back", 90], p: ["back", 270] },
		270: { o: ["left", 270], period: ["right", 270], k: ["top", 90], semicolon: ["bottom", 90], i: ["back", 0], p: ["back", 180] },
		180: { o: ["bottom", 180], period: ["top", 180], k: ["left", 0], semicolon: ["right", 0], i: ["back", 270], p: ["back", 90] },
		90: { o: ["right", 270], period: ["left", 270], k: ["bottom", 90], semicolon: ["top", 90], i: ["back", 180], p: ["back", 0] }


	},
	"right": {
		0: { o: ["top", 90], period: ["bottom", 270], k: ["front", 0], semicolon: ["back", 0], i: ["right", 90], p: ["right", 270] },
		270: { o: ["back", 270], period: ["front", 270], k: ["top", 0], semicolon: ["bottom", 180], i: ["right", 0], p: ["right", 180] },
		180: { o: ["bottom", 90], period: ["top", 270], k: ["back", 180], semicolon: ["front", 180], i: ["right", 270], p: ["right", 90] },
		90: { o: ["back", 90], period: ["front", 270], k: ["bottom", 180], semicolon: ["top", 0], i: ["right", 180], p: ["right", 0] }
	},


	"left": {
		0: { o: ["top", 270], period: ["bottom", 90], k: ["back", 0], semicolon: ["front", 0], i: ["left", 90], p: ["left", 270] },
		270: { o: ["front", 270], period: ["back", 270], k: ["top", 180], semicolon: ["bottom", 0], i: ["left", 0], p: ["left", 180] },
		180: { o: ["bottom", 270], period: ["top", 90], k: ["front", 180], semicolon: ["back", 180], i: ["left", 270], p: ["left", 90] },
		90: { o: ["back", 90], period: ["front", 270], k: ["bottom", 180], semicolon: ["top", 0], i: ["left", 180], p: ["left", 0] }
	},

	"top": {
		0: { o: ["back", 180], period: ["front", 0], k: ["left", 90], semicolon: ["right", 270], i: ["top", 90], p: ["top", 270] },
		270: { o: ["right", 180], period: ["left", 0], k: ["back", 90], semicolon: ["front", 270], i: ["top", 0], p: ["top", 180] },
		180: { o: ["front", 180], period: ["back", 0], k: ["right", 90], semicolon: ["left", 270], i: ["top", 270], p: ["top", 90] },
		90: { o: ["left", 180], period: ["right", 0], k: ["front", 90], semicolon: ["back", 270], i: ["top", 180], p: ["top", 0] }
	},
	"bottom": {
		0: { o: ["front", 270], period: ["back", 180], k: ["left", 270], semicolon: ["right", 90], i: ["bottom", 90], p: ["bottom", 270] },
		270: { o: ["right", 270], period: ["left", 180], k: ["front", 270], semicolon: ["back", 90], i: ["bottom", 0], p: ["bottom", 180] },
		180: { o: ["back", 270], period: ["front", 180], k: ["right", 90], semicolon: ["left", 270], i: ["bottom", 270], p: ["bottom", 90] },
		90: { o: ["left", 270], period: ["right", 180], k: ["front", 90], semicolon: ["back", 270], i: ["bottom", 180], p: ["bottom", 0] }
	}
};




export function getWAXDQZMapping(
	face: CubeFace | 'unknown',
	rotation: CameraRotation | 'unknown',
): Record<string, number[]> {
	const f = face === 'unknown' ? 'front' : face;
	const r = rotation === 'unknown' ? 0 : rotation;
	return KEY_MAP[f]?.[r] || KEY_MAP.front[0];
}

export function getLocalQuaternion(
	face: CubeFace | 'unknown',
	rotation: CameraRotation | 'unknown',
): THREE.Quaternion {
	const f = face === 'unknown' ? 'front' : face;
	const r = rotation === 'unknown' ? 0 : rotation;
	const look = KEY_MAP[f][r].q;
	const up = KEY_MAP[f][r].w;

	const m = new THREE.Matrix4().lookAt(
		new THREE.Vector3(0, 0, 0),
		new THREE.Vector3(...look).multiplyScalar(-1),
		new THREE.Vector3(...up),
	);
	return new THREE.Quaternion().setFromRotationMatrix(m);
}

export function getExplicitRotationAxis(
	face: CubeFace | 'unknown',
	rotation: CameraRotation | 'unknown',
	key: 'o' | 'k' | 'period' | 'semicolon' | 'i' | 'p',
): THREE.Vector3 {
	const f = face === 'unknown' ? 'front' : face;
	const r = rotation === 'unknown' ? 0 : rotation;
	const axisArray = ROTATION_KEY_MAP[f]?.[r]?.[key] || [0, 0, 0];
	return new THREE.Vector3().fromArray(axisArray);
}

/**
 * Calculates the next face and rotation after a discrete 90-degree rotation step.
 * Still uses quaternion math for the step calculation, but derives candidate axes from lookup tables.
 */
export function getNextOrientation(
	face: CubeFace | 'unknown',
	rotation: CameraRotation | 'unknown',
	key: 'o' | 'k' | 'period' | 'semicolon' | 'i' | 'p',
): CameraOrientation {
	const worldAxis = getExplicitRotationAxis(face, rotation, key);
	const stepQ = new THREE.Quaternion().setFromAxisAngle(worldAxis, Math.PI / 2);

	const currentQ = getLocalQuaternion(face, rotation);
	const nextQ = stepQ.multiply(currentQ);

	const localLook = new THREE.Vector3(0, 0, -1).applyQuaternion(nextQ);
	const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(nextQ);

	const lx = Math.round(localLook.x), ly = Math.round(localLook.y), lz = Math.round(localLook.z);
	let nextFace: CubeFace = 'front';
	if (Math.abs(lz) === 1) nextFace = lz > 0 ? 'back' : 'front';
	else if (Math.abs(lx) === 1) nextFace = lx > 0 ? 'left' : 'right';
	else if (Math.abs(ly) === 1) nextFace = ly > 0 ? 'bottom' : 'top';

	const ux = Math.round(localUp.x), uy = Math.round(localUp.y), uz = Math.round(localUp.z);
	let nextRotation: CameraRotation = 0;

	switch (nextFace) {
		case 'front': case 'back':
			if (Math.abs(uy) === 1) nextRotation = uy > 0 ? 0 : 180;
			else nextRotation = ux < 0 ? 90 : 270;
			break;
		case 'top': case 'bottom':
			if (nextFace === 'top') {
				if (Math.abs(uz) === 1) nextRotation = uz > 0 ? 180 : 0;
				else nextRotation = ux < 0 ? 90 : 270;
			} else {
				if (Math.abs(uz) === 1) nextRotation = uz < 0 ? 180 : 0;
				else nextRotation = ux < 0 ? 90 : 270;
			}
			break;
		case 'right': case 'left':
			if (Math.abs(uy) === 1) nextRotation = uy > 0 ? 0 : 180;
			else {
				if (nextFace === 'right') nextRotation = uz > 0 ? 90 : 270;
				else nextRotation = uz < 0 ? 90 : 270;
			}
			break;
	}

	return { face: nextFace, rotation: nextRotation };
}

// Legacy helper for standard yaw/pitch/roll abstract calls
export function getRotationAxis(
	face: CubeFace,
	rotation: CameraRotation,
	type: 'horizontal' | 'vertical' | 'roll',
): THREE.Vector3 {
	if (type === 'vertical') return getExplicitRotationAxis(face, rotation, 'o');
	if (type === 'horizontal') return getExplicitRotationAxis(face, rotation, 'k');
	return getExplicitRotationAxis(face, rotation, 'i');
}
