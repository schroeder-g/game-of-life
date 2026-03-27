import { Html, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { generateShape } from "../core/shapes";
import { Cells } from "./Cell";
import { type CameraOrientation } from "../core/cameraUtils";
import { type CameraFace, type CameraRotation, KEY_MAP, getExplicitRotationAxis } from "../core/faceOrientationKeyMapping";

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
  cubeRef,
  brushQuaternion,
  cameraActionsRef,
}: {
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
    meta: { gridRef, movement, velocity, eventBus, cameraTargetRef },
  } = useSimulation();
  const {
    tick,
    setCommunity,
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
  const { selectorPos, brushQuaternion } = brushState;
  const brushStateRef = useRef(brushState);
  useEffect(() => {
    brushStateRef.current = brushState;
  }, [brushState]);

  const lastTick = useRef(0);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const cubeRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const lastSelectorMoveTime = useRef(0);
  const wasRotating = useRef(false);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      wasRotating.current = false;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        wasRotating.current = true;
        
        // Apply impulses to rotation velocity
        const sens = rotationSpeed * 0.002;
        const invY = invertYaw ? -1 : 1;
        const invP = invertPitch ? -1 : 1;
        
        velocity.current.rotateYaw += dx * sens * invY;
        velocity.current.rotatePitch += dy * sens * invP;
      }
      
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [rotationSpeed, invertYaw, invertPitch, velocity]);

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
    cameraActionsRef.current = {
      fitDisplay: () => {
        if (!cameraRef.current) return;

        const target = cameraTargetRef.current;
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
          .subVectors(cameraRef.current.position, target)
          .normalize();
        cameraRef.current.position.copy(target).add(direction.multiplyScalar(distance));
        cameraRef.current.lookAt(target);
      },
      recenter: () => {
        if (!cameraRef.current) return;
        const offset = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), cameraTargetRef.current);
        cameraRef.current.position.add(offset);
        cameraTargetRef.current.set(0, 0, 0);
        cameraRef.current.lookAt(cameraTargetRef.current);
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
    cameraRef,
    cameraTargetRef,
    gridSize,
    actions,
    setCommunity,
    setSelectorPos,
    setCustomBrush,
  ]);
  useFrame((state, delta) => {
    // --- Physics Update (only runs when not slerping) ---
    const { lerp } = THREE.MathUtils;
    const easeInVal = 1 - Math.exp(-2 * delta * (easeIn ?? 0.2));
    const easeOutVal = 1 - Math.exp(-2 * delta * (easeOut ?? 0.5));
    
    // --- Calculate All Velocities ---
    
    // Pan/Dolly velocities for View Mode
    const pSpeed = panSpeed * 0.05;
    if (movement.current.right) velocity.current.panX = lerp(velocity.current.panX, pSpeed, easeInVal);
    else if (movement.current.left) velocity.current.panX = lerp(velocity.current.panX, -pSpeed, easeInVal);
    else velocity.current.panX *= easeOutVal;
    
    if (movement.current.forward) velocity.current.panY = lerp(velocity.current.panY, pSpeed, easeInVal);
    else if (movement.current.backward) velocity.current.panY = lerp(velocity.current.panY, -pSpeed, easeInVal);
    else velocity.current.panY *= easeOutVal;

    const dSpeed = panSpeed * 0.05;
    if (movement.current.up) velocity.current.dolly = lerp(velocity.current.dolly, dSpeed, easeInVal);
    else if (movement.current.down) velocity.current.dolly = lerp(velocity.current.dolly, -dSpeed, easeInVal);
    else velocity.current.dolly *= easeOutVal;

    // Rotation velocities
    const rSpeed = rotationSpeed * 0.05;
    const rlSpeed = rollSpeed * 0.05;

    if (movement.current.rotateO) velocity.current.rotatePitch = lerp(velocity.current.rotatePitch, rSpeed, easeInVal);
    else if (movement.current.rotatePeriod) velocity.current.rotatePitch = lerp(velocity.current.rotatePitch, -rSpeed, easeInVal);
    else if (!isDragging.current) velocity.current.rotatePitch *= easeOutVal;

    if (movement.current.rotateK) velocity.current.rotateYaw = lerp(velocity.current.rotateYaw, rSpeed, easeInVal);
    else if (movement.current.rotateSemicolon) velocity.current.rotateYaw = lerp(velocity.current.rotateYaw, -rSpeed, easeInVal);
    else if (!isDragging.current) velocity.current.rotateYaw *= easeOutVal;

    if (movement.current.rotateI) velocity.current.rotateRoll = lerp(velocity.current.rotateRoll, rlSpeed, easeInVal);
    else if (movement.current.rotateP) velocity.current.rotateRoll = lerp(velocity.current.rotateRoll, -rlSpeed, easeInVal);
    else if (!isDragging.current) velocity.current.rotateRoll *= easeOutVal;
    
    const totalPanX = velocity.current.panX;
    const totalPanY = velocity.current.panY;
    const totalDolly = velocity.current.dolly;
    const totalRotatePitch = velocity.current.rotatePitch;
    const totalRotateYaw = velocity.current.rotateYaw;
    const totalRotateRoll = velocity.current.rotateRoll;

    // --- Apply Velocities ---
    if (rotationMode) {
      // VIEW MODE: Manipulate the camera
      if (cameraRef.current) {
        const cam = cameraRef.current;
        const target = cameraTargetRef.current;

        // Apply Pans & Dolly
        const hasPan = Math.abs(totalPanX) > 1e-7 || Math.abs(totalPanY) > 1e-7;
        const hasDolly = Math.abs(totalDolly) > 1e-7;

        if (hasPan) {
          const dist = cam.position.distanceTo(target);
          const panXVec = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0).multiplyScalar(totalPanX * delta * dist);
          const panYVec = new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1).multiplyScalar(totalPanY * delta * dist);
          const pan = panXVec.add(panYVec);
          cam.position.add(pan);
          target.add(pan);
        }
        if (hasDolly) {
          const toTarget = new THREE.Vector3().subVectors(cam.position, target);
          const currentDist = toTarget.length();
          if (currentDist > 0.1) {
            const newDist = currentDist * (1 - totalDolly * delta);
            toTarget.setLength(newDist);
            cam.position.copy(target).add(toTarget);
          }
        }
        
        // Apply Rotations
        const hasRot = Math.abs(totalRotatePitch) > 1e-7 || Math.abs(totalRotateYaw) > 1e-7 || Math.abs(totalRotateRoll) > 1e-7;
        if (hasRot) {
          const pitchSpeed = totalRotatePitch * delta;
          const yawSpeed = totalRotateYaw * delta;
          const rollSpeedVal = totalRotateRoll * delta;

          const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 0), pitchSpeed);
          const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 1), yawSpeed);
          const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3().setFromMatrixColumn(cam.matrix, 2), rollSpeedVal);

          const q = qPitch.multiply(qYaw).multiply(qRoll);
          
          const toCam = new THREE.Vector3().subVectors(cam.position, target);
          toCam.applyQuaternion(q);
          cam.position.copy(target).add(toCam);
          cam.up.applyQuaternion(q);
        }

        const needsUpdate = hasPan || hasDolly || hasRot;
        if (needsUpdate) {
          cam.lookAt(target);
        }
      }
    } else {
      // EDIT MODE: Manipulate the cube
      if (cubeRef.current) {
        const cube = cubeRef.current;
        const hasRot = Math.abs(totalRotatePitch) > 1e-7 || Math.abs(totalRotateYaw) > 1e-7 || Math.abs(totalRotateRoll) > 1e-7;
        if (hasRot) {
          const { face, rotation } = cameraOrientation;
          if (face !== 'unknown' && rotation !== 'unknown') {
            const pitchAxis = getExplicitRotationAxis(face as CameraFace, rotation as CameraRotation, 'o');
            const yawAxis = getExplicitRotationAxis(face as CameraFace, rotation as CameraRotation, 'k');
            const rollAxis = getExplicitRotationAxis(face as CameraFace, rotation as CameraRotation, 'i');

            const qPitch = new THREE.Quaternion().setFromAxisAngle(pitchAxis, totalRotatePitch * delta);
            const qYaw = new THREE.Quaternion().setFromAxisAngle(yawAxis, totalRotateYaw * delta);
            const qRoll = new THREE.Quaternion().setFromAxisAngle(rollAxis, totalRotateRoll * delta);

            cube.quaternion.multiply(qPitch).multiply(qYaw).multiply(qRoll);
          }
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
    if (cameraRef.current && cameraTargetRef.current && cubeRef.current) {
      const orientation = getOrientation(cameraRef.current, cameraTargetRef.current, cubeRef.current);
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
            if (running || rotationMode || wasRotating.current) return;
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
              cubeRef={cubeRef}
              brushQuaternion={brushQuaternion}
              cameraActionsRef={cameraActionsRef}
            />
          </>
        )}
      </group>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 40]} />
    </>
  );
}
