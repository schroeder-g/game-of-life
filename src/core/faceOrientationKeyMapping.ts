// @vitest-environment jsdom
// @vitest-environment jsdom
// AGENT INSTRUCTION:
// This file is the single source of truth for keyboard controls related to orientation.
// Do not add orientation-based keyboard logic elsewhere. Modify this file instead.
// All keyboard actions for rotation and translation should derive their behavior
// from the mappings defined in this file.

import * as THREE from "three";

export const KEY_MAP = {
  "front": {
    0: { w: [0, 1, 0], x: [0, -1, 0], d: [1, 0, 0], a: [-1, 0, 0], q: [0, 0, -1], z: [0, 0, 1] },
    270: { x: [-1, 0, 0], w: [1, 0, 0], a: [0, 1, 0], d: [0, -1, 0], q: [0, 0, -1], z: [0, 0, 1] },
    180: { w: [0, -1, 0], x: [0, 1, 0], d: [-1, 0, 0], a: [1, 0, 0], q: [0, 0, -1], z: [0, 0, 1] },
    90: { x: [1, 0, 0], w: [-1, 0, 0], d: [0, -1, 0], a: [0, 1, 0], q: [0, 0, -1], z: [0, 0, 1] }
  },
  "back": {
    0: { w: [0, 1, 0], x: [0, -1, 0], d: [-1, 0, 0], a: [1, 0, 0], z: [0, 0, -1], q: [0, 0, 1] },
    90: { x: [1, 0, 0], w: [-1, 0, 0], a: [0, 1, 0], d: [0, -1, 0], z: [0, 0, -1], q: [0, 0, 1] },
    180: { w: [0, -1, 0], x: [0, 1, 0], d: [1, 0, 0], a: [-1, 0, 0], z: [0, 0, -1], q: [0, 0, 1] },
    270: { x: [-1, 0, 0], w: [1, 0, 0], d: [0, -1, 0], a: [0, 1, 0], z: [0, 0, -1], q: [0, 0, 1] }
  },
  "top": {
    180: { w: [0, 0, -1], x: [0, 0, 1], a: [1, 0, 0], d: [-1, 0, 0], q: [0, 1, 0], z: [0, -1, 0] },
    90: { w: [-1, 0, 0], x: [1, 0, 0], d: [0, 0, -1], a: [0, 0, 1], q: [0, 1, 0], z: [0, -1, 0] },
    0: { w: [0, 0, 1], x: [0, 0, -1], a: [-1, 0, 0], d: [1, 0, 0], q: [0, 1, 0], z: [0, -1, 0] },
    270: { w: [1, 0, 0], x: [-1, 0, 0], a: [0, 0, 1], d: [0, 0, -1], q: [0, 1, 0], z: [0, -1, 0] }
  },
  "bottom": {
    0: { a: [-1, 0, 0], d: [1, 0, 0], x: [0, 0, 1], w: [0, 0, -1], q: [0, -1, 0], z: [0, 1, 0] },
    90: { w: [-1, 0, 0], x: [1, 0, 0], a: [0, 0, 1], d: [0, 0, -1], q: [0, -1, 0], z: [0, 1, 0] },
    180: { a: [1, 0, 0], d: [-1, 0, 0], x: [0, 0, -1], w: [0, 0, 1], q: [0, -1, 0], z: [0, 1, 0] },
    270: { w: [1, 0, 0], x: [-1, 0, 0], a: [0, 0, -1], d: [0, 0, 1], q: [0, -1, 0], z: [0, 1, 0] }
  },
  "right": {
    0: { w: [0, 1, 0], x: [0, -1, 0], a: [0, 0, -1], d: [0, 0, 1], q: [-1, 0, 0], z: [1, 0, 0] },
    90: { x: [0, 0, 1], w: [0, 0, -1], d: [0, 1, 0], a: [0, -1, 0], q: [-1, 0, 0], z: [1, 0, 0] },
    180: { w: [0, -1, 0], x: [0, 1, 0], a: [0, 0, 1], d: [0, 0, -1], q: [-1, 0, 0], z: [1, 0, 0] },
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
  "front": { // look -Z, up +Y
    0: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, 1, 0], semicolon: [0, -1, 0], i: [0, 0, 1], p: [0, 0, -1] },
    90: { o: [0, -1, 0], period: [0, 1, 0], k: [1, 0, 0], semicolon: [-1, 0, 0], i: [0, 0, 1], p: [0, 0, -1] },
    180: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, -1, 0], semicolon: [0, 1, 0], i: [0, 0, 1], p: [0, 0, -1] },
    270: { o: [0, 1, 0], period: [0, -1, 0], k: [-1, 0, 0], semicolon: [1, 0, 0], i: [0, 0, 1], p: [0, 0, -1] }
  },
  "back": { // look +Z, up +Y
    0: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, 1, 0], semicolon: [0, -1, 0], i: [0, 0, -1], p: [0, 0, 1] },
    90: { o: [0, -1, 0], period: [0, 1, 0], k: [-1, 0, 0], semicolon: [1, 0, 0], i: [0, 0, -1], p: [0, 0, 1] },
    180: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, -1, 0], semicolon: [0, 1, 0], i: [0, 0, -1], p: [0, 0, 1] },
    270: { o: [0, 1, 0], period: [0, -1, 0], k: [1, 0, 0], semicolon: [-1, 0, 0], i: [0, 0, -1], p: [0, 0, 1] }
  },
  "top": { // look -Y, up +Z
    0: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, 1, 0], semicolon: [0, -1, 0], i: [0, 0, 1], p: [0, -1, 0] },
    90: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, 0, 1], semicolon: [0, 0, -1], i: [0, 1, 0], p: [0, -1, 0] },
    180: { o: [0, 0, -1], period: [0, 0, 1], k: [-1, 0, 0], semicolon: [1, 0, 0], i: [0, 1, 0], p: [0, -1, 0] },
    270: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, 0, -1], semicolon: [0, 0, 1], i: [0, 1, 0], p: [0, -1, 0] }
  },
  "bottom": { // look +Y, up -Z
    0: { o: [0, 0, -1], period: [0, 0, 1], k: [1, 0, 0], semicolon: [-1, 0, 0], i: [0, -1, 0], p: [0, 1, 0] },
    90: { o: [-1, 0, 0], period: [1, 0, 0], k: [0, 0, -1], semicolon: [0, 0, 1], i: [0, -1, 0], p: [0, 1, 0] },
    180: { o: [0, 0, 1], period: [0, 0, -1], k: [-1, 0, 0], semicolon: [1, 0, 0], i: [0, -1, 0], p: [0, 1, 0] },
    270: { o: [1, 0, 0], period: [-1, 0, 0], k: [0, 0, 1], semicolon: [0, 0, -1], i: [0, -1, 0], p: [0, 1, 0] }
  },
  "right": { // look -X, up +Y
    0: { o: [0, 0, 1], period: [0, 0, -1], k: [0, 1, 0], semicolon: [0, -1, 0], i: [1, 0, 0], p: [-1, 0, 0] },
    90: { o: [0, 1, 0], period: [0, -1, 0], k: [0, 0, -1], semicolon: [0, 0, 1], i: [1, 0, 0], p: [-1, 0, 0] },
    180: { o: [0, 0, -1], period: [0, 0, 1], k: [0, -1, 0], semicolon: [0, 1, 0], i: [1, 0, 0], p: [-1, 0, 0] },
    270: { o: [0, -1, 0], period: [0, 1, 0], k: [0, 0, 1], semicolon: [0, 0, -1], i: [1, 0, 0], p: [-1, 0, 0] }
  },
  "left": { // look +X, up +Y
    0: { o: [0, 0, -1], period: [0, 0, 1], k: [0, 1, 0], semicolon: [0, -1, 0], i: [-1, 0, 0], p: [1, 0, 0] },
    90: { o: [0, 1, 0], period: [0, -1, 0], k: [0, 0, 1], semicolon: [0, 0, -1], i: [-1, 0, 0], p: [1, 0, 0] },
    180: { o: [0, 0, 1], period: [0, 0, -1], k: [0, -1, 0], semicolon: [0, 1, 0], i: [-1, 0, 0], p: [1, 0, 0] },
    270: { o: [0, -1, 0], period: [0, 1, 0], k: [0, 0, -1], semicolon: [0, 0, 1], i: [-1, 0, 0], p: [1, 0, 0] }
  }
};



// 3 ROTATION SNAP ORIENTATION LOOKUP  
export const snapRotationLookup = {
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
