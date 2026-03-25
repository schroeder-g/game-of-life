import { Html, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function BrushProjectionGuides({
  previewCells,
  gridSize,
  cellMargin,
  paintMode,
  gridRef,
  selectedShape,
  shapeSize,
}: {
  previewCells: { originalOffset: number[]; cell: [number, number, number] }[];
  gridSize: number;
  cellMargin: number;
  paintMode: number;
  gridRef: React.MutableRefObject<any>;
  selectedShape: string;
  shapeSize: number;
}) {
  const offset = (gridSize - 1) / 2;
  const cellSize = 1 - cellMargin;

  const cellKeys = useMemo(() => new Set(previewCells.map(pc => pc.cell.join(','))), [previewCells]);

  const yzPairs = useMemo(() => {
    const pairs = new Set<string>();
    previewCells.forEach(({ cell }) => {
      const [x, y, z] = cell;
      // Project if a cell is an endpoint along the X axis AND it's a surface cell
      // (Being an endpoint along any axis already implies being a surface cell)
      if (!cellKeys.has(`${x - 1},${y},${z}`) || !cellKeys.has(`${x + 1},${y},${z}`)) {
        pairs.add(`${y},${z}`);
      }
    });
    return Array.from(pairs).map(p => p.split(',').map(Number));
  }, [previewCells, cellKeys]);

  const xzPairs = useMemo(() => {
    const pairs = new Set<string>();
    previewCells.forEach(({ cell }) => {
      const [x, y, z] = cell;
      if (!cellKeys.has(`${x},${y - 1},${z}`) || !cellKeys.has(`${x},${y + 1},${z}`)) {
        pairs.add(`${x},${z}`);
      }
    });
    return Array.from(pairs).map(p => p.split(',').map(Number));
  }, [previewCells, cellKeys]);

  const xyPairs = useMemo(() => {
    const pairs = new Set<string>();
    previewCells.forEach(({ cell }) => {
      const [x, y, z] = cell;
      if (!cellKeys.has(`${x},${y},${z - 1}`) || !cellKeys.has(`${x},${y},${z + 1}`)) {
        pairs.add(`${x},${y}`);
      }
    });
    return Array.from(pairs).map(p => p.split(',').map(Number));
  }, [previewCells, cellKeys]);

  const allGuidePositions = useMemo(() => {
    const positions = new Set<string>();

    // X-axis channels: for each (y, z) projection, fill all x values
    yzPairs.forEach(([y, z]) => {
      for (let x = 0; x < gridSize; x++) {
        positions.add(`${x},${y},${z}`);
      }
    });

    // Y-axis channels: for each (x, z) projection, fill all y values
    xzPairs.forEach(([x, z]) => {
      for (let y = 0; y < gridSize; y++) {
        positions.add(`${x},${y},${z}`);
      }
    });

    // Z-axis channels: for each (x, y) projection, fill all z values
    xyPairs.forEach(([x, y]) => {
      for (let z = 0; z < gridSize; z++) {
        positions.add(`${x},${y},${z}`);
      }
    });

    return Array.from(positions).map(s => s.split(',').map(Number));
  }, [yzPairs, xzPairs, xyPairs, gridSize]);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const redOutlineRef = useRef<THREE.InstancedMesh>(null);
  const redWireframeRef = useRef<THREE.InstancedMesh>(null);

  const showAxisChannels = selectedShape === "Cube" && shapeSize === 1;

  useEffect(() => {
    if (!meshRef.current || !showAxisChannels) return;
    const temp = new THREE.Object3D();
    allGuidePositions.forEach((pos, i) => {
      const [x, y, z] = pos;
      temp.position.set(x - offset, y - offset, (gridSize - 1 - z) - offset);
      temp.scale.set(cellSize, cellSize, cellSize);
      temp.updateMatrix();
      meshRef.current!.setMatrixAt(i, temp.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.count = allGuidePositions.length;
  }, [allGuidePositions, cellSize, offset, gridSize, showAxisChannels]);

  // Handle outlines for live cells in Deactivate mode
  useEffect(() => {
    if (!redOutlineRef.current || !redWireframeRef.current) return;
    const temp = new THREE.Object3D();
    const tempWire = new THREE.Object3D();
    let count = 0;

    if (paintMode === -1) {
      allGuidePositions.forEach((pos) => {
        const [x, y, z] = pos;
        if (gridRef.current.get(x, y, z)) {
          // Outer thick glow
          temp.position.set(x - offset, y - offset, (gridSize - 1 - z) - offset);
          temp.scale.set(cellSize * 1.35, cellSize * 1.35, cellSize * 1.35); // increased scale
          temp.updateMatrix();
          redOutlineRef.current!.setMatrixAt(count, temp.matrix);

          // Inner tight wireframe
          tempWire.position.set(x - offset, y - offset, (gridSize - 1 - z) - offset);
          tempWire.scale.set(cellSize * 1.15, cellSize * 1.15, cellSize * 1.15); // increased scale
          tempWire.updateMatrix();
          redWireframeRef.current!.setMatrixAt(count, tempWire.matrix);

          count++;
        }
      });
    }

    redOutlineRef.current.instanceMatrix.needsUpdate = true;
    redOutlineRef.current.count = count;
    redWireframeRef.current.instanceMatrix.needsUpdate = true;
    redWireframeRef.current.count = count;
  }, [allGuidePositions, paintMode, cellSize, offset, gridSize, gridRef]);

  return (
    <>
      {showAxisChannels && (
        <instancedMesh ref={meshRef} args={[undefined, undefined, 50000]} raycast={() => null}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.07}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </instancedMesh>
      )}

      {paintMode === -1 && (
        <>
          <instancedMesh ref={redOutlineRef} args={[undefined, undefined, 50000]} raycast={() => null}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
              color="#ff0000"
              transparent
              opacity={0.7}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </instancedMesh>
          <instancedMesh ref={redWireframeRef} args={[undefined, undefined, 50000]} raycast={() => null}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
              color="#ff0000"
              wireframe
              transparent
              opacity={1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </instancedMesh>
        </>
      )}
    </>
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
  brushQuaternion: React.MutableRefObject<THREE.Quaternion>;
  cameraActionsRef: React.RefObject<any>;
}) {
  const {
    state: { gridSize, rotationMode, cellMargin },
    meta: { gridRef },
  } = useSimulation();
  const {
    state: brushState,
  } = useBrush();
  const { selectorPos, selectedShape, paintMode, shapeSize, isHollow, customOffsets, brushRotationVersion, showProjectionGuides } = brushState;

  const previewCells = useMemo(() => {
    if (!selectorPos) return [];

    const offsets = generateShape(selectedShape, shapeSize, isHollow, customOffsets);

    if (offsets.length === 0) return [];

    const cells = offsets
      .map((originalOffset) => {
        const [dx, dy, dz] = originalOffset;
        const v = new THREE.Vector3(dx, dy, dz);

        v.applyQuaternion(brushQuaternion.current);

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

    // De-duplicate cells that land on the same spot after rotation+rounding.
    return Array.from(new Map(cells.map(p => [p.cell.join(','), p])).values());

  }, [
    selectorPos,
    selectedShape,
    shapeSize,
    isHollow,
    gridSize,
    brushRotationVersion,
    customOffsets,
  ]);

  if (rotationMode || !selectorPos) return null;

  const offset = (gridSize - 1) / 2;
  const cellKeys = useMemo(() => new Set(previewCells.map(p => p.cell.join(','))), [previewCells]);

  return (
    <group>
      {/* Guides are now rendered based on a toggle, and from exterior faces */}
      {showProjectionGuides && <BrushProjectionGuides previewCells={previewCells} gridSize={gridSize} cellMargin={cellMargin} paintMode={paintMode} gridRef={gridRef} selectedShape={selectedShape} shapeSize={shapeSize} />}

      {/* Unified renderer for all brush cells */}
      {previewCells.map(({ cell }, i) => {
        const [x, y, z] = cell;
        const isAlive = gridRef.current.get(x, y, z);
        const isExternal = !cellKeys.has(`${x - 1},${y},${z}`) || !cellKeys.has(`${x + 1},${y},${z}`) ||
          !cellKeys.has(`${x},${y - 1},${z}`) || !cellKeys.has(`${x},${y + 1},${z}`) ||
          !cellKeys.has(`${x},${y},${z - 1}`) || !cellKeys.has(`${x},${y},${z + 1}`);

        let cellColor = isAlive ? "#ffffff" : paintMode == -1 ? "#ff9999" : "#ffff55";
        let opacity = 1;
        let outlineColor = "#222222";

        const position: [number, number, number] = [
          cell[0] - offset,
          cell[1] - offset,
          gridSize - 1 - cell[2] - offset,
        ];

        return (
          <React.Fragment key={i}>
            {/* Primary Cell Mesh */}
            <mesh position={position}>
              <boxGeometry args={[0.9, 0.9, 0.9]} />
              <meshBasicMaterial
                color={cellColor}
                transparent={isAlive}
                opacity={opacity}
                depthWrite={!isAlive}
              />
            </mesh>
            {/* Outlines */}
            <lineSegments position={position}>
              <edgesGeometry args={[new THREE.BoxGeometry(0.92, 0.92, 0.92)]} />
              <lineBasicMaterial color={outlineColor} />
            </lineSegments>
          </React.Fragment>
        );
      })}
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
    autoSquare,
    easeOut,
    cameraOrientation,
  } = state;
  const {
    state: brushState,
    actions: { setSelectorPos, setCustomBrush },
  } = useBrush();
  const { selectorPos, brushQuaternion } = brushState;
  const brushStateRef = useRef(brushState);
  useEffect(() => {
    brushStateRef.current = brushState;
  }, [brushState]);

  const lastTick = useRef(0);
  const controlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const cubeRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const snapAnimation = useRef({ active: false, key: null as string | null, startOrientation: null as CameraOrientation | null });
  const squareUpAnimation = useRef({ active: false, targetLook: new THREE.Vector3(), targetUp: new THREE.Vector3(), initialLookErrorAngle: 0, initialUpErrorAngle: 0 });
  const lastSelectorMoveTime = useRef(0);
  const wasRotating = useRef(false);
  const coastingAnimation = useRef({
    active: false,
    startOrientation: null as CameraOrientation | null,
  });
  const wasPressingRotationKeyRef = useRef(false);
  const dragStartRef = useRef({
    active: false,
    azimuth: 0,
    polar: 0,
    distance: 0,
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
    if (!autoSquare) {
      squareUpAnimation.current.active = false;
    }
  }, [autoSquare]);

  useEffect(() => {
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
        if (!controlsRef.current || !cubeRef.current || !cameraRef.current) return;
        if (squareUpAnimation.current.active) return; // Prevent re-triggering

        const cam = cameraRef.current;

        // 1. Determine Target Look Vector
        const camForward = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 2).negate();
        const worldAxes = [
          { axis: new THREE.Vector3(1, 0, 0), name: "right" }, { axis: new THREE.Vector3(-1, 0, 0), name: "left" },
          { axis: new THREE.Vector3(0, 1, 0), name: "top" }, { axis: new THREE.Vector3(0, -1, 0), name: "bottom" },
          { axis: new THREE.Vector3(0, 0, 1), name: "front" }, { axis: new THREE.Vector3(0, 0, -1), name: "back" },
        ];
        worldAxes.sort((a, b) => b.axis.dot(camForward) - a.axis.dot(camForward));
        const targetLook = worldAxes[0].axis.clone();

        // 2. Determine Target Up Vector
        const camUp = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1);
        const validUpAxes = worldAxes.filter(a => Math.abs(a.axis.dot(targetLook)) < 0.1);
        validUpAxes.sort((a, b) => b.axis.dot(camUp) - a.axis.dot(camUp));
        const targetUp = validUpAxes[0].axis.clone();

        // 3. Initiate Animation if not already aligned
        const lookDot = camForward.dot(targetLook);
        const upDot = camUp.dot(targetUp);
        if (lookDot < 0.9999 || upDot < 0.9999) {
          squareUpAnimation.current.targetLook.copy(targetLook);
          squareUpAnimation.current.targetUp.copy(targetUp);
          squareUpAnimation.current.initialLookErrorAngle = camForward.angleTo(targetLook);
          squareUpAnimation.current.initialUpErrorAngle = camUp.angleTo(targetUp);
          squareUpAnimation.current.active = true;
        }
      },
      startSnapAnimation: (key: string) => {
        if (snapAnimation.current.active) return;
        snapAnimation.current.key = key;
        snapAnimation.current.active = true;
        snapAnimation.current.startOrientation = null;
      },
      rotateBrush: (axis: THREE.Vector3, angle: number) => {
        const { selectorPos, selectedShape, shapeSize, isHollow, customOffsets, brushQuaternion } = brushStateRef.current;
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        const nextQ = brushQuaternion.current.clone().premultiply(q);

        if (selectorPos) {
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
      birthBrushCells: () => {
        const { selectorPos, selectedShape, shapeSize, isHollow, customOffsets, brushQuaternion } = brushStateRef.current;
        if (!selectorPos) return;

        const offsets = generateShape(selectedShape, shapeSize, isHollow, customOffsets);
        const cellsToActivate = offsets
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

        if (cellsToActivate.length > 0) {
          actions.setCells(cellsToActivate);
          setCommunity([]); // Clear community view when manually editing
        }
      },
      clearBrushCells: () => {
        const { selectorPos, selectedShape, shapeSize, isHollow, customOffsets, brushQuaternion } = brushStateRef.current;
        if (!selectorPos) return;

        const offsets = generateShape(selectedShape, shapeSize, isHollow, customOffsets);
        const cellsToClear = offsets
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

        if (cellsToClear.length > 0) {
          setCommunity([]);
          actions.deleteCells(cellsToClear);
        }
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
    actions,
    setCommunity,
    setSelectorPos,
    setCustomBrush,
  ]);
  useFrame((state, delta) => {
    // Correctly use variables already in scope from the top-level useSimulation() hook.
    // DO NOT call useSimulation.getState() here.

    const hasMoved =
      Object.values(movement.current).some(Boolean) ||
      Object.values(velocity.current).some(v => Math.abs(v) > 0.001);

    if (hasMoved) {
      lastSelectorMoveTime.current = state.clock.getElapsedTime();
    }
    
    // --- Animation Logic ---
    
    const easeInVal = 1 - Math.exp(-2 * delta * (easeIn || 0.2));
    let currentEaseOut = 1 - Math.exp(-2 * delta * (easeOut || 0.5));
    
    if (snapAnimation.current.active && cubeRef.current && cameraRef.current && controlsRef.current) {
      if (!snapAnimation.current.startOrientation) {
        // First frame: activate the movement
        snapAnimation.current.startOrientation = getOrientation(cameraRef.current, controlsRef.current.target, cubeRef.current);
        const key = snapAnimation.current.key;
        switch (key) {
          case "o": movement.current.rotateO = true; break;
          case "period": movement.current.rotatePeriod = true; break;
          case "k": movement.current.rotateK = true; break;
          case "semicolon": movement.current.rotateSemicolon = true; break;
          case "i": movement.current.rotateI = true; break;
          case "p": movement.current.rotateP = true; break;
        }
      } else {
        // Subsequent frames: check for orientation change
        const currentOrientation = getOrientation(cameraRef.current, controlsRef.current.target, cubeRef.current);
        const start = snapAnimation.current.startOrientation;

        if (currentOrientation.face !== start.face || currentOrientation.rotation !== start.rotation) {
          // Orientation changed, stop all movement and velocity.
          Object.keys(movement.current).forEach(k => { if (k.startsWith('rotate')) (movement.current as any)[k] = false; });
          Object.keys(velocity.current).forEach(k => { if (k.startsWith('rotate')) (velocity.current as any)[k] = 0; });

          snapAnimation.current.active = false;
          snapAnimation.current.key = null;
          snapAnimation.current.startOrientation = null;

          // Trigger final alignment
          cameraActionsRef.current?.squareUp();
        }
      }
    }
    
    if (squareUpAnimation.current.active && cameraRef.current) {
      const { targetLook, targetUp, initialLookErrorAngle, initialUpErrorAngle } = squareUpAnimation.current;
      const cam = cameraRef.current;
      
      // Reset movement flags from previous frame
      Object.keys(movement.current).forEach(k => { if (k.startsWith('rotate')) (movement.current as any)[k] = false; });

      const camForward = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 2).negate();
      const camUp = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1);
      
      const currentLookErrorAngle = camForward.angleTo(targetLook);
      const currentUpErrorAngle = camUp.angleTo(targetUp);

      // Check for completion
      if (currentLookErrorAngle < 0.005 && currentUpErrorAngle < 0.005) {
        squareUpAnimation.current.active = false;
        Object.keys(velocity.current).forEach(k => { if(k.startsWith('rotate')) (velocity.current as any)[k] = 0; });
      } else {
        // Dynamic EaseOut calculation
        const lookFactor = Math.min(1, currentLookErrorAngle / (initialLookErrorAngle || 1));
        const upFactor = Math.min(1, currentUpErrorAngle / (initialUpErrorAngle || 1));
        const maxFactor = Math.max(lookFactor, upFactor);
        const easeOutVal = easeOut || 0.5;
        currentEaseOut = 1 - Math.exp(-2 * delta * easeOutVal * (1 / (maxFactor + 1e-6) - 1)); // High decel near target

        // Determine movement direction simultaneously for all axes
        const camRight = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0);
        
        // Yaw/Pitch correction
        const lookCross = new THREE.Vector3().crossVectors(camForward, targetLook);
        const pitchDot = lookCross.dot(camRight);
        if (pitchDot > 0.001) movement.current.rotateO = true;
        else if (pitchDot < -0.001) movement.current.rotatePeriod = true;

        const yawDot = lookCross.dot(camUp);
        if (yawDot > 0.001) movement.current.rotateSemicolon = true;
        else if (yawDot < -0.001) movement.current.rotateK = true;
        
        // Roll correction
        const upCross = new THREE.Vector3().crossVectors(camUp, targetUp);
        const rollDot = upCross.dot(camForward);
        if (rollDot > 0.001) movement.current.rotateP = true;
        else if (rollDot < -0.001) movement.current.rotateI = true;
      }
    }
     
    // --- Physics Update ---
    
    if (rotationMode) {
      const rotSpeed = rotationSpeed * 0.0004; // scaled for lerp
      const rSpeed = rollSpeed * 0.0004;

      // Pitch
      const pitchSpeed = rotSpeed * (invertPitch ? -1 : 1);
      if (movement.current.rotateO) velocity.current.rotateO = THREE.MathUtils.lerp(velocity.current.rotateO, pitchSpeed, easeInVal);
      else velocity.current.rotateO *= currentEaseOut;
      if (movement.current.rotatePeriod) velocity.current.rotatePeriod = THREE.MathUtils.lerp(velocity.current.rotatePeriod, -pitchSpeed, easeInVal);
      else velocity.current.rotatePeriod *= currentEaseOut;

      // Yaw
      const yawSpeed = rotSpeed * (invertYaw ? -1 : 1);
      if (movement.current.rotateK) velocity.current.rotateK = THREE.MathUtils.lerp(velocity.current.rotateK, -yawSpeed, easeInVal);
      else velocity.current.rotateK *= currentEaseOut;
      if (movement.current.rotateSemicolon) velocity.current.rotateSemicolon = THREE.MathUtils.lerp(velocity.current.rotateSemicolon, yawSpeed, easeInVal);
      else velocity.current.rotateSemicolon *= currentEaseOut;

      // Roll
      const rollSpeedVal = rSpeed * (invertRoll ? -1 : 1);
      if (movement.current.rotateI) velocity.current.rotateI = THREE.MathUtils.lerp(velocity.current.rotateI, -rollSpeedVal, easeInVal);
      else velocity.current.rotateI *= currentEaseOut;
      if (movement.current.rotateP) velocity.current.rotateP = THREE.MathUtils.lerp(velocity.current.rotateP, rollSpeedVal, easeInVal);
      else velocity.current.rotateP *= currentEaseOut;
      
      const totalPitch = velocity.current.rotateO + velocity.current.rotatePeriod;
      const totalYaw = velocity.current.rotateK + velocity.current.rotateSemicolon;
      const totalRoll = velocity.current.rotateI + velocity.current.rotateP;

      // Apply rotations
      if (cameraRef.current && cubeRef.current && controlsRef.current) {
        const camera = cameraRef.current;
        const cube = cubeRef.current;
        
        if (Math.abs(totalPitch) > 1e-6) {
          const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
          cube.rotateOnWorldAxis(camRight, totalPitch);
        }
        if (Math.abs(totalYaw) > 1e-6) {
          const camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
          cube.rotateOnWorldAxis(camUp, totalYaw);
        }
        if(Math.abs(totalRoll) > 1e-6) {
          const camForward = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 2);
          cube.rotateOnWorldAxis(camForward, totalRoll);
        }
      }
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
        enableDamping={!autoSquare}
        dampingFactor={0.05}
        enabled={true} // always allow dragging/zooming even in edit mode
        maxDistance={maxDistance}
        onStart={() => {
          if (controlsRef.current) {
            dragStartRef.current.active = true;
            dragStartRef.current.azimuth = controlsRef.current.getAzimuthalAngle();
            dragStartRef.current.polar = controlsRef.current.getPolarAngle();
            dragStartRef.current.distance = cameraRef.current!.position.distanceTo(controlsRef.current.target);
          }
        }}
        onEnd={() => {
          if (autoSquare && dragStartRef.current.active && controlsRef.current && cameraRef.current) {
            dragStartRef.current.active = false;
    
            const endDistance = cameraRef.current.position.distanceTo(controlsRef.current.target);
            if (Math.abs(endDistance - dragStartRef.current.distance) > 0.1) {
              // It was a zoom, not a drag. Square up.
              cameraActionsRef.current?.squareUp();
              return;
            }
    
            const endAzimuth = controlsRef.current.getAzimuthalAngle();
            const endPolar = controlsRef.current.getPolarAngle();
            const deltaAzimuth = endAzimuth - dragStartRef.current.azimuth;
            const deltaPolar = endPolar - dragStartRef.current.polar;
            const threshold = 0.05; // radians
    
            if (Math.abs(deltaAzimuth) < threshold && Math.abs(deltaPolar) < threshold) {
              cameraActionsRef.current?.squareUp(); // small drag, treat as click/adjust
            } else {
              // It was a swipe, start coasting
              const swipeSpeed = 1.5;
              velocity.current.rotateY = -deltaAzimuth * swipeSpeed;
              velocity.current.rotateX = -deltaPolar * swipeSpeed;
    
              coastingAnimation.current.active = true;
              coastingAnimation.current.startOrientation = { ...cameraOrientation };
            }
          }
        }}
      />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 40]} />
    </>
  );
}
