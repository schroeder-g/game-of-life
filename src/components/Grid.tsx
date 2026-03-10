import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { generateShape } from "../core/shapes";
import { useKeyboardSelector } from "../hooks/useKeyboardSelector";
import { Cells } from "./Cell";

export function BoundingBox({ size }: { size: number }) {
  return (
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
      <lineBasicMaterial color="#333366" />
    </lineSegments>
  );
}

function ShapePreview({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const {
    state: { gridSize },
  } = useSimulation();
  const {
    state: { selectedShape, shapeSize, isHollow, selectorPos },
  } = useBrush();
  const { rotateOffsets } = useKeyboardSelector(controlsRef as any);

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
    rotateOffsets,
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
  controlsRef,
}: {
  controlsRef: React.RefObject<any>;
}) {
  const {
    state: { gridSize },
  } = useSimulation();
  const {
    state: { selectorPos },
  } = useBrush();

  // Attach keyboard listeners
  useKeyboardSelector(controlsRef as any);

  if (!selectorPos) return null;

  const offset = gridSize / 2;

  return (
    <group>
      <ShapePreview controlsRef={controlsRef} />
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

export function Scene() {
  const {
    state: { speed, cellMargin, rotationMode, running },
    actions: { tick },
    meta: { gridRef },
  } = useSimulation();

  const lastTick = useRef(0);
  const controlsRef = useRef<any>(null);

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
      <Cells grid={gridRef.current} margin={cellMargin} />
      <BoundingBox size={gridRef.current.size} />
      {!rotationMode && <KeyboardSelector controlsRef={controlsRef} />}
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
