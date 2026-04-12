const THREE = require('three');

function getLocalQuaternion() {
  const faceOrigins = {
    front: new THREE.Vector3(0, 0, 1),
    back: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    left: new THREE.Vector3(-1, 0, 0),
    top: new THREE.Vector3(0, 1, 0),
    bottom: new THREE.Vector3(0, -1, 0)
  };
  
  const upVectors = {
    front: { 0: [0, 1, 0], 90: [-1, 0, 0], 180: [0, -1, 0], 270: [1, 0, 0] },
    back: { 0: [0, 1, 0], 90: [1, 0, 0], 180: [0, -1, 0], 270: [-1, 0, 0] },
    right: { 0: [0, 1, 0], 90: [0, 0, 1], 180: [0, -1, 0], 270: [0, 0, -1] },
    left: { 0: [0, 1, 0], 90: [0, 0, -1], 180: [0, -1, 0], 270: [0, 0, 1] },
    top: { 0: [0, 0, 1], 90: [-1, 0, 0], 180: [0, 0, -1], 270: [1, 0, 0] },
    bottom: { 0: [0, 0, -1], 90: [-1, 0, 0], 180: [0, 0, 1], 270: [1, 0, 0] }
  };

  const results = {};
  for (const face of Object.keys(faceOrigins)) {
    results[face] = {};
    for (const rotation of [0, 90, 180, 270]) {
        const lookAtCenter = new THREE.Vector3(0, 0, 0);
        const camPos = faceOrigins[face].clone().multiplyScalar(40);
        const upArr = upVectors[face][rotation];
        const up = new THREE.Vector3(...upArr);
        
        const m = new THREE.Matrix4().lookAt(camPos, lookAtCenter, up);
        const screenRight = new THREE.Vector3().setFromMatrixColumn(m, 0);
        const screenUp    = new THREE.Vector3().setFromMatrixColumn(m, 1);
        const screenForward = new THREE.Vector3().setFromMatrixColumn(m, 2).multiplyScalar(-1);
        
        // W (Up) -> Camera moves Down (-screenUp)
        // X (Down) -> Camera moves Up (+screenUp)
        // A (Left) -> Camera moves Right (+screenRight)
        // D (Right) -> Camera moves Left (-screenRight)
        // Q (Further) -> Camera moves Away from origin (-screenForward)
        // Z (Closer) -> Camera moves Towards origin (+screenForward)
        
        const vW = screenUp.clone().multiplyScalar(-1);
        const vX = screenUp.clone();
        const vA = screenRight.clone();
        const vD = screenRight.clone().multiplyScalar(-1);
        const vQ = screenForward.clone().multiplyScalar(-1);
        const vZ = screenForward.clone();
        
        const round = (v) => [Math.round(v.x), Math.round(v.y), Math.round(v.z)];
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

getLocalQuaternion();
