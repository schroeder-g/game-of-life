import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Grid3D } from "../core/Grid3D";
import { ShapeType, generateShape } from "../core/shapes";
import { Cells } from "./Cell";

export function BoundingBox({ size }: { size: number }) {
  return (
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
      <lineBasicMaterial color="#333366" />
    </lineSegments>
  );
}

function rotateOffsets(
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

function ShapePreview({
  selectorPos,
  gridSize,
  selectedShape,
  shapeSize,
  isHollow,
  controlsRef,
}: {
  selectorPos: [number, number, number];
  gridSize: number;
  selectedShape: ShapeType;
  shapeSize: number;
  isHollow: boolean;
  controlsRef: React.RefObject<any>;
}) {
  const offset = gridSize / 2;
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
    if (selectedShape === "None") return [];

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
          position={[cell[0] - offset, cell[1] - offset, cell[2] - offset]}
        >
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.35} />
        </mesh>
      ))}
      {previewCells.map((cell, i) => (
        <lineSegments
          key={`edge-${i}`}
          position={[cell[0] - offset, cell[1] - offset, cell[2] - offset]}
        >
          <edgesGeometry args={[new THREE.BoxGeometry(0.92, 0.92, 0.92)]} />
          <lineBasicMaterial color="#ffaa00" />
        </lineSegments>
      ))}
    </group>
  );
}

function KeyboardSelector({
  gridSize,
  grid,
  controlsRef,
  selectedShape,
  shapeSize,
  isHollow,
  onToggle,
  onSetCells,
  onDeleteCells,
  onClearShape,
  onSizeChange,
  onCommunityChange,
  onSelectorChange,
}: {
  gridSize: number;
  grid: Grid3D;
  controlsRef: React.RefObject<any>;
  selectedShape: ShapeType;
  shapeSize: number;
  isHollow: boolean;
  onToggle: (x: number, y: number, z: number) => void;
  onSetCells: (cells: Array<[number, number, number]>) => void;
  onDeleteCells: (cells: Array<[number, number, number]>) => void;
  onClearShape: () => void;
  onSizeChange: (delta: number) => void;
  onCommunityChange: (community: Array<[number, number, number]>) => void;
  onSelectorChange: (pos: [number, number, number]) => void;
}) {
  const center = Math.floor(gridSize / 2);
  const [selectorPos, setSelectorPos] = useState<[number, number, number]>([
    center,
    center,
    center,
  ]);
  const offset = gridSize / 2;
  const [spaceHeld, setSpaceHeld] = useState(false);
  const lastPaintedPos = useRef<string | null>(null);

  useEffect(() => {
    onSelectorChange(selectorPos);
  }, [selectorPos, onSelectorChange]);

  useEffect(() => {
    if (grid.get(selectorPos[0], selectorPos[1], selectorPos[2])) {
      onCommunityChange(
        grid.getCommunity(selectorPos[0], selectorPos[1], selectorPos[2]),
      );
    } else {
      onCommunityChange([]);
    }
  }, [selectorPos, grid, onCommunityChange]);

  useEffect(() => {
    if (spaceHeld && selectedShape === "None") {
      const posKey = `${selectorPos[0]},${selectorPos[1]},${selectorPos[2]}`;
      if (lastPaintedPos.current !== posKey) {
        lastPaintedPos.current = posKey;
        onToggle(selectorPos[0], selectorPos[1], selectorPos[2]);
      }
    }
  }, [selectorPos, spaceHeld, selectedShape, onToggle]);

  useEffect(() => {
    if (selectedShape === "None") return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 1 : -1;
      onSizeChange(delta);
    };

    window.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    return () =>
      window.removeEventListener("wheel", handleWheel, { capture: true });
  }, [selectedShape, onSizeChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.code === "Escape" && selectedShape !== "None") {
        e.preventDefault();
        onClearShape();
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (selectedShape !== "None") {
          const azimuth = controlsRef.current?.getAzimuthalAngle() ?? 0;
          const polar = controlsRef.current?.getPolarAngle() ?? Math.PI / 4;
          const offsets = generateShape(selectedShape, shapeSize, isHollow);
          const rotatedOffsets = rotateOffsets(offsets, azimuth, polar);
          const cells = rotatedOffsets
            .map(
              ([dx, dy, dz]) =>
                [
                  selectorPos[0] + dx,
                  selectorPos[1] + dy,
                  selectorPos[2] + dz,
                ] as [number, number, number],
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
          onSetCells(cells);
        } else {
          if (!spaceHeld) {
            setSpaceHeld(true);
            lastPaintedPos.current = `${selectorPos[0]},${selectorPos[1]},${selectorPos[2]}`;
            onToggle(selectorPos[0], selectorPos[1], selectorPos[2]);
          }
        }
        return;
      }

      if (e.code === "Backspace") {
        e.preventDefault();
        if (selectedShape !== "None") {
          const azimuth = controlsRef.current?.getAzimuthalAngle() ?? 0;
          const polar = controlsRef.current?.getPolarAngle() ?? Math.PI / 4;
          const offsets = generateShape(selectedShape, shapeSize, isHollow);
          const rotatedOffsets = rotateOffsets(offsets, azimuth, polar);
          const cells = rotatedOffsets
            .map(
              ([dx, dy, dz]) =>
                [
                  selectorPos[0] + dx,
                  selectorPos[1] + dy,
                  selectorPos[2] + dz,
                ] as [number, number, number],
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
          onDeleteCells(cells);
        } else {
          onDeleteCells([[selectorPos[0], selectorPos[1], selectorPos[2]]]);
        }
        return;
      }

      if (!e.key.startsWith("Arrow")) return;
      e.preventDefault();

      const azimuth = controlsRef.current?.getAzimuthalAngle() ?? 0;

      const rightX = Math.cos(azimuth);
      const rightZ = -Math.sin(azimuth);
      const forwardX = -Math.sin(azimuth);
      const forwardZ = -Math.cos(azimuth);

      const quantizeToAxis = (
        x: number,
        z: number,
      ): [number, number, number] => {
        if (Math.abs(x) >= Math.abs(z)) {
          return [Math.sign(x), 0, 0];
        } else {
          return [0, 0, Math.sign(z)];
        }
      };

      let dx = 0,
        dy = 0,
        dz = 0;

      if (e.shiftKey) {
        if (e.key === "ArrowUp") {
          [dx, dy, dz] = quantizeToAxis(forwardX, forwardZ);
        } else if (e.key === "ArrowDown") {
          [dx, dy, dz] = quantizeToAxis(-forwardX, -forwardZ);
        }
      } else {
        if (e.key === "ArrowRight") {
          [dx, dy, dz] = quantizeToAxis(rightX, rightZ);
        } else if (e.key === "ArrowLeft") {
          [dx, dy, dz] = quantizeToAxis(-rightX, -rightZ);
        } else if (e.key === "ArrowUp") {
          dy = 1;
        } else if (e.key === "ArrowDown") {
          dy = -1;
        }
      }

      if (dx !== 0 || dy !== 0 || dz !== 0) {
        setSelectorPos((prev) => {
          const newX = Math.max(0, Math.min(gridSize - 1, prev[0] + dx));
          const newY = Math.max(0, Math.min(gridSize - 1, prev[1] + dy));
          const newZ = Math.max(0, Math.min(gridSize - 1, prev[2] + dz));
          return [newX, newY, newZ];
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
        lastPaintedPos.current = null;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    selectorPos,
    gridSize,
    controlsRef,
    onToggle,
    selectedShape,
    shapeSize,
    isHollow,
    onSetCells,
    onClearShape,
    spaceHeld,
  ]);

  return (
    <group>
      <ShapePreview
        selectorPos={selectorPos}
        gridSize={gridSize}
        selectedShape={selectedShape}
        shapeSize={shapeSize}
        isHollow={isHollow}
        controlsRef={controlsRef}
      />
      <mesh
        position={[
          selectorPos[0] - offset,
          selectorPos[1] - offset,
          selectorPos[2] - offset,
        ]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
      <lineSegments
        position={[
          selectorPos[0] - offset,
          selectorPos[1] - offset,
          selectorPos[2] - offset,
        ]}
      >
        <edgesGeometry args={[new THREE.BoxGeometry(1.02, 1.02, 1.02)]} />
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </lineSegments>
    </group>
  );
}

export function Scene({
  grid,
  running,
  speed,
  cellMargin,
  rotationMode,
  selectedShape,
  shapeSize,
  isHollow,
  onTick,
  onToggleCell,
  onSetCells,
  onDeleteCells,
  onClearShape,
  onSizeChange,
  onCommunityChange,
  onSelectorChange,
}: {
  grid: Grid3D;
  running: boolean;
  speed: number;
  cellMargin: number;
  rotationMode: boolean;
  selectedShape: ShapeType;
  shapeSize: number;
  isHollow: boolean;
  onTick: () => void;
  onToggleCell: (x: number, y: number, z: number) => void;
  onSetCells: (cells: Array<[number, number, number]>) => void;
  onDeleteCells: (cells: Array<[number, number, number]>) => void;
  onClearShape: () => void;
  onSizeChange: (delta: number) => void;
  onCommunityChange: (community: Array<[number, number, number]>) => void;
  onSelectorChange: (pos: [number, number, number]) => void;
}) {
  const lastTick = useRef(0);
  const controlsRef = useRef<any>(null);

  useFrame((state) => {
    if (running) {
      const elapsed = state.clock.getElapsedTime();
      if (elapsed - lastTick.current > 1 / speed) {
        lastTick.current = elapsed;
        onTick();
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[30, 30, 30]} intensity={1} />
      <pointLight position={[-30, -30, -30]} intensity={0.5} />
      <Cells grid={grid} margin={cellMargin} />
      <BoundingBox size={grid.size} />
      {!rotationMode && (
        <KeyboardSelector
          gridSize={grid.size}
          grid={grid}
          controlsRef={controlsRef}
          selectedShape={selectedShape}
          shapeSize={shapeSize}
          isHollow={isHollow}
          onToggle={onToggleCell}
          onSetCells={onSetCells}
          onDeleteCells={onDeleteCells}
          onClearShape={onClearShape}
          onSizeChange={onSizeChange}
          onCommunityChange={onCommunityChange}
          onSelectorChange={onSelectorChange}
        />
      )}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        enabled={rotationMode}
      />
      <PerspectiveCamera makeDefault position={[30, 25, 30]} />
    </>
  );
}
