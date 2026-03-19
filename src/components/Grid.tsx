import { Html, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { generateShape } from "../core/shapes";
import { rotateOffsets } from "../hooks/useKeyboardSelector"; // Import rotateOffsets
import { Cells } from "./Cell";
import { CameraOrientation } from "../core/cameraUtils";

interface CubeVisibility {
  isOffScreen: boolean;
  isOffScreenLeft: boolean;
  isOffScreenRight: boolean;
  isOffScreenTop: boolean;
  isOffScreenBottom: boolean;
}

function getCubeVisibility(
  cube: THREE.Group,
  camera: THREE.Camera,
  gridSize: number,
): CubeVisibility {
  const result: CubeVisibility = {
    isOffScreen: false,
    isOffScreenLeft: false,
    isOffScreenRight: false,
    isOffScreenTop: false,
    isOffScreenBottom: false,
  };

  if (!cube) return result;

  const halfSize = gridSize / 2;
  const corners = [
    new THREE.Vector3(halfSize, halfSize, halfSize),
    new THREE.Vector3(halfSize, halfSize, -halfSize),
    new THREE.Vector3(halfSize, -halfSize, halfSize),
    new THREE.Vector3(halfSize, -halfSize, -halfSize),
    new THREE.Vector3(-halfSize, halfSize, halfSize),
    new THREE.Vector3(-halfSize, halfSize, -halfSize),
    new THREE.Vector3(-halfSize, -halfSize, halfSize),
    new THREE.Vector3(-halfSize, -halfSize, -halfSize),
  ];

  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;

  for (const corner of corners) {
    corner.applyMatrix4(cube.matrixWorld);
    corner.project(camera);
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
    minZ = Math.min(minZ, corner.z);
    maxZ = Math.max(maxZ, corner.z);
  }

  if (minZ > 1 || maxZ < -1) {
    // All points are outside the near/far planes.
    result.isOffScreen = true;
    return result;
  }

  const overlapX = Math.max(0, Math.min(maxX, 1) - Math.max(minX, -1));
  const spanX = maxX - minX;
  if (spanX > 1e-6 && overlapX / spanX < 0.05) {
    result.isOffScreen = true;
    const centerX = (minX + maxX) / 2;
    if (centerX > 0) {
      result.isOffScreenRight = true;
    } else {
      result.isOffScreenLeft = true;
    }
  }

  const overlapY = Math.max(0, Math.min(maxY, 1) - Math.max(minY, -1));
  const spanY = maxY - minY;
  if (spanY > 1e-6 && overlapY / spanY < 0.05) {
    result.isOffScreen = true;
    const centerY = (minY + maxY) / 2;
    if (centerY > 0) {
      result.isOffScreenTop = true;
    } else {
      result.isOffScreenBottom = true;
    }
  }

  return result;
}

export function BoundingBox({ size }: { size: number }) {
  return (
    <lineSegments raycast={() => null}>
      <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
      <lineBasicMaterial color="silver" />
    </lineSegments>
  );
}

function ShapePreview({
  controlsRef,
}: {
  controlsRef: React.RefObject<any>;
}) {
  const {
    state: { gridSize },
  } = useSimulation();
  const {
    state: { selectedShape, shapeSize, isHollow, selectorPos },
  } = useBrush();
  const offset = (gridSize - 1) / 2;
  const [azimuth, setAzimuth] = useState(0);
  const [polar, setPolar] = useState(Math.PI / 4);

  useFrame(() => {
    const newAzimuth = controlsRef.current?.getAzimuthalAngle() ?? 0;
    const newPolar = controlsRef.current?.getPolarAngle() ?? Math.PI / 4;
    if (Math.abs(newAzimuth - azimuth) > 0.1) {
      setAzimuth(newAzimuth);
    }
    if (Math.abs(newPolar - polar) > 0.1) {
      setPolar(newPolar);
    }
  });

  const previewCells = useMemo(() => {
    if (selectedShape === "None" || !selectorPos) return [];

    const offsets = generateShape(selectedShape, shapeSize, isHollow);
    const rotatedOffsets = rotateOffsets(offsets, azimuth, polar);
    return rotatedOffsets
      .map(
        ([dx, dy, dz]) =>
          [selectorPos[0] + dx, selectorPos[1] + dy, selectorPos[2] + dz] as [
            number,
            number,
            number,
          ],
      )
      .filter(
        ([x, y, z]) =>
          x >= 0 &&
          x < gridSize &&
          y >= 0 &&
          y < gridSize &&
          z >= 0 &&
          z < gridSize,
      );
  }, [
    selectorPos,
    selectedShape,
    shapeSize,
    isHollow,
    gridSize,
    azimuth,
    polar,
  ]);

  if (previewCells.length === 0) return null;

  return (
    <group>
      {previewCells.map((cell, i) => (
        <mesh
          key={i}
          position={[cell[0] - offset, cell[1] - offset, (gridSize - 1 - cell[2]) - offset]}
        >
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.35} />
        </mesh>
      ))}
      {previewCells.map((cell, i) => (
        <lineSegments
          key={`edge-${i}`}
          position={[cell[0] - offset, cell[1] - offset, (gridSize - 1 - cell[2]) - offset]}
        >
          <edgesGeometry args={[new THREE.BoxGeometry(0.92, 0.92, 0.92)]} />
          <lineBasicMaterial color="#ffaa00" />
        </lineSegments>
      ))}
    </group>
  );
}

function AxisChannels({
  selectorPos,
  gridSize,
}: {
  selectorPos: [number, number, number];
  gridSize: number;
}) {
  const offset = (gridSize - 1) / 2;
  const channelWidth = 0.05;

  return (
    <group>
      {/* X-axis channel */}
      <mesh
        position={[0, selectorPos[1] - offset, (gridSize - 1 - selectorPos[2]) - offset]}
        raycast={() => null}
      >
        <boxGeometry args={[gridSize, channelWidth, channelWidth]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Y-axis channel */}
      <mesh
        position={[selectorPos[0] - offset, 0, (gridSize - 1 - selectorPos[2]) - offset]}
        raycast={() => null}
      >
        <boxGeometry args={[channelWidth, gridSize, channelWidth]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Z-axis channel */}
      <mesh
        position={[selectorPos[0] - offset, selectorPos[1] - offset, 0]}
        raycast={() => null}
      >
        <boxGeometry args={[channelWidth, channelWidth, gridSize]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function FaceLabels({ size }: { size: number }) {
  const {
    state: { cameraOrientation },
  } = useSimulation();
  const half = size / 2;
  const padding = 1.5;
  const labelStyle: React.CSSProperties = {
    color: "white",
    fontSize: "12pt",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    whiteSpace: "nowrap",
  };

  const labels = [
    { name: "Right", normal: new THREE.Vector3(1, 0, 0) },
    { name: "Left", normal: new THREE.Vector3(-1, 0, 0) },
    { name: "Top", normal: new THREE.Vector3(0, 1, 0) },
    { name: "Bottom", normal: new THREE.Vector3(0, -1, 0) },
    { name: "Front", normal: new THREE.Vector3(0, 0, 1) },
    { name: "Back", normal: new THREE.Vector3(0, 0, -1) },
  ];

  const face = cameraOrientation.face;
  if (!face || face === "unknown") return null;

  const currentFaceData = labels.find(({ name }) => name.toLowerCase() === face);
  if (!currentFaceData) return null;

  let finalX = 0,
    finalY = 0,
    finalZ = 0;
  const labelOffsetFromCorner = 0.5; // Small offset from the absolute corner for visual appeal

  switch (face) {
    case "back": // Normal (0,0,-1)
      finalX = half - labelOffsetFromCorner;
      finalY = half - labelOffsetFromCorner;
      finalZ = -(half + padding);
      break;
    case "front": // Normal (0,0,1)
      finalX = -(half - labelOffsetFromCorner); // Top-right from viewer's perspective is -X
      finalY = half - labelOffsetFromCorner;
      finalZ = half + padding;
      break;
    case "right": // Normal (1,0,0)
      finalX = half + padding;
      finalY = half - labelOffsetFromCorner;
      finalZ = half - labelOffsetFromCorner;
      break;
    case "left": // Normal (-1,0,0)
      finalX = -(half + padding);
      finalY = half - labelOffsetFromCorner;
      finalZ = -(half - labelOffsetFromCorner); // Top-right from viewer's perspective is -Z
      break;
    case "top": // Normal (0,1,0)
      finalX = half - labelOffsetFromCorner;
      finalY = half + padding;
      finalZ = -(half - labelOffsetFromCorner); // Top-right from viewer's perspective is -Z
      break;
    case "bottom": // Normal (0,-1,0)
      finalX = half - labelOffsetFromCorner;
      finalY = -(half + padding);
      finalZ = half - labelOffsetFromCorner;
      break;
  }

  return (
    <group>
      <Html key={face} position={[finalX, finalY, finalZ]} center>
        <div style={labelStyle}>{currentFaceData.name}</div>
      </Html>
    </group>
  );
}

function KeyboardSelector({
  controlsRef,
  cubeRef,
}: {
  controlsRef: React.RefObject<any>;
  cubeRef: React.RefObject<THREE.Group>;
}) {
  const {
    state: { gridSize },
    meta: { gridRef },
  } = useSimulation();
  const {
    state: { selectorPos },
  } = useBrush();

  if (!selectorPos) return null;

  const isAlive = gridRef.current.get(
    selectorPos[0],
    selectorPos[1],
    selectorPos[2],
  );
  const cursorColor = isAlive ? "#00ff00" : "#ffffff";
  const cursorOpacity = isAlive ? 0.5 : 0.3;

  const offset = (gridSize - 1) / 2;

  return (
    <group>
      <ShapePreview controlsRef={controlsRef} />
      <mesh
        raycast={() => null}
        position={[
          selectorPos[0] - offset,
          selectorPos[1] - offset,
          (gridSize - 1 - selectorPos[2]) - offset,
        ]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color={cursorColor}
          transparent
          opacity={cursorOpacity}
        />
      </mesh>
      <lineSegments
        raycast={() => null}
        position={[
          selectorPos[0] - offset,
          selectorPos[1] - offset,
          (gridSize - 1 - selectorPos[2]) - offset,
        ]}
      >
        <edgesGeometry args={[new THREE.BoxGeometry(1.02, 1.02, 1.02)]} />
        <lineBasicMaterial color={cursorColor} linewidth={2} />
      </lineSegments>
    </group>
  );
}

export function Scene() {
  const {
    state: {
      speed,
      cellMargin,
      rotationMode,
      running,
      community,
      gridSize,
      panSpeed,
      rotationSpeed,
      invertRotation,
    },
    actions: {
      tick,
      setCommunity,
      setSnapMessage,
      setCameraOrientation,
    },
    meta: { gridRef, movement, velocity },
  } = useSimulation();
  const {
    state: { selectorPos },
    actions: { setSelectorPos },
  } = useBrush();

  const lastTick = useRef(0);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const cubeRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const snapRotation = useRef({
    active: false,
    axis: new THREE.Vector3(),
    totalAngle: 0,
    startQuaternion: new THREE.Quaternion(),
    startTime: 0,
    duration: 1.0,
    lastAngle: 0,
    onComplete: undefined as (() => void) | undefined,
  });

  const {
    meta: { cameraActionsRef },
  } = useSimulation();

  const maxDistance = useMemo(() => {
    const padding = 1.1; // 10% margin

    // Sphere that encompasses the entire cube
    const radius = (gridSize / 2) * Math.sqrt(3);

    const fov = (camera as THREE.PerspectiveCamera).fov;
    const aspect = (camera as THREE.PerspectiveCamera).aspect;

    const tanFOV = Math.tan((Math.PI * fov) / 360);
    let distance = (radius * padding) / tanFOV;

    const hFov = 2 * Math.atan(tanFOV * aspect);
    const distanceH = (radius * padding) / Math.tan(hFov / 2);

    distance = Math.max(distance, distanceH);

    return distance * 2;
  }, [gridSize, camera]);

  useEffect(() => {
    const snapRotate = (direction: 'up' | 'down' | 'left' | 'right' | 'rollLeft' | 'rollRight') => {
      if (snapRotation.current.active || !cubeRef.current || !cameraRef.current) return;

      const camera = cameraRef.current;
      let angle = Math.PI / 2;
      let axis = new THREE.Vector3();

      switch (direction) {
        case 'up':
          axis.setFromMatrixColumn(camera.matrix, 0); // camera's right vector
          angle = Math.PI / 2;
          break;
        case 'down':
          axis.setFromMatrixColumn(camera.matrix, 0);
          angle = -Math.PI / 2;
          break;
        case 'left':
          axis.setFromMatrixColumn(camera.matrix, 1); // camera's up vector
          angle = Math.PI / 2;
          break;
        case 'right':
          axis.setFromMatrixColumn(camera.matrix, 1);
          angle = -Math.PI / 2;
          break;
        case 'rollLeft':
          axis.setFromMatrixColumn(camera.matrix, 2).negate(); // camera's forward vector
          angle = Math.PI / 2;
          break;
        case 'rollRight':
          axis.setFromMatrixColumn(camera.matrix, 2).negate();
          angle = -Math.PI / 2;
          break;
      }
      
      snapRotation.current.active = true;
      snapRotation.current.axis.copy(axis);
      snapRotation.current.totalAngle = angle;
      snapRotation.current.startQuaternion.copy(cubeRef.current.quaternion);
      snapRotation.current.startTime = 0;
      snapRotation.current.lastAngle = 0;
      snapRotation.current.onComplete = () => cameraActionsRef.current?.squareUp();
    };

    cameraActionsRef.current = {
      fitDisplay: () => {
        if (!controlsRef.current || !cameraRef.current) return;

        // Recenter on the origin without changing camera orientation
        cameraRef.current.position.sub(controlsRef.current.target);
        controlsRef.current.target.set(0, 0, 0);

        const size = gridRef.current.size;
        const padding = 1.1; // 10% margin

        // Sphere that encompasses the entire cube
        const radius = (size / 2) * Math.sqrt(3);

        const fov = cameraRef.current.fov;
        const aspect = cameraRef.current.aspect;

        const tanFOV = Math.tan((Math.PI * fov) / 360);
        let distance = (radius * padding) / tanFOV;

        const hFov = 2 * Math.atan(tanFOV * aspect);
        const distanceH = (radius * padding) / Math.tan(hFov / 2);

        distance = Math.max(distance, distanceH);

        const direction = new THREE.Vector3()
          .subVectors(cameraRef.current.position, controlsRef.current.target)
          .normalize();
        cameraRef.current.position.copy(direction.multiplyScalar(distance));

        controlsRef.current.update();
      },
      recenter: () => {
        if (!controlsRef.current) return;
        const offset = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), controlsRef.current.target);
        cameraRef.current?.position.add(offset);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      },
      squareUp: () => {
        if (!controlsRef.current || !cubeRef.current || !cameraRef.current)
          return;

        // 1. Determine which face is pointing towards the camera.
        const toCamera = cameraRef.current.position
          .clone()
          .sub(controlsRef.current.target)
          .normalize();
        const Q_current = cubeRef.current.quaternion.clone();
        const localToCamera = toCamera
          .clone()
          .applyQuaternion(Q_current.clone().invert());

        const { x: localX, y: localY, z: localZ } = localToCamera;
        const absX = Math.abs(localX),
          absY = Math.abs(localY),
          absZ = Math.abs(localZ);
        const dominantLocalAxis = new THREE.Vector3();
        if (absX > absY && absX > absZ) {
          dominantLocalAxis.set(Math.sign(localX), 0, 0);
        } else if (absY > absX && absY > absZ) {
          dominantLocalAxis.set(0, Math.sign(localY), 0);
        } else {
          dominantLocalAxis.set(0, 0, Math.sign(localZ));
        }

        // 2. Determine where the camera will snap to and the corresponding "front" vector.
        const azimuth = controlsRef.current.getAzimuthalAngle();
        const snappedAzimuth =
          Math.round(azimuth / (Math.PI / 2)) * (Math.PI / 2);
        const targetFrontVector = new THREE.Vector3(
          Math.sin(snappedAzimuth),
          0,
          Math.cos(snappedAzimuth),
        );

        // 3. Calculate the target rotation to make the dominant face front and level the cube.
        const targetUpVector = new THREE.Vector3(0, 1, 0);
        const targetRightVector = new THREE.Vector3().crossVectors(
          targetUpVector,
          targetFrontVector,
        );

        const finalQuaternion = new THREE.Quaternion();
        const targetMatrix = new THREE.Matrix4();

        const { x: dx, y: dy, z: dz } = dominantLocalAxis;
        const col1 = new THREE.Vector3(),
          col2 = new THREE.Vector3(),
          col3 = new THREE.Vector3();

        if (Math.abs(dx) > 0.5) {
          // right/left face is dominant (local X)
          const sign = Math.sign(dx);
          col1.copy(targetFrontVector).multiplyScalar(sign); // Map local X to target Z
          col2.copy(targetUpVector); // Map local Y to target Y
          col3.copy(targetRightVector).multiplyScalar(-sign); // Map local Z to -target X
        } else if (Math.abs(dz) > 0.5) {
          // front/back face is dominant (local Z)
          const sign = Math.sign(dz);
          col1.copy(targetRightVector).multiplyScalar(sign); // Map local X to target X
          col2.copy(targetUpVector); // Map local Y to target Y
          col3.copy(targetFrontVector).multiplyScalar(sign); // Map local Z to target Z
        } else {
          // top/bottom face is dominant (local Y)
          const sign = Math.sign(dy);
          col1.copy(targetRightVector).multiplyScalar(-sign); // Map local X to -target X
          col2.copy(targetFrontVector).multiplyScalar(sign); // Map local Y to target Z
          col3.copy(targetUpVector); // Map local Z to target Y
        }

        targetMatrix.makeBasis(col1, col2, col3);
        finalQuaternion.setFromRotationMatrix(targetMatrix);

        // 4. Apply this rotation to the cube.
        cubeRef.current.quaternion.copy(finalQuaternion);

        // Determine face name and orientation for message
        let faceName = "";
        if (absX > absY && absX > absZ) {
          faceName = Math.sign(localX) > 0 ? "Right" : "Left";
        } else if (absY > absX && absY > absZ) {
          faceName = Math.sign(localY) > 0 ? "Top" : "Bottom";
        } else {
          faceName = Math.sign(localZ) > 0 ? "Front" : "Back";
        }
    
        let rotationDeg: CameraOrientation['rotation'] = 0;
        const lowerCaseFaceName = faceName.toLowerCase();
    
        if (lowerCaseFaceName === 'top' || lowerCaseFaceName === 'bottom') {
          // For top/bottom views, the reference is the cube's local +Z axis (its "front" face).
          const cubeFront = new THREE.Vector3(0, 0, 1).applyQuaternion(finalQuaternion);
          // We check its direction on the world's XZ plane to determine rotation.
          if (Math.abs(cubeFront.z) > 0.9) { // Pointing towards world Z or -Z
            rotationDeg = cubeFront.z < 0 ? 0 : 180; // World -Z is "front" (0 deg)
          } else if (Math.abs(cubeFront.x) > 0.9) { // Pointing towards world X or -X
            rotationDeg = cubeFront.x < 0 ? 90 : 270; // World -X is "left" (90 deg)
          }
        } else {
          // For front/back/left/right views, the reference is the cube's local Y-axis (its "top" face).
          const cubeUp = new THREE.Vector3(0, 1, 0).applyQuaternion(finalQuaternion);
          // We check its direction relative to the world axes.
          if (Math.abs(cubeUp.y) > 0.9) { // Pointing towards world Y or -Y
            rotationDeg = cubeUp.y > 0 ? 0 : 180;
          } else if (Math.abs(cubeUp.x) > 0.9) { // Pointing towards world X or -X
            rotationDeg = cubeUp.x < 0 ? 90 : 270;
          }
        }
    
        const message = `Snapped to: ${faceName} face, ${rotationDeg}°`;
        setSnapMessage(message);
    
        // 5. Do the rest of squareUp: reset camera roll and snap position.
        cameraRef.current.up.set(0, 1, 0);

        const snappedPolar = Math.PI / 2; // Level with the horizon
        const distance = cameraRef.current.position.distanceTo(
          controlsRef.current.target,
        );

        // Calculate new camera position based on snapped angles
        const x =
          distance * Math.sin(snappedAzimuth) * Math.sin(snappedPolar);
        const y = distance * Math.cos(snappedPolar);
        const z =
          distance * Math.cos(snappedAzimuth) * Math.sin(snappedPolar);

        cameraRef.current.position
          .set(x, y, z)
          .add(controlsRef.current.target);
        controlsRef.current.update();
      },
      snapRotate,
    };
    return () => {
      cameraActionsRef.current = null;
    };
  }, [cameraActionsRef, gridRef, cubeRef, setSnapMessage, cameraRef, controlsRef]);

  useFrame((state, delta) => {
    if (snapRotation.current.active && cubeRef.current) {
      if (snapRotation.current.startTime === 0) {
        snapRotation.current.startTime = state.clock.getElapsedTime();
      }
      const elapsedTime = state.clock.getElapsedTime() - snapRotation.current.startTime;
      let progress = elapsedTime / snapRotation.current.duration;

      if (progress >= 1) {
        const finalRotation = new THREE.Quaternion().setFromAxisAngle(
          snapRotation.current.axis,
          snapRotation.current.totalAngle,
        );
        cubeRef.current.quaternion.copy(snapRotation.current.startQuaternion).premultiply(finalRotation);

        snapRotation.current.active = false;
        if (snapRotation.current.onComplete) {
          snapRotation.current.onComplete();
          snapRotation.current.onComplete = undefined;
        }
      } else {
        progress = progress * progress * progress; // ease-in-cubic
        const currentAngle = snapRotation.current.totalAngle * progress;
        const angleThisFrame = currentAngle - snapRotation.current.lastAngle;
        
        cubeRef.current.rotateOnWorldAxis(snapRotation.current.axis, angleThisFrame);

        snapRotation.current.lastAngle = currentAngle;
      }
    }

    const panMaxSpeed = panSpeed;
    const dollyMaxSpeed = panSpeed * 1.5;
    const minRotSpeed = 10, maxRotSpeed = 360;
    const actualRotationSpeed = minRotSpeed + ((rotationSpeed - 1) / 99) * (maxRotSpeed - minRotSpeed);
    const minRollSpeed = 25, maxRollSpeed = 1200;
    const actualRollSpeed = minRollSpeed + ((rotationSpeed - 1) / 99) * (maxRollSpeed - minRollSpeed);
    const rotateMaxSpeed = (actualRotationSpeed * Math.PI) / 180;
    const rollMaxSpeed = actualRollSpeed;

    const acceleration = panMaxSpeed;
    const dollyAcceleration = dollyMaxSpeed;
    const rotationAcceleration = rotateMaxSpeed;
    const rollAcceleration = rollMaxSpeed;
    const damping = 0.9;

    if (movement.current.right) velocity.current.panX = Math.min(velocity.current.panX + acceleration * delta, panMaxSpeed);
    else if (movement.current.left) velocity.current.panX = Math.max(velocity.current.panX - acceleration * delta, -panMaxSpeed);
    else velocity.current.panX *= damping;

    if (movement.current.down) velocity.current.panY = Math.min(velocity.current.panY + acceleration * delta, panMaxSpeed);
    else if (movement.current.up) velocity.current.panY = Math.max(velocity.current.panY - acceleration * delta, -panMaxSpeed);
    else velocity.current.panY *= damping;

    if (movement.current.rotateRight) velocity.current.rotateX = Math.min(velocity.current.rotateX + rotationAcceleration * delta, rotateMaxSpeed);
    else if (movement.current.rotateLeft) velocity.current.rotateX = Math.max(velocity.current.rotateX - rotationAcceleration * delta, -rotateMaxSpeed);
    else velocity.current.rotateX *= damping;

    if (movement.current.rotateUp) velocity.current.rotateY = Math.min(velocity.current.rotateY + rotationAcceleration * delta, rotateMaxSpeed);
    else if (movement.current.rotateDown) velocity.current.rotateY = Math.max(velocity.current.rotateY - rotationAcceleration * delta, -rotateMaxSpeed);
    else velocity.current.rotateY *= damping;

    if (movement.current.rollRight) velocity.current.roll = Math.min(velocity.current.roll + rollAcceleration * delta, rollMaxSpeed);
    else if (movement.current.rollLeft) velocity.current.roll = Math.max(velocity.current.roll - rollAcceleration * delta, -rollMaxSpeed);
    else velocity.current.roll *= damping;

    if (movement.current.backward) velocity.current.dolly = Math.min(velocity.current.dolly + dollyAcceleration * delta, dollyMaxSpeed);
    else if (movement.current.forward) velocity.current.dolly = Math.max(velocity.current.dolly - dollyAcceleration * delta, -dollyMaxSpeed);
    else velocity.current.dolly *= damping;

    if (Math.abs(velocity.current.roll) > 0.01) {
      if (cameraRef.current && controlsRef.current && cubeRef.current) {
        const oldUp = cameraRef.current.up.clone();
        const rollAngleRad = (velocity.current.roll * delta * Math.PI) / 180;
        const camera = cameraRef.current;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        const quaternion = new THREE.Quaternion().setFromAxisAngle(forward, rollAngleRad);
        camera.up.applyQuaternion(quaternion);
        if (getCubeVisibility(cubeRef.current, camera, gridSize).isOffScreen) camera.up.copy(oldUp);
        else controlsRef.current.update();
      }
    } else {
      velocity.current.roll = 0;
    }

    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current, controls = controlsRef.current;
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
      const forward = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 2).negate();
      let needsUpdate = false;
      const panOffset = new THREE.Vector3();

      if (Math.abs(velocity.current.panX) > 0.01) panOffset.add(right.clone().multiplyScalar(velocity.current.panX * delta));
      else velocity.current.panX = 0;
      if (Math.abs(velocity.current.panY) > 0.01) panOffset.add(up.clone().multiplyScalar(velocity.current.panY * delta));
      else velocity.current.panY = 0;

      if (panOffset.lengthSq() > 0) {
        const oldPos = camera.position.clone(), oldTarget = controls.target.clone();
        camera.position.add(panOffset);
        controls.target.add(panOffset);
        if (cubeRef.current) {
          const visibility = getCubeVisibility(cubeRef.current, camera, gridSize);
          if (visibility.isOffScreen) {
            const panX = velocity.current.panX;
            const panY = velocity.current.panY;

            const cameraPanRight = panX > 0;
            const cameraPanLeft = panX < 0;
            const cameraPanUp = panY > 0; // q key, cube moves down
            const cameraPanDown = panY < 0; // z key, cube moves up

            const blockPanX =
              (visibility.isOffScreenLeft && cameraPanRight) ||
              (visibility.isOffScreenRight && cameraPanLeft);
            const blockPanY =
              (visibility.isOffScreenTop && cameraPanDown) ||
              (visibility.isOffScreenBottom && cameraPanUp);

            if (blockPanX && blockPanY) {
              camera.position.copy(oldPos);
              controls.target.copy(oldTarget);
            } else if (blockPanX) {
              const panXOffset = right.clone().multiplyScalar(panX * delta);
              camera.position.sub(panXOffset);
              controls.target.sub(panXOffset);
              needsUpdate = true;
            } else if (blockPanY) {
              const panYOffset = up.clone().multiplyScalar(panY * delta);
              camera.position.sub(panYOffset);
              controls.target.sub(panYOffset);
              needsUpdate = true;
            } else {
              needsUpdate = true;
            }
          } else {
            needsUpdate = true;
          }
        } else {
          needsUpdate = true;
        }
      }

      if (Math.abs(velocity.current.dolly) > 0.01) {
        const oldPos = camera.position.clone();
        camera.position.add(forward.clone().multiplyScalar(velocity.current.dolly * delta));
        if (cubeRef.current && getCubeVisibility(cubeRef.current, camera, gridSize).isOffScreen) camera.position.copy(oldPos);
        else needsUpdate = true;
      } else {
        velocity.current.dolly = 0;
      }

      const rotateX = velocity.current.rotateX * delta;
      const rotateY = velocity.current.rotateY * delta;

      if (cubeRef.current && rotationMode && !snapRotation.current.active) {
        if (Math.abs(rotateX) > 0) cubeRef.current.rotateOnWorldAxis(up, -rotateX);
        if (Math.abs(rotateY) > 0) cubeRef.current.rotateOnWorldAxis(right, rotateY);
      }

      if (Math.abs(velocity.current.rotateX) < 0.01) velocity.current.rotateX = 0;
      if (Math.abs(velocity.current.rotateY) < 0.01) velocity.current.rotateY = 0;
      if (needsUpdate) controls.update();
    }
  });

  useFrame((state) => {
    if (running) {
      const elapsed = state.clock.getElapsedTime();
      if (elapsed - lastTick.current > 1 / speed) {
        lastTick.current = elapsed;
        tick();
      }
    }
  });


  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[30, 30, 30]} intensity={1} />
      <pointLight position={[-30, -30, -30]} intensity={0.5} />
      <group ref={cubeRef}>
        <Cells
        grid={gridRef.current}
        margin={cellMargin}
        selectorPos={selectorPos}
        onClick={(e) => {
          if (running) return;
          e.stopPropagation();
          const { instanceId } = e;
          if (instanceId !== undefined) {
            const cells = gridRef.current.getLivingCells();
            const cell = cells[instanceId];
            if (cell) {
              const [x, y, z] = cell;
              setSelectorPos([x, y, z]);
              const community = gridRef.current.getCommunity(x, y, z);
              setCommunity(community);
              console.log("Clicked cell at", x, y, z, "Community:", community.length);
            }
          }
        }}
      />
        <BoundingBox size={gridRef.current.size} />
        {!rotationMode && (
          <>
            <FaceLabels size={gridRef.current.size} />
            <KeyboardSelector controlsRef={controlsRef} cubeRef={cubeRef} />
          </>
        )}
      </group>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        enabled={true} // always allow dragging/zooming even in edit mode
        maxDistance={maxDistance}
        onChange={() => {
          if (cameraRef.current) {
            const pos = cameraRef.current.position.clone().normalize();
            const up = cameraRef.current.up.clone().normalize();
    
            const { x, y, z } = pos;
            const ax = Math.abs(x);
            const ay = Math.abs(y);
            const az = Math.abs(z);
    
            let face: CameraOrientation["face"] = "unknown";
            if (az > ax && az > ay) face = z > 0 ? "front" : "back";
            else if (ax > ay && ax > az) face = x > 0 ? "right" : "left";
            else if (ay > ax && ay > az) face = y > 0 ? "top" : "bottom";
            if (face === "unknown") {
                setCameraOrientation({ face: "unknown", rotation: "unknown" });
                return;
            };
    
            let rotation: CameraOrientation["rotation"] = "unknown";
    
            switch (face) {
              case "front":
              case "back":
                if (up.y > 0.7) rotation = 0;
                else if (up.x < -0.7) rotation = 90;
                else if (up.y < -0.7) rotation = 180;
                else if (up.x > 0.7) rotation = 270;
                break;
              case "top":
              case "bottom":
                if (face === "top") {
                  if (up.z > 0.7) rotation = 0;
                  else if (up.x < -0.7) rotation = 90;
                  else if (up.z < -0.7) rotation = 180;
                  else if (up.x > 0.7) rotation = 270;
                } else { // bottom
                  if (up.z < -0.7) rotation = 0;
                  else if (up.x < -0.7) rotation = 90;
                  else if (up.z > 0.7) rotation = 180;
                  else if (up.x > 0.7) rotation = 270;
                }
                break;
              case "right":
              case "left":
                if (up.y > 0.7) rotation = 0;
                else if (face === "right" ? up.z > 0.7 : up.z < -0.7) rotation = 90;
                else if (up.y < -0.7) rotation = 180;
                else if (face === "right" ? up.z < -0.7 : up.z > 0.7) rotation = 270;
                break;
            }
            setCameraOrientation({ face, rotation });
          }
        }}
      />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 40]} />
    </>
  );
}
