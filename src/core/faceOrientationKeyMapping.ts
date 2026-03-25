// AGENT INSTRUCTION:
// This file is the single source of truth for keyboard controls related to orientation.
// Do not add orientation-based keyboard logic elsewhere. Modify this file instead.
// All keyboard actions for rotation and translation should derive their behavior
// from the mappings defined in this file.

import * as THREE from "three";

export const KEY_MAP = {
  "front": {
    0: { w: [0, 1, 0], x: [0, -1, 0], d: [1, 0, 0], a: [-1, 0, 0], q: [0, 0, 1], z: [0, 0, -1] },
    270: { x: [-1, 0, 0], w: [1, 0, 0], a: [0, 1, 0], d: [0, -1, 0], q: [0, 0, 1], z: [0, 0, -1] },
    180: { w: [0, -1, 0], x: [0, 1, 0], d: [-1, 0, 0], a: [1, 0, 0], q: [0, 0, 1], z: [0, 0, -1] },
    90: { x: [1, 0, 0], w: [-1, 0, 0], d: [0, -1, 0], a: [0, 1, 0], q: [0, 0, 1], z: [0, 0, -1] }
  },
  "back": {
    0: { w: [0, 1, 0], x: [0, -1, 0], d: [-1, 0, 0], a: [1, 0, 0], z: [0, 0, 1], q: [0, 0, -1] },
    90: { x: [1, 0, 0], w: [-1, 0, 0], a: [0, 1, 0], d: [0, -1, 0], z: [0, 0, 1], q: [0, 0, -1] },
    180: { w: [0, -1, 0], x: [0, 1, 0], d: [1, 0, 0], a: [-1, 0, 0], z: [0, 0, 1], q: [0, 0, -1] },
    270: { x: [-1, 0, 0], w: [1, 0, 0], d: [0, -1, 0], a: [0, 1, 0], z: [0, 0, 1], q: [0, 0, -1] }
  },
  "top": {
    180: { w: [0, 0, -1], x: [0, 0, 1], a: [1, 0, 0], d: [-1, 0, 0], q: [0, -1, 0], z: [0, 1, 0] },
    90: { w: [-1, 0, 0], x: [1, 0, 0], d: [0, 0, -1], a: [0, 0, 1], q: [0, -1, 0], z: [0, 1, 0] },
    0: { w: [0, 0, 1], x: [0, 0, -1], a: [-1, 0, 0], d: [1, 0, 0], q: [0, -1, 0], z: [0, 1, 0] },
    270: { w: [1, 0, 0], x: [-1, 0, 0], a: [0, 0, 1], d: [0, 0, -1], q: [0, -1, 0], z: [0, 1, 0] }
  },
  "bottom": {
    0: { a: [-1, 0, 0], d: [1, 0, 0], x: [0, 0, 1], w: [0, 0, -1], q: [0, 1, 0], z: [0, -1, 0] },
    90: { w: [-1, 0, 0], x: [1, 0, 0], a: [0, 0, 1], d: [0, 0, -1], q: [0, 1, 0], z: [0, -1, 0] },
    180: { a: [1, 0, 0], d: [-1, 0, 0], x: [0, 0, -1], w: [0, 0, 1], q: [0, 1, 0], z: [0, -1, 0] },
    270: { w: [1, 0, 0], x: [-1, 0, 0], a: [0, 0, -1], d: [0, 0, 1], q: [0, 1, 0], z: [0, -1, 0] }
  },
  "right": {
    0: { w: [0, 1, 0], x: [0, -1, 0], a: [0, 0, 1], d: [0, 0, -1], q: [-1, 0, 0], z: [1, 0, 0] },
    90: { x: [0, 0, 1], w: [0, 0, -1], d: [0, 1, 0], a: [0, -1, 0], q: [-1, 0, 0], z: [1, 0, 0] },
    180: { w: [0, -1, 0], x: [0, 1, 0], a: [0, 0, -1], d: [0, 0, 1], q: [-1, 0, 0], z: [1, 0, 0] },
    270: { x: [0, 0, -1], w: [0, 0, 1], d: [0, -1, 0], a: [0, 1, 0], q: [-1, 0, 0], z: [1, 0, 0] }
  },
  "left": {
    0: { w: [0, 1, 0], x: [0, -1, 0], d: [0, 0, -1], a: [0, 0, 1], q: [1, 0, 0], z: [-1, 0, 0] },
    90: { x: [0, 0, -1], w: [0, 0, 1], d: [0, 1, 0], a: [0, -1, 0], q: [1, 0, 0], z: [-1, 0, 0] },
    180: { w: [0, -1, 0], x: [0, 1, 0], d: [0, 0, 1], a: [0, 0, -1], q: [1, 0, 0], z: [-1, 0, 0] },
    270: { x: [0, 0, 1], w: [0, 0, -1], d: [0, -1, 0], a: [0, 1, 0], q: [1, 0, 0], z: [-1, 0, 0] }
  }
};

// 2. ROTATION LOOKUP (o, k, ., ;)
export const rotationLookup = {
  "front": {
    0: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, 1, 0], semicolon: [0, -1, 0], i: [0, 0, 1], p: [0, 0, -1] },
    90: { o: [0, -1, 0], period: [0, 1, 0], k: [-1, 0, 0], semicolon: [1, 0, 0], i: [0, 0, 1], p: [0, 0, -1] },
    180: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, -1, 0], semicolon: [0, 1, 0], i: [0, 0, 1], p: [0, 0, -1] },
    270: { o: [0, 1, 0], period: [0, -1, 0], k: [1, 0, 0], semicolon: [-1, 0, 0], i: [0, 0, 1], p: [0, 0, -1] }
  },
  "back": {
    0: { o: [0, 1, 0], period: [0, -1, 0], k: [1, 0, 0], semicolon: [-1, 0, 0], i: [0, 0, -1], p: [0, 0, 1] },
    90: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, -1, 0], semicolon: [0, 1, 0], i: [0, 0, -1], p: [0, 0, 1] },
    180: { o: [0, -1, 0], period: [0, 1, 0], k: [-1, 0, 0], semicolon: [1, 0, 0], i: [0, 0, -1], p: [0, 0, 1] },
    270: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, 1, 0], semicolon: [0, -1, 0], i: [0, 0, -1], p: [0, 0, 1] }
  },
  "top": {
    0: { o: [0, 0, -1], period: [0, 0, 1], k: [-1, 0, 0], semicolon: [1, 0, 0], i: [0, 1, 0], p: [0, -1, 0] },
    90: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, 0, 1], semicolon: [0, 0, -1], i: [0, 1, 0], p: [0, -1, 0] },
    180: { o: [0, 0, 1], period: [0, 0, -1], k: [1, 0, 0], semicolon: [-1, 0, 0], i: [0, 1, 0], p: [0, -1, 0] },
    270: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, 0, -1], semicolon: [0, 0, 1], i: [0, 1, 0], p: [0, -1, 0] }
  },
  "bottom": {
    0: { o: [0, 0, 1], period: [0, 0, -1], k: [-1, 0, 0], semicolon: [1, 0, 0] },
    90: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, 0, -1], semicolon: [0, 0, 1] },
    180: { o: [0, 0, -1], period: [0, 0, 1], k: [1, 0, 0], semicolon: [-1, 0, 0] },
    270: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, 0, 1], semicolon: [0, 0, -1] }
  },
  "right": {
    0: { o: [0, 0, 1], period: [0, 0, -1], k: [0, -1, 0], semicolon: [0, 1, 0], i: [1, 0, 0], p: [-1, 0, 0] },
    90: { o: [0, 0, 1], period: [0, 0, -1], k: [0, -1, 0], semicolon: [0, 1, 0], i: [1, 0, 0], p: [-1, 0, 0] },
    180: { o: [0, -1, 0], period: [0, 1, 0], k: [0, 0, 1], semicolon: [0, 0, -1], i: [1, 0, 0], p: [-1, 0, 0] },
    270: { o: [0, 0, -1], period: [0, 0, 1], k: [0, 1, 0], semicolon: [0, -1, 0], i: [1, 0, 0], p: [-1, 0, 0] }
  },
  "left": {
    0: { o: [0, 1, 0], period: [0, -1, 0], k: [0, 0, 1], semicolon: [0, 0, -1], i: [-1, 0, 0], p: [1, 0, 0] },
    90: { o: [0, 0, -1], period: [0, 0, 1], k: [0, -1, 0], semicolon: [0, 1, 0], i: [-1, 0, 0], p: [1, 0, 0] },
    180: { o: [0, -1, 0], period: [0, 1, 0], k: [0, 0, -1], semicolon: [0, 0, 1], i: [-1, 0, 0], p: [1, 0, 0] },
    270: { o: [0, 0, 1], period: [-1, 0, 0], k: [0, 1, 0], semicolon: [0, -1, 0], i: [-1, 0, 0], p: [1, 0, 0] }
  }



};


export const snapToLookup = {
  "front": {
    0: { o: ["top", 0], period: [-1, 0, 0], k: [0, 1, 0], semicolon: [0, -1, 0], i: [0, 0, 1], p: [0, 0, -1] },
    90: { o: [0, -1, 0], period: [0, 1, 0], k: [-1, 0, 0], semicolon: [1, 0, 0], i: [0, 0, 1], p: [0, 0, -1] },
    180: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, -1, 0], semicolon: [0, 1, 0], i: [0, 0, 1], p: [0, 0, -1] },
    270: { o: [0, 1, 0], period: [0, -1, 0], k: [1, 0, 0], semicolon: [-1, 0, 0], i: [0, 0, 1], p: [0, 0, -1] }
  },
  "back": {
    0: { o: [0, 1, 0], period: [0, -1, 0], k: [1, 0, 0], semicolon: [-1, 0, 0], i: [0, 0, -1], p: [0, 0, 1] },
    90: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, -1, 0], semicolon: [0, 1, 0], i: [0, 0, -1], p: [0, 0, 1] },
    180: { o: [0, -1, 0], period: [0, 1, 0], k: [-1, 0, 0], semicolon: [1, 0, 0], i: [0, 0, -1], p: [0, 0, 1] },
    270: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, 1, 0], semicolon: [0, -1, 0], i: [0, 0, -1], p: [0, 0, 1] }
  },
  "top": {
    0: { o: [0, 0, -1], period: [0, 0, 1], k: [-1, 0, 0], semicolon: [1, 0, 0], i: [0, 1, 0], p: [0, -1, 0] },
    90: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, 0, 1], semicolon: [0, 0, -1], i: [0, 1, 0], p: [0, -1, 0] },
    180: { o: [0, 0, 1], period: [0, 0, -1], k: [1, 0, 0], semicolon: [-1, 0, 0], i: [0, 1, 0], p: [0, -1, 0] },
    270: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, 0, -1], semicolon: [0, 0, 1], i: [0, 1, 0], p: [0, -1, 0] }
  },
  "bottom": {
    0: { o: [0, 0, 1], period: [0, 0, -1], k: [-1, 0, 0], semicolon: [1, 0, 0] },
    90: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, 0, -1], semicolon: [0, 0, 1] },
    180: { o: [0, 0, -1], period: [0, 0, 1], k: [1, 0, 0], semicolon: [-1, 0, 0] },
    270: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, 0, 1], semicolon: [0, 0, -1] }
  },
  "right": {
    0: { o: [0, 0, 1], period: [0, 0, -1], k: [0, -1, 0], semicolon: [0, 1, 0], i: [1, 0, 0], p: [-1, 0, 0] },
    90: { o: [0, 0, 1], period: [0, 0, -1], k: [0, -1, 0], semicolon: [0, 1, 0], i: [1, 0, 0], p: [-1, 0, 0] },
    180: { o: [0, -1, 0], period: [0, 1, 0], k: [0, 0, 1], semicolon: [0, 0, -1], i: [1, 0, 0], p: [-1, 0, 0] },
    270: { o: [0, 0, -1], period: [0, 0, 1], k: [0, 1, 0], semicolon: [0, -1, 0], i: [1, 0, 0], p: [-1, 0, 0] }
  },
  "left": {
    0: { o: [0, 1, 0], period: [0, -1, 0], k: [0, 0, 1], semicolon: [0, 0, -1], i: [-1, 0, 0], p: [1, 0, 0] },
    90: { o: [0, 0, -1], period: [0, 0, 1], k: [0, -1, 0], semicolon: [0, 1, 0], i: [-1, 0, 0], p: [1, 0, 0] },
    180: { o: [0, -1, 0], period: [0, 1, 0], k: [0, 0, -1], semicolon: [0, 0, 1], i: [-1, 0, 0], p: [1, 0, 0] },
    270: { o: [0, 0, 1], period: [-1, 0, 0], k: [0, 1, 0], semicolon: [0, -1, 0], i: [-1, 0, 0], p: [1, 0, 0] }
  }
};



export type CameraFace = keyof typeof KEY_MAP;
export type CameraRotation = 0 | 90 | 180 | 270;

export interface CameraOrientation {
  face: CameraFace | "unknown";
  rotation: CameraRotation | "unknown";
}

export function getRotationAxis(face: CameraFace, rotation: CameraRotation, type: 'horizontal' | 'vertical' | 'roll'): THREE.Vector3 {
  const mapping = KEY_MAP[face][rotation];
  let axisArray: readonly number[];

  switch (type) {
    case 'vertical': axisArray = (mapping as any).d; break;
    case 'horizontal': axisArray = (mapping as any).w; break;
    case 'roll': axisArray = (mapping as any).q; break;
  }

  return new THREE.Vector3().fromArray(axisArray as number[]);
}

export function getExplicitRotationAxis(face: CameraFace, rotation: CameraRotation, key: 'o' | 'k' | 'period' | 'semicolon' | 'i' | 'p'): THREE.Vector3 {
  const mapping = (rotationLookup as any)[face][rotation];
  const axisArray = (mapping as any)[key];
  if (!axisArray) return new THREE.Vector3(0, 0, 0);
  return new THREE.Vector3().fromArray(axisArray);
}
