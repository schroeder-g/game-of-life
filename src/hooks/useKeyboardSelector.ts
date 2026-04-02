import { MutableRefObject, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, type CameraFace, type CameraRotation } from "../core/faceOrientationKeyMapping";
import { generateShape } from "../core/shapes";

// This function is used by ShapePreview in Grid.tsx and useKeyboardSelector.
// It should probably be moved to a utility file if it's used in more places.
// For now, keeping it here and exporting it.
export function rotateOffsets(
  offsets: Array<[number, number, number]>,
  azimuth: number,
  polar: number,
): Array<[number, number, number]> {
  const isTopView = polar < Math.PI / 4;
  const isBottomView = polar > (3 * Math.PI) / 4;
  const isSideView = !isTopView && !isBottomView;

  const azimuthQuadrant = Math.round(azimuth / (Math.PI / 2)) % 4;
  const normalizedAzimuth = ((azimuthQuadrant % 4) + 4) % 4;

  return offsets.map(([x, y, z]) => {
    let rx = x,
      ry = y,
      rz = z;

    if (isSideView) {
      rx = x;
      ry = z;
      rz = -y;
    } else if (isBottomView) {
      ry = -y;
    }

    switch (normalizedAzimuth) {
      case 0:
        return [rx, ry, rz];
      case 1:
        return [rz, ry, -rx];
      case 2:
        return [-rx, ry, -rz];
      case 3:
        return [-rz, ry, rx];
      default:
        return [rx, ry, rz];
    }
  });
}

export function useKeyboardSelector(
  cubeRef: MutableRefObject<THREE.Group | null>,
) {
  const {
    state: { gridSize, cameraOrientation },
    actions: { toggleCell, setCell, setCells, deleteCells, setCommunity },
    meta: { gridRef, eventBus, movement, cameraTargetRef },
  } = useSimulation();
  const { camera } = useThree();

  const {
    state: { selectedShape, shapeSize, isHollow, selectorPos },
    actions: { setSelectorPos, clearShape, changeSize },
  } = useBrush();

  const [spaceHeld, setSpaceHeld] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
  const [deleteHeld, setDeleteHeld] = useState(false);
  const lastPaintedPos = useRef<string | null>(null);

  // Initialize selector position if null
  useEffect(() => {
    if (!selectorPos) {
      const center = Math.floor(gridSize / 2);
      setSelectorPos([center, center, center]);
    }
  }, [gridSize, selectorPos, setSelectorPos]);

  // Update community on hover
  useEffect(() => {
    if (!selectorPos || !gridRef.current) return;
    if (gridRef.current.get(selectorPos[0], selectorPos[1], selectorPos[2])) {
      setCommunity(
        gridRef.current.getCommunity(
          selectorPos[0],
          selectorPos[1],
          selectorPos[2],
        ),
      );
    } else {
      setCommunity([]);
    }
  }, [selectorPos, gridRef, setCommunity]);

  // Handle continuous painting with space held (activate)
  useEffect(() => {
    if (!selectorPos || !movement.current.space) return;

    // Only paint if no shape is selected, or let it handle shapes if that's intended
    if (selectedShape === "None") {
      const posKey = `${selectorPos[0]},${selectorPos[1]},${selectorPos[2]}`;
      if (lastPaintedPos.current !== posKey) {
        lastPaintedPos.current = posKey;
        setCell(selectorPos[0], selectorPos[1], selectorPos[2], true);
      }
    } else {
      // Shape painting logic (Space is already handled in handleKeyDown for single click)
      // but let's allow it to repainting during movement if held
      const pos = new THREE.Vector3().subVectors(camera.position, cameraTargetRef.current);
      const radius = pos.length();
      const polar = radius === 0 ? 0 : Math.acos(pos.y / radius);
      const azimuth = radius === 0 ? 0 : Math.atan2(pos.x, pos.z);
      const offsets = generateShape(selectedShape, shapeSize, isHollow);
      const rotatedOffsets = rotateOffsets(offsets, azimuth, polar);
      const cells = rotatedOffsets
        .map(([dx, dy, dz]) => [selectorPos[0] + dx, selectorPos[1] + dy, selectorPos[2] + dz] as [number, number, number])
        .filter(([x, y, z]) => x >= 0 && x < gridSize && y >= 0 && y < gridSize && z >= 0 && z < gridSize);
      setCells(cells);
    }
  }, [selectorPos, selectedShape, shapeSize, isHollow, gridSize, setCells, setCell, camera, cameraTargetRef]);

  // Handle continuous deleting with delete key held
  useEffect(() => {
    if (!selectorPos || !movement.current.delete) return;

    if (selectedShape !== "None") {
      const pos = new THREE.Vector3().subVectors(camera.position, cameraTargetRef.current);
      const radius = pos.length();
      const polar = radius === 0 ? 0 : Math.acos(pos.y / radius);
      const azimuth = radius === 0 ? 0 : Math.atan2(pos.x, pos.z);
      const offsets = generateShape(selectedShape, shapeSize, isHollow);
      const rotatedOffsets = rotateOffsets(offsets, azimuth, polar);
      const cells = rotatedOffsets
        .map(([dx, dy, dz]) => [selectorPos[0] + dx, selectorPos[1] + dy, selectorPos[2] + dz] as [number, number, number])
        .filter(([x, y, z]) => x >= 0 && x < gridSize && y >= 0 && y < gridSize && z >= 0 && z < gridSize);
      deleteCells(cells);
    } else {
      deleteCells([[selectorPos[0], selectorPos[1], selectorPos[2]]]);
    }
  }, [selectorPos, selectedShape, shapeSize, isHollow, gridSize, deleteCells, camera, cameraTargetRef]);

  return { rotateOffsets };
}
