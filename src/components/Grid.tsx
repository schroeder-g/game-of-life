import { Html, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { generateShape } from "../core/shapes";
import { Cells } from "./Cell";
import { type CameraOrientation } from "../core/cameraUtils";
import { type CameraFace, type CameraRotation, KEY_MAP, rotationLookup } from "../core/faceOrientationKeyMapping";

const _toCamera = new THREE.Vector3();
const _localToCamera = new THREE.Vector3();
const _localUp = new THREE.Vector3();
const _cubeQuatInv = new THREE.Quaternion();

function getOrientation(
  camera: THREE.Camera,
  controlsTarget: THREE.Vector3,
  cube: THREE.Group,
): CameraOrientation {
  _toCamera.copy(camera.position).sub(controlsTarget).normalize();
  _cubeQuatInv.copy(cube.quaternion).invert();
  _localToCamera.copy(_toCamera).applyQuaternion(_cubeQuatInv);

  const { x: lx, y: ly, z: lz } = _localToCamera;
  const ax = Math.abs(lx), ay = Math.abs(ly), az = Math.abs(lz);

  let face: CameraFace = "front";
  if (az >= ax && az >= ay) face = lz > 0 ? "front" : "back";
  else if (ax >= ay && ax >= az) face = lx > 0 ? "right" : "left";
  else face = ly > 0 ? "top" : "bottom";

  // Use the camera's actual screen-up (Y axis from world matrix), NOT camera.up
  // which is always (0,1,0) with OrbitControls and never changes during orbit.
  const m = camera.matrixWorld.elements;
  _localUp.set(m[4], m[5], m[6]).normalize().applyQuaternion(_cubeQuatInv);
  const { x: ux, y: uy, z: uz } = _localUp;
  const aux = Math.abs(ux), auy = Math.abs(uy), auz = Math.abs(uz);

  let rotation: CameraRotation = 0;

  switch (face) {
    case "front":
    case "back":
      if (auy >= aux) rotation = uy > 0 ? 0 : 180;
      else rotation = ux < 0 ? 90 : 270;
      break;
    case "top":
    case "bottom":
      if (face === "top") {
        if (auz >= aux) rotation = uz > 0 ? 180 : 0;
        else rotation = ux < 0 ? 90 : 270;
      } else { // bottom
        if (auz >= aux) rotation = uz < 0 ? 180 : 0;
        else rotation = ux < 0 ? 90 : 270;
      }
      break;
    case "right":
    case "left":
      if (auy >= auz) rotation = uy > 0 ? 0 : 180;
      else {
        if (face === "right") rotation = uz > 0 ? 90 : 270;
        else rotation = uz < 0 ? 90 : 270;
      }
      break;
  }

  return { face, rotation };
}
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
  const [opacity, setOpacity] = useState(0);

  useFrame((_, delta) => {
    if (opacity < 1) {
      setOpacity(prev => Math.min(1, prev + delta));
    }
  });

  return (
    <lineSegments raycast={() => null}>
      <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
      <lineBasicMaterial color="silver" transparent opacity={opacity} />
    </lineSegments>
  );
}

function ShapePreview({
  controlsRef,
  cubeRef,
  brushQuaternion,
}: {
  controlsRef: React.RefObject<any>;
  cubeRef: React.RefObject<THREE.Group>;
  brushQuaternion: React.RefObject<THREE.Quaternion>;
}) {
  const {
    state: { gridSize },
    meta: { gridRef },
  } = useSimulation();
  const {
    state: { selectedShape, shapeSize, isHollow, selectorPos, brushRotationVersion, customOffsets },
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

  const { previewCells, maxDist } = useMemo(() => {
    if (selectedShape === "None" || !selectorPos) return { previewCells: [], maxDist: 0 };

    const offsets = generateShape(selectedShape, shapeSize, isHollow, customOffsets);
    if (offsets.length === 0) return { previewCells: [], maxDist: 0 };

    const maxDist = Math.max(...offsets.map(o => Math.sqrt(o[0] ** 2 + o[1] ** 2 + o[2] ** 2)));

    const previewCells = offsets
      .map((originalOffset) => {
        const [dx, dy, dz] = originalOffset;
        const v = new THREE.Vector3(dx, dy, dz);

        if (brushQuaternion.current) v.applyQuaternion(brushQuaternion.current);

        const cell = [
          selectorPos[0] + Math.round(v.x),
          selectorPos[1] + Math.round(v.y),
          selectorPos[2] + Math.round(v.z),
        ] as [number, number, number];

        return { originalOffset, cell };
      })
      .filter(
        ({ cell: [x, y, z] }) =>
          x >= 0 &&
          x < gridSize &&
          y >= 0 &&
          y < gridSize &&
          z >= 0 &&
          z < gridSize,
      );

    return { previewCells, maxDist };
  }, [
    selectorPos,
    selectedShape,
    shapeSize,
    isHollow,
    gridSize,
    azimuth,
    polar,
    brushRotationVersion,
    brushQuaternion,
    cubeRef,
    customOffsets,
  ]);

  if (previewCells.length === 0) return null;

  return (
    <group>
      {previewCells.map(({ cell, originalOffset }, i) => {
        const isAlive = gridRef.current.get(cell[0], cell[1], cell[2]);
        const position: [number, number, number] = [
          cell[0] - offset,
          cell[1] - offset,
          gridSize - 1 - cell[2] - offset,
        ];

        // Opacity logic for inactive cell fill
        const dist = Math.sqrt(originalOffset[0] ** 2 + originalOffset[1] ** 2 + originalOffset[2] ** 2);
        const relativeDist = maxDist > 0 ? dist / maxDist : 0;
        const minOpacity = 0.15;
        const maxOpacity = 0.7;
        const opacity = maxOpacity - relativeDist * (maxOpacity - minOpacity);

        return (
          <React.Fragment key={i}>
            {/* Glow layer */}
            <mesh raycast={() => null} position={position}>
              <boxGeometry args={[1.1, 1.1, 1.1]} />
              <meshBasicMaterial
                color={isAlive ? "#ffffff" : "#ffdd44"}
                transparent
                opacity={isAlive ? 0.15 : 0.2}
                depthWrite={false}
              />
            </mesh>
            {/* Cell fill */}
            <mesh position={position}>
              <boxGeometry args={[0.9, 0.9, 0.9]} />
              {isAlive ? (
                <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
              ) : (
                <meshBasicMaterial
                  color="#ffdd44"
                  transparent
                  opacity={opacity}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              )}
            </mesh>
            {/* Dark outlines */}
            <lineSegments position={position}>
              <edgesGeometry args={[new THREE.BoxGeometry(0.92, 0.92, 0.92)]} />
              <lineBasicMaterial color="#333333" />
            </lineSegments>
          </React.Fragment>
        );
      })}
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

  const rotationStr = cameraOrientation.rotation !== "unknown" ? `${cameraOrientation.rotation}°` : "";

  return (
    <group>
      <Html key={face} position={[finalX, finalY, finalZ]} center>
        <div style={labelStyle}>
          {currentFaceData.name}{rotationStr && `, ${rotationStr}`}
        </div>
      </Html>
    </group>
  );
}

function KeyboardSelector({
  controlsRef,
  cubeRef,
  brushQuaternion,
  cameraActionsRef,
}: {
  controlsRef: React.RefObject<any>;
  cubeRef: React.RefObject<THREE.Group>;
  brushQuaternion: React.RefObject<THREE.Quaternion>;
  cameraActionsRef: React.RefObject<any>;
}) {
  const {
    state: { gridSize, rotationMode },
    meta: { gridRef },
  } = useSimulation();
  const {
    state: { selectorPos, selectedShape, isBirthing, isClearing },
  } = useBrush();

  const isBrushActive = selectedShape !== "None";

  const lastPaintedPos = useRef<string | null>(null);
  useEffect(() => {
    if (!selectorPos || (!isBirthing && !isClearing)) {
      lastPaintedPos.current = null; // Reset when modes are off
      return;
    }

    const posKey = selectorPos.join(',');
    if (posKey === lastPaintedPos.current) return; // Don't repaint same spot

    if (isBirthing) {
      cameraActionsRef.current?.birthBrushCells();
    } else if (isClearing) {
      cameraActionsRef.current?.clearBrushCells();
    }
    lastPaintedPos.current = posKey;

  }, [selectorPos, isBirthing, isClearing, cameraActionsRef]);

  if (rotationMode || !selectorPos) return null;

  const isAlive = gridRef.current.get(
    selectorPos[0],
    selectorPos[1],
    selectorPos[2],
  );
  const cursorColor = "#ffffff";
  const glowColor = "#ffff00";
  const cursorOpacity = 0.3;

  const offset = (gridSize - 1) / 2;

  return (
    <group>
      <AxisChannels selectorPos={selectorPos} gridSize={gridSize} />
      <ShapePreview controlsRef={controlsRef} cubeRef={cubeRef} brushQuaternion={brushQuaternion} />
      {/* Hide cursor when brush is active — the ShapePreview replaces it */}
      {!isBrushActive && (
        <>
          {/* Glow Mesh */}
          <mesh
            raycast={() => null}
            position={[
              selectorPos[0] - offset,
              selectorPos[1] - offset,
              (gridSize - 1 - selectorPos[2]) - offset,
            ]}
          >
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshBasicMaterial
              color={cursorColor}
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>
          {/* Primary Selector Mesh */}
          <mesh
            raycast={() => null}
            position={[
              selectorPos[0] - offset,
              selectorPos[1] - offset,
              (gridSize - 1 - selectorPos[2]) - offset,
            ]}
          >
            <boxGeometry args={[1.05, 1.05, 1.05]} />
            <meshBasicMaterial
              color={cursorColor}
              transparent
              opacity={0.5}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-4}
              polygonOffsetUnits={-4}
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
            <edgesGeometry args={[new THREE.BoxGeometry(1.06, 1.06, 1.06)]} />
            <lineBasicMaterial color={cursorColor} linewidth={2} transparent opacity={0.8} />
          </lineSegments>
        </>
      )}
    </group>
  );
}

export function Scene() {
  const {
    state,
    actions,
    meta: { gridRef, movement, velocity, eventBus },
  } = useSimulation();
  const {
    tick,
    setCommunity,
    setSnapMessage,
    setCameraOrientation,
  } = actions;
  const {
    speed,
    cellMargin,
    rotationMode,
    running,
    community,
    gridSize,
    panSpeed,
    rotationSpeed,
    rollSpeed,
    invertYaw,
    invertPitch,
    invertRoll,
    easeIn,
    easeOut,
    cameraOrientation,
  } = state;
  const {
    state: brushState,
    actions: { setSelectorPos, setCustomBrush },
  } = useBrush();
  const { selectorPos, selectedShape, shapeSize, isHollow, brushQuaternion, customOffsets } = brushState;

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
  const lastSelectorMoveTime = useRef(0);

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

        const targetUpVector = new THREE.Vector3(0, 1, 0);
        const targetRightVector = new THREE.Vector3().crossVectors(
          targetUpVector,
          targetFrontVector,
        );

        // 3. Find which local axis should point UP, ensuring it's not the same as the dominant axis.
        const localUp = targetUpVector.clone().applyQuaternion(Q_current.clone().invert());

        const candidates = [
          { axis: new THREE.Vector3(1, 0, 0), dot: Math.abs(localUp.x), sign: Math.sign(localUp.x) },
          { axis: new THREE.Vector3(0, 1, 0), dot: Math.abs(localUp.y), sign: Math.sign(localUp.y) },
          { axis: new THREE.Vector3(0, 0, 1), dot: Math.abs(localUp.z), sign: Math.sign(localUp.z) },
        ];

        // Filter out the candidate that is parallel to the dominantLocalAxis
        const validCandidates = candidates.filter(c => Math.abs(c.axis.dot(dominantLocalAxis)) < 0.1);

        // From the valid candidates, find the one most aligned with the world UP
        validCandidates.sort((a, b) => b.dot - a.dot);
        const bestUpCandidate = validCandidates[0];
        const dominantLocalUpAxis = bestUpCandidate.axis.clone().multiplyScalar(bestUpCandidate.sign || 1);

        // 4. Construct the rotation matrix by mapping local axes to world axes
        const localXTarget = new THREE.Vector3();
        const localYTarget = new THREE.Vector3();
        const localZTarget = new THREE.Vector3();

        const assignTarget = (localAxis: THREE.Vector3, worldTarget: THREE.Vector3) => {
          if (Math.abs(localAxis.x) > 0.5) localXTarget.copy(worldTarget).multiplyScalar(Math.sign(localAxis.x));
          else if (Math.abs(localAxis.y) > 0.5) localYTarget.copy(worldTarget).multiplyScalar(Math.sign(localAxis.y));
          else if (Math.abs(localAxis.z) > 0.5) localZTarget.copy(worldTarget).multiplyScalar(Math.sign(localAxis.z));
        };

        assignTarget(dominantLocalAxis, targetFrontVector);
        assignTarget(dominantLocalUpAxis, targetUpVector);

        // Third axis via cross product
        const dominantRightAxis = new THREE.Vector3().crossVectors(dominantLocalUpAxis, dominantLocalAxis);
        assignTarget(dominantRightAxis, targetRightVector);

        const targetMatrix = new THREE.Matrix4();
        targetMatrix.makeBasis(localXTarget, localYTarget, localZTarget);
        const finalQuaternion = new THREE.Quaternion().setFromRotationMatrix(targetMatrix);

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

        const localFaces = [
          { name: 'Top', vector: new THREE.Vector3(0, 1, 0) },
          { name: 'Bottom', vector: new THREE.Vector3(0, -1, 0) },
          { name: 'Front', vector: new THREE.Vector3(0, 0, -1) },
          { name: 'Back', vector: new THREE.Vector3(0, 0, 1) },
          { name: 'Right', vector: new THREE.Vector3(1, 0, 0) },
          { name: 'Left', vector: new THREE.Vector3(-1, 0, 0) },
        ];

        const worldUp = new THREE.Vector3(0, 1, 0);
        let topFaceName = '';
        let maxDot = -Infinity;

        for (const face of localFaces) {
          const worldVector = face.vector.clone().applyQuaternion(finalQuaternion);
          const dot = worldVector.dot(worldUp);
          if (dot > maxDot) {
            maxDot = dot;
            topFaceName = face.name;
          }
        }

        const message = `Snapped to: ${faceName}${topFaceName ? `, ${topFaceName}` : ''}`;
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
      rotateBrush: (axis: THREE.Vector3, angle: number) => {
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        const nextQ = brushQuaternion.current.clone().premultiply(q);

        if (selectedShape !== "None" && selectorPos) {
          const offsets = generateShape(selectedShape, shapeSize, isHollow, customOffsets);

          // Compute current rotated offsets with existing quaternion
          const currentRotated = offsets.map(off => {
            const v = new THREE.Vector3(...off);
            v.applyQuaternion(brushQuaternion.current);
            return v;
          });

          // Find bounding box center of current rotated offsets
          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          let minZ = Infinity, maxZ = -Infinity;
          for (const v of currentRotated) {
            minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
          }
          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const cz = (minZ + maxZ) / 2;
          const center = new THREE.Vector3(cx, cy, cz);

          // Compute how the center moves under the new rotation q
          // Adjustment = c - q*c  (keeps the bounding box center fixed)
          const rotatedCenter = center.clone().applyQuaternion(q);
          const adj = new THREE.Vector3().subVectors(center, rotatedCenter);
          const adjX = Math.round(adj.x);
          const adjY = Math.round(adj.y);
          const adjZ = Math.round(adj.z);

          // Compute new rotated offsets (with adjusted selectorPos)
          const newSelectorPos: [number, number, number] = [
            selectorPos[0] + adjX,
            selectorPos[1] + adjY,
            selectorPos[2] + adjZ,
          ];

          const newRotatedOffsets = offsets.map(off => {
            const v = new THREE.Vector3(...off);
            v.applyQuaternion(nextQ);
            return [Math.round(v.x), Math.round(v.y), Math.round(v.z)] as [number, number, number];
          });

          // Check that at least one cell would be inside the grid
          const isAnyInside = newRotatedOffsets.some(([dx, dy, dz]) => {
            const tx = newSelectorPos[0] + dx;
            const ty = newSelectorPos[1] + dy;
            const tz = newSelectorPos[2] + dz;
            return tx >= 0 && tx < gridSize && ty >= 0 && ty < gridSize && tz >= 0 && tz < gridSize;
          });

          if (!isAnyInside) return; // Block rotation

          // Apply the selectorPos adjustment
          setSelectorPos(newSelectorPos);
        }

        brushQuaternion.current.copy(nextQ);
        // Trigger re-render of ShapePreview
        const { incrementBrushRotationVersion } = (window as any).brushActions || {};
        if (incrementBrushRotationVersion) incrementBrushRotationVersion();
      },
      rotateBrushByDirection: (direction: 'up' | 'down' | 'left' | 'right' | 'rollLeft' | 'rollRight') => {
        // Use the dominant face/angle from cameraOrientation and rotationLookup
        // to get grid-local axes that match the snapped orientation, not the raw camera.
        const face = cameraOrientation.face;
        const rotation = cameraOrientation.rotation;
        if (face === 'unknown' || rotation === 'unknown') return;

        const mapping = (rotationLookup as any)[face][rotation];
        let axisArray: number[];
        let angle = Math.PI / 2;

        // Map direction to the corresponding rotationLookup key + sign
        switch (direction) {
          case 'up': axisArray = mapping.o; angle = Math.PI / 2; break;
          case 'down': axisArray = mapping.period; angle = Math.PI / 2; break;
          case 'right': axisArray = mapping.k; angle = Math.PI / 2; break;
          case 'left': axisArray = mapping.semicolon; angle = Math.PI / 2; break;
          case 'rollLeft': axisArray = mapping.i; angle = Math.PI / 2; break;
          case 'rollRight': axisArray = mapping.p; angle = Math.PI / 2; break;
          default: return;
        }

        const axis = new THREE.Vector3().fromArray(axisArray);
        cameraActionsRef.current?.rotateBrush(axis, angle);
      },
      birthBrushCells: () => {
        if (selectedShape === "None" || !selectorPos) return;
        const offsets = generateShape(selectedShape, shapeSize, isHollow, customOffsets);
        const cells = offsets
          .map(([dx, dy, dz]) => {
            const v = new THREE.Vector3(dx, dy, dz);
            v.applyQuaternion(brushQuaternion.current);
            return [
              Math.round(v.x) + selectorPos[0],
              Math.round(v.y) + selectorPos[1],
              Math.round(v.z) + selectorPos[2],
            ] as [number, number, number];
          })
          .filter(([x, y, z]) => x >= 0 && x < gridSize && y >= 0 && y < gridSize && z >= 0 && z < gridSize);

        setCommunity([]); // Clear community view when manually editing
        actions.setCells(cells);
      },
      clearBrushCells: () => {
        if (selectedShape === "None" || !selectorPos) return;
        const offsets = generateShape(selectedShape, shapeSize, isHollow, customOffsets);
        const cells = offsets
          .map(([dx, dy, dz]) => {
            const v = new THREE.Vector3(dx, dy, dz);
            v.applyQuaternion(brushQuaternion.current);
            return [
              Math.round(v.x) + selectorPos[0],
              Math.round(v.y) + selectorPos[1],
              Math.round(v.z) + selectorPos[2],
            ] as [number, number, number];
          })
          .filter(([x, y, z]) => x >= 0 && x < gridSize && y >= 0 && y < gridSize && z >= 0 && z < gridSize);

        setCommunity([]);
        actions.deleteCells(cells);
      },
    };
    return () => {
      cameraActionsRef.current = null;
    };
  }, [
    cameraActionsRef,
    gridRef,
    cubeRef,
    setSnapMessage,
    cameraRef,
    controlsRef,
    gridSize,
    selectorPos,
    selectedShape,
    shapeSize,
    isHollow,
    actions,
    setCommunity,
    customOffsets,
  ]);
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

        if (cameraRef.current && controlsRef.current) {
          const orientation = getOrientation(cameraRef.current, controlsRef.current.target, cubeRef.current);
          setCameraOrientation(orientation);

          if (orientation.face !== "unknown") {
            const faceName = orientation.face.charAt(0).toUpperCase() + orientation.face.slice(1);
            const rotationStr = orientation.rotation !== "unknown" ? `${orientation.rotation}°` : "";
            setSnapMessage(`Rotating to: ${faceName}${rotationStr ? ` (${rotationStr})` : ""}`);
          }
        }

        snapRotation.current.lastAngle = currentAngle;
      }
    }

    if (!rotationMode) {
      const now = state.clock.getElapsedTime();
      if (now - lastSelectorMoveTime.current > 0.1) {
        let direction: string | null = null;
        if (movement.current.backward) direction = "w";
        else if (movement.current.forward) direction = "x";
        else if (movement.current.left) direction = "a";
        else if (movement.current.right) direction = "d";
        else if (movement.current.up) direction = "q";
        else if (movement.current.down) direction = "z";

        if (selectorPos && direction && cameraOrientation.face !== 'unknown' && cameraOrientation.rotation !== 'unknown') {
          const face = cameraOrientation.face as CameraFace;
          const rotation = cameraOrientation.rotation as CameraRotation;
          const deltaMove = (KEY_MAP[face][rotation] as any)[direction];
          if (deltaMove) {
            const nextX = selectorPos[0] + deltaMove[0];
            const nextY = selectorPos[1] + deltaMove[1];
            const nextZ = selectorPos[2] + deltaMove[2];
            // const nextPos: [number, number, number] = [nextX, nextY, nextZ]; // This line was removed in the diff, but it's not explicitly in the instruction. Keeping it as it was.

            let allowMove = false;
            if (selectedShape === "None") {
              if (nextX >= 0 && nextX < gridSize && nextY >= 0 && nextY < gridSize && nextZ >= 0 && nextZ < gridSize) {
                allowMove = true;
              }
            } else {
              const offsets = generateShape(selectedShape, shapeSize, isHollow, customOffsets);
              const rotatedOffsets = offsets.map(off => {
                const v = new THREE.Vector3(...off);
                if (brushQuaternion.current) v.applyQuaternion(brushQuaternion.current);
                return [Math.round(v.x), Math.round(v.y), Math.round(v.z)] as [number, number, number];
              });

              const isAnyInside = rotatedOffsets.some(([dx, dy, dz]) => {
                const tx = nextX + dx;
                const ty = nextY + dy;
                const tz = nextZ + dz;
                return tx >= 0 && tx < gridSize && ty >= 0 && ty < gridSize && tz >= 0 && tz < gridSize;
              });
              if (isAnyInside) allowMove = true;
            }

            if (allowMove) {
              eventBus.emit("moveSelector", { delta: deltaMove });
              lastSelectorMoveTime.current = now;
            }
          }
        }
      }
    } else {
      const panMaxSpeed = panSpeed;
      const dollyMaxSpeed = panSpeed * 1.5;
      const rotationSpeedAdj = (rotationSpeed - 1) / 99;
      const actualRotationSpeed = 10 + rotationSpeedAdj * (180 - 10);
      const actualRollSpeed = rollSpeed;
      const rotateMaxSpeed = (actualRotationSpeed * Math.PI) / 180;
      const rollMaxSpeed = (actualRollSpeed * Math.PI) / 180;

      // Linear acceleration/deceleration based on Ease In / Ease Out
      const accelFactor = easeIn > 0.01 ? 1 / easeIn : 100; // if easeIn is 0, instant speed
      const decelFactor = easeOut > 0.01 ? 1 / easeOut : 100; // if easeOut is 0, instant stop

      const acceleration = panMaxSpeed * accelFactor;
      const rotationAcceleration = rotateMaxSpeed * accelFactor;
      const rollAcceleration = rollMaxSpeed * accelFactor;
      const dollyAcceleration = dollyMaxSpeed * accelFactor;

      const deceleration = panMaxSpeed * decelFactor;
      const rotationDeceleration = rotateMaxSpeed * decelFactor;
      const rollDeceleration = rollMaxSpeed * decelFactor;
      const dollyDeceleration = dollyMaxSpeed * decelFactor;

      // Pitch (X)
      if (movement.current.rotateO) {
        const dir = invertPitch ? -1 : 1;
        velocity.current.rotateX = THREE.MathUtils.clamp(velocity.current.rotateX + dir * rotationAcceleration * delta, -rotateMaxSpeed, rotateMaxSpeed);
      } else if (movement.current.rotatePeriod) {
        const dir = invertPitch ? -1 : 1;
        velocity.current.rotateX = THREE.MathUtils.clamp(velocity.current.rotateX - dir * rotationAcceleration * delta, -rotateMaxSpeed, rotateMaxSpeed);
      } else {
        // Decelerate
        if (velocity.current.rotateX > 0) velocity.current.rotateX = Math.max(0, velocity.current.rotateX - rotationDeceleration * delta);
        else if (velocity.current.rotateX < 0) velocity.current.rotateX = Math.min(0, velocity.current.rotateX + rotationDeceleration * delta);
      }

      // Yaw (Y)
      if (movement.current.rotateK) {
        const dir = invertYaw ? -1 : 1;
        velocity.current.rotateY = THREE.MathUtils.clamp(velocity.current.rotateY + dir * rotationAcceleration * delta, -rotateMaxSpeed, rotateMaxSpeed);
      } else if (movement.current.rotateSemicolon) {
        const dir = invertYaw ? -1 : 1;
        velocity.current.rotateY = THREE.MathUtils.clamp(velocity.current.rotateY - dir * rotationAcceleration * delta, -rotateMaxSpeed, rotateMaxSpeed);
      } else {
        if (velocity.current.rotateY > 0) velocity.current.rotateY = Math.max(0, velocity.current.rotateY - rotationDeceleration * delta);
        else if (velocity.current.rotateY < 0) velocity.current.rotateY = Math.min(0, velocity.current.rotateY + rotationDeceleration * delta);
      }

      // Roll
      if (movement.current.rotateI) {
        const dir = invertRoll ? -1 : 1;
        velocity.current.roll = THREE.MathUtils.clamp(velocity.current.roll + dir * rollAcceleration * delta, -rollMaxSpeed, rollMaxSpeed);
      } else if (movement.current.rotateP) {
        const dir = invertRoll ? -1 : 1;
        velocity.current.roll = THREE.MathUtils.clamp(velocity.current.roll - dir * rollAcceleration * delta, -rollMaxSpeed, rollMaxSpeed);
      } else {
        if (velocity.current.roll > 0) velocity.current.roll = Math.max(0, velocity.current.roll - rollDeceleration * delta);
        else if (velocity.current.roll < 0) velocity.current.roll = Math.min(0, velocity.current.roll + rollDeceleration * delta);
      }

      // Pan X
      if (movement.current.right) {
        velocity.current.panX = Math.min(velocity.current.panX + acceleration * delta, panMaxSpeed);
      } else if (movement.current.left) {
        velocity.current.panX = Math.max(velocity.current.panX - acceleration * delta, -panMaxSpeed);
      } else {
        if (velocity.current.panX > 0) velocity.current.panX = Math.max(0, velocity.current.panX - deceleration * delta);
        else if (velocity.current.panX < 0) velocity.current.panX = Math.min(0, velocity.current.panX + deceleration * delta);
      }

      // Pan Y
      if (movement.current.up) {
        velocity.current.panY = Math.min(velocity.current.panY + acceleration * delta, panMaxSpeed);
      } else if (movement.current.down) {
        velocity.current.panY = Math.max(velocity.current.panY - acceleration * delta, -panMaxSpeed);
      } else {
        if (velocity.current.panY > 0) velocity.current.panY = Math.max(0, velocity.current.panY - deceleration * delta);
        else if (velocity.current.panY < 0) velocity.current.panY = Math.min(0, velocity.current.panY + deceleration * delta);
      }

      // Dolly
      if (movement.current.forward) {
        velocity.current.dolly = Math.min(velocity.current.dolly + dollyAcceleration * delta, dollyMaxSpeed);
      } else if (movement.current.backward) {
        velocity.current.dolly = Math.max(velocity.current.dolly - dollyAcceleration * delta, -dollyMaxSpeed);
      } else {
        if (velocity.current.dolly > 0) velocity.current.dolly = Math.max(0, velocity.current.dolly - dollyDeceleration * delta);
        else if (velocity.current.dolly < 0) velocity.current.dolly = Math.min(0, velocity.current.dolly + dollyDeceleration * delta);
      }

      const isMoving =
        movement.current.rotateO ||
        movement.current.rotatePeriod ||
        movement.current.rotateK ||
        movement.current.rotateSemicolon ||
        movement.current.rotateI ||
        movement.current.rotateP ||
        velocity.current.rotateX !== 0 ||
        velocity.current.rotateY !== 0 ||
        velocity.current.roll !== 0;

      // Apply Roll
      if (Math.abs(velocity.current.roll) > 0.01) {
        if (cameraRef.current && controlsRef.current && cubeRef.current) {
          const rollAngleRad = velocity.current.roll * delta;
          const camera = cameraRef.current;
          const forwardVec = new THREE.Vector3();
          camera.getWorldDirection(forwardVec);
          const quaternion = new THREE.Quaternion().setFromAxisAngle(forwardVec, rollAngleRad);
          camera.up.applyQuaternion(quaternion);

          controlsRef.current.update();
          const orientation = getOrientation(camera, controlsRef.current.target, cubeRef.current);
          if (!isMoving && (orientation.face !== cameraOrientation.face || orientation.rotation !== cameraOrientation.rotation)) {
            setCameraOrientation(orientation);
          }
        }
      } else {
        velocity.current.roll = 0;
      }

      // Apply Cube Rotation (New logic: rotate the cube around camera's right/up axes)
      if (Math.abs(velocity.current.rotateX) > 0.001 || Math.abs(velocity.current.rotateY) > 0.001) {
        if (cameraRef.current && cubeRef.current && controlsRef.current) {
          const camera = cameraRef.current;
          const cube = cubeRef.current;

          // Pitch (Rotate around camera's Right vector)
          if (Math.abs(velocity.current.rotateX) > 0.001) {
            const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
            cube.rotateOnWorldAxis(camRight, velocity.current.rotateX * delta);
          }

          // Yaw (Rotate around camera's Up vector)
          if (Math.abs(velocity.current.rotateY) > 0.001) {
            const camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
            cube.rotateOnWorldAxis(camUp, -velocity.current.rotateY * delta);
          }

          const orientation = getOrientation(camera, controlsRef.current.target, cube);
          setCameraOrientation(orientation);
          controlsRef.current.update();
        }
      }

      // Apply Translation and Look-around (Look-around for rotateX/rotateY removed)
      if (cameraRef.current && controlsRef.current) {
        const camera = cameraRef.current, controls = controlsRef.current;
        const rightVec = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const upVec = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
        const forwardVec = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 2).negate();
        let needsUpdate = false;
        const panOffset = new THREE.Vector3();
        if (Math.abs(velocity.current.panX) > 0.1) {
          panOffset.add(rightVec.clone().multiplyScalar(velocity.current.panX * delta));
        }
        if (Math.abs(velocity.current.panY) > 0.1) {
          panOffset.add(upVec.clone().multiplyScalar(velocity.current.panY * delta));
        }
        if (Math.abs(velocity.current.dolly) > 0.1) {
          panOffset.add(forwardVec.clone().multiplyScalar(velocity.current.dolly * delta));
        }

        if (panOffset.lengthSq() > 1e-6) {
          camera.position.add(panOffset);
          controls.target.add(panOffset);
          needsUpdate = true;
        }

        if (needsUpdate) {
          const orientation = getOrientation(camera, controls.target, cubeRef.current!);
          if (!isMoving && (orientation.face !== cameraOrientation.face || orientation.rotation !== cameraOrientation.rotation)) {
            setCameraOrientation(orientation);
          }
          controls.update();
        }
      }

      if (Math.abs(velocity.current.rotateX) < 0.01) velocity.current.rotateX = 0;
      if (Math.abs(velocity.current.rotateY) < 0.01) velocity.current.rotateY = 0;
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

  // Track last reported orientation via ref to detect threshold crossings without stale closures.
  const lastOrientationRef = useRef({ face: '' as string, rotation: '' as string | number });

  // Continuously check orientation every frame — covers mouse drag, damping, keyboard snap,
  // flight-sim rotation, and cube rotation. Only fires setCameraOrientation on actual changes.
  useFrame(() => {
    if (cameraRef.current && controlsRef.current && cubeRef.current) {
      const orientation = getOrientation(cameraRef.current, controlsRef.current.target, cubeRef.current);
      const prev = lastOrientationRef.current;
      if (orientation.face !== prev.face || orientation.rotation !== prev.rotation) {
        lastOrientationRef.current = { face: orientation.face, rotation: orientation.rotation };
        setCameraOrientation(orientation);
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
          selectorPos={rotationMode ? null : selectorPos}
          rotationMode={rotationMode}
          onClick={(e) => {
            if (running || rotationMode) return;
            e.stopPropagation();
            const { instanceId } = e;
            if (instanceId !== undefined) {
              const cells = gridRef.current.getLivingCells();
              const cell = cells[instanceId];
              if (cell) {
                const [x, y, z] = cell;
                setSelectorPos([x, y, z]);
                if (!rotationMode) {
                  const community = gridRef.current.getCommunity(x, y, z);
                  setCommunity(community);
                  console.log("Clicked cell at", x, y, z, "Community:", community.length);
                }
              }
            }
          }}
        />
        <BoundingBox size={gridRef.current.size} />
        {!rotationMode && (
          <>
            <FaceLabels size={gridRef.current.size} />
            <KeyboardSelector
              controlsRef={controlsRef}
              cubeRef={cubeRef}
              brushQuaternion={brushQuaternion}
              cameraActionsRef={cameraActionsRef}
            />
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
          if (cameraRef.current && controlsRef.current && cubeRef.current) {
            const orientation = getOrientation(cameraRef.current, controlsRef.current.target, cubeRef.current);
            setCameraOrientation(orientation);
          }
        }}
      />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 40]} />
    </>
  );
}
