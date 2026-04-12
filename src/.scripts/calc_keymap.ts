import * as THREE from 'three';

// Mock types
type CubeFace = 'front' | 'back' | 'top' | 'bottom' | 'right' | 'left';
type CameraRotation = 0 | 90 | 180 | 270;

function getLocalQuaternion(face: string, rotation: number): THREE.Quaternion {
  // Logic copied from faceOrientationKeyMapping.ts
  // This is how the app currently "thinks" the camera is oriented.
  // We will compare the KEY_MAP vectors against the actual screen-relative axes of this orientation.
  
  // Actually, I'll just use the target vectors we want.
  
  const faceOrigins: Record<string, THREE.Vector3> = {
    front: new THREE.Vector3(0, 0, 1),
    back: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    left: new THREE.Vector3(-1, 0, 0),
    top: new THREE.Vector3(0, 1, 0),
    bottom: new THREE.Vector3(0, -1, 0)
  };
  
  const upVectors: Record<string, Record<number, THREE.Vector3>> = {
    front: { 
        0: new THREE.Vector3(0, 1, 0), 
        90: new THREE.Vector3(-1, 0, 0), 
        180: new THREE.Vector3(0, -1, 0), 
        270: new THREE.Vector3(1, 0, 0) 
    },
    back: { 
        0: new THREE.Vector3(0, 1, 0), 
        90: new THREE.Vector3(1, 0, 0), 
        180: new THREE.Vector3(0, -1, 0), 
        270: new THREE.Vector3(-1, 0, 0) 
    },
    right: { 
        0: new THREE.Vector3(0, 1, 0), 
        90: new THREE.Vector3(0, 0, 1), 
        180: new THREE.Vector3(0, -1, 0), 
        270: new THREE.Vector3(0, 0, -1) 
    },
    left: { 
        0: new THREE.Vector3(0, 1, 0), 
        90: new THREE.Vector3(0, 0, -1), 
        180: new THREE.Vector3(0, -1, 0), 
        270: new THREE.Vector3(0, 0, 1) 
    },
    top: { 
        0: new THREE.Vector3(0, 0, 1), 
        90: new THREE.Vector3(-1, 0, 0), 
        180: new THREE.Vector3(0, 0, -1), 
        270: new THREE.Vector3(1, 0, 0) 
    },
    bottom: { 
        0: new THREE.Vector3(0, 0, -1), 
        90: new THREE.Vector3(-1, 0, 0), 
        180: new THREE.Vector3(0, 0, 1), 
        270: new THREE.Vector3(1, 0, 0) 
    }
  };

  const results: any = {};
  for (const face of Object.keys(faceOrigins)) {
    results[face] = {};
    for (const rotation of [0, 90, 180, 270]) {
        const lookAtCenter = new THREE.Vector3(0, 0, 0);
        const camPos = faceOrigins[face].clone().multiplyScalar(40);
        const up = upVectors[face][rotation];
        
        const m = new THREE.Matrix4().lookAt(camPos, lookAtCenter, up);
        // Extracts the camera's local axes in world space
        const screenRight = new THREE.Vector3().setFromMatrixColumn(m, 0);
        const screenUp    = new THREE.Vector3().setFromMatrixColumn(m, 1);
        const screenForward = new THREE.Vector3().setFromMatrixColumn(m, 2).multiplyScalar(-1);
        
        // KEY_MAP maps inputs to CAMERA movement vectors in world space.
        // W (Up) -> Camera moves Down (-screenUp)
        // X (Down) -> Camera moves Up (+screenUp)
        // A (Left) -> Camera moves Right (+screenRight)
        // D (Right) -> Camera moves Left (-screenRight)
        // Q (Further) -> Camera moves Back (-screenForward / +TowardsOrigin? No, +screenForward is towards origin?)
        // Wait, m column 2 is camera Z (pointing away from lookAt). 
        // So screenForward is -column 2. 
        // Further means moving camera away from lookAt (+column 2).
        
        const vW = screenUp.clone().multiplyScalar(-1);
        const vX = screenUp.clone();
        const vA = screenRight.clone();
        const vD = screenRight.clone().multiplyScalar(-1);
        const vQ = screenForward.clone().multiplyScalar(-1);
        const vZ = screenForward.clone();
        
        const round = (v: THREE.Vector3) => [Math.round(v.x), Math.round(v.y), Math.round(v.z)];
        results[face][rotation] = {
            w: round(vW),
            x: round(vX),
            a: round(vA),
            d: round(vD),
            q: round(vQ),
            z: round(vZ)
        };
    }
  }
  
  console.log(JSON.stringify(results, null, 2));
}

getLocalQuaternion('', 0);
