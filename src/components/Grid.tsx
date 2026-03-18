import { Html, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { generateShape } from "../core/shapes";
import { useKeyboardSelector } from "../hooks/useKeyboardSelector";
import { Cells } from "./Cell";

export function BoundingBox({ size }: { size: number }) {
  return (
    <lineSegments raycast={() => null}>
      <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
      <lineBasicMaterial color="silver" />
    </lineSegments>
  );
}

function KeyboardCameraControls({
  controlsRef,
  cameraRef,
  cubeRef,
  panSpeed,
  rotationSpeed,
}: {
  controlsRef: React.RefObject<any>;
  cameraRef: React.RefObject<THREE.PerspectiveCamera>;
  cubeRef: React.RefObject<THREE.Group>;
  panSpeed: number;
  rotationSpeed: number;
}) {
  const {
    state: { rotationMode },
  } = useSimulation();

  const movement = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    rotateLeft: false,
    rotateRight: false,
    rotateUp: false,
    rotateDown: false,
    rollLeft: false,
    rollRight: false,
  });

  const velocity = useRef({
    panX: 0,
    panY: 0,
    dolly: 0,
    rotateX: 0,
    rotateY: 0,
    roll: 0,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (!rotationMode) return;

      switch (e.key.toLowerCase()) {
        case "x": // dolly in
          e.preventDefault();
          movement.current.forward = true;
          break;
        case "w": // dolly out
          e.preventDefault();
          movement.current.backward = true;
          break;
        case "a": // pan left
          e.preventDefault();
          movement.current.left = true;
          break;
        case "d": // pan right
          e.preventDefault();
          movement.current.right = true;
          break;
        case "q": // pan down
          e.preventDefault();
          movement.current.down = true;
          break;
        case "z": // pan up
          e.preventDefault();
          movement.current.up = true;
          break;
        case ";": // rotate left
          e.preventDefault();
          movement.current.rotateLeft = true;
          break;
        case "k": // rotate right
          e.preventDefault();
          movement.current.rotateRight = true;
          break;
        case "o": // rotate backward (pitch up)
          e.preventDefault();
          movement.current.rotateUp = true;
          break;
        case ".": // rotate forward (pitch down)
          e.preventDefault();
          movement.current.rotateDown = true;
          break;
        case "i": // barrel roll left
          e.preventDefault();
          movement.current.rollLeft = true;
          break;
        case "p": // barrel roll right
          e.preventDefault();
          movement.current.rollRight = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      switch (e.key.toLowerCase()) {
        case "x":
          e.preventDefault();
          movement.current.forward = false;
          break;
        case "w":
          e.preventDefault();
          movement.current.backward = false;
          break;
        case "a":
          e.preventDefault();
          movement.current.left = false;
          break;
        case "d":
          e.preventDefault();
          movement.current.right = false;
          break;
        case "q":
          e.preventDefault();
          movement.current.down = false;
          break;
        case "z":
          e.preventDefault();
          movement.current.up = false;
          break;
        case ";":
          e.preventDefault();
          movement.current.rotateLeft = false;
          break;
        case "k":
          e.preventDefault();
          movement.current.rotateRight = false;
          break;
        case "o":
          e.preventDefault();
          movement.current.rotateUp = false;
          break;
        case ".":
          e.preventDefault();
          movement.current.rotateDown = false;
          break;
        case "i":
          e.preventDefault();
          movement.current.rollLeft = false;
          break;
        case "p":
          e.preventDefault();
          movement.current.rollRight = false;
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [rotationMode]);

  useFrame((_, delta) => {
    if (!rotationMode) {
      // Reset movement and velocity when not in rotation mode
      movement.current.forward = false;
      movement.current.backward = false;
      movement.current.left = false;
      movement.current.right = false;
      movement.current.up = false;
      movement.current.down = false;
      movement.current.rotateLeft = false;
      movement.current.rotateRight = false;
      movement.current.rotateUp = false;
      movement.current.rotateDown = false;
      movement.current.rollLeft = false;
      movement.current.rollRight = false;
      velocity.current.panX = 0;
      velocity.current.panY = 0;
      velocity.current.dolly = 0;
      velocity.current.rotateX = 0;
      velocity.current.rotateY = 0;
      velocity.current.roll = 0;
      return;
    }

    const acceleration = 30.0;
    const rotationAcceleration = 15.0;
    const rollAcceleration = 900.0; // degrees/sec^2
    const panMaxSpeed = panSpeed;
    const dollyMaxSpeed = panSpeed * 1.5;

    // rotationSpeed is 1-100.
    // Map to old rotation speed range: 10 to 360
    const minRotSpeed = 10;
    const maxRotSpeed = 360;
    const actualRotationSpeed =
      minRotSpeed + ((rotationSpeed - 1) / 99) * (maxRotSpeed - minRotSpeed);

    // Map to old roll speed range: 25 to 1200
    const minRollSpeed = 25;
    const maxRollSpeed = 1200;
    const actualRollSpeed =
      minRollSpeed + ((rotationSpeed - 1) / 99) * (maxRollSpeed - minRollSpeed);

    const rotateMaxSpeed = (actualRotationSpeed * Math.PI) / 180;
    const rollMaxSpeed = actualRollSpeed;

    const damping = 0.9; // friction for deceleration

    // Panning (left/right)
    if (movement.current.right) {
      velocity.current.panX = Math.min(
        velocity.current.panX + acceleration * delta,
        panMaxSpeed,
      );
    } else if (movement.current.left) {
      velocity.current.panX = Math.max(
        velocity.current.panX - acceleration * delta,
        -panMaxSpeed,
      );
    } else {
      velocity.current.panX *= damping;
    }

    // Panning (up/down)
    if (movement.current.down) {
      velocity.current.panY = Math.min(
        velocity.current.panY + acceleration * delta,
        panMaxSpeed,
      );
    } else if (movement.current.up) {
      velocity.current.panY = Math.max(
        velocity.current.panY - acceleration * delta,
        -panMaxSpeed,
      );
    } else {
      velocity.current.panY *= damping;
    }

    // Rotation (left/right)
    if (movement.current.rotateRight) {
      velocity.current.rotateX = Math.min(
        velocity.current.rotateX + rotationAcceleration * delta,
        rotateMaxSpeed,
      );
    } else if (movement.current.rotateLeft) {
      velocity.current.rotateX = Math.max(
        velocity.current.rotateX - rotationAcceleration * delta,
        -rotateMaxSpeed,
      );
    } else {
      velocity.current.rotateX *= damping;
    }

    // Rotation (up/down)
    if (movement.current.rotateUp) {
      velocity.current.rotateY = Math.min(
        velocity.current.rotateY + rotationAcceleration * delta,
        rotateMaxSpeed,
      );
    } else if (movement.current.rotateDown) {
      velocity.current.rotateY = Math.max(
        velocity.current.rotateY - rotationAcceleration * delta,
        -rotateMaxSpeed,
      );
    } else {
      velocity.current.rotateY *= damping;
    }

    // Barrel roll
    if (movement.current.rollRight) {
      velocity.current.roll = Math.min(
        velocity.current.roll + rollAcceleration * delta,
        rollMaxSpeed,
      );
    } else if (movement.current.rollLeft) {
      velocity.current.roll = Math.max(
        velocity.current.roll - rollAcceleration * delta,
        -rollMaxSpeed,
      );
    } else {
      velocity.current.roll *= damping;
    }

    // Dollying (forward/backward)
    if (movement.current.backward) {
      velocity.current.dolly = Math.min(
        velocity.current.dolly + acceleration * delta,
        dollyMaxSpeed,
      );
    } else if (movement.current.forward) {
      velocity.current.dolly = Math.max(
        velocity.current.dolly - acceleration * delta,
        -dollyMaxSpeed,
      );
    } else {
      velocity.current.dolly *= damping;
    }


    if (Math.abs(velocity.current.roll) > 0.01) {
      if (cameraRef.current && controlsRef.current) {
        const rollAngleRad = (velocity.current.roll * delta * Math.PI) / 180;

        const camera = cameraRef.current;
        const controls = controlsRef.current;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);

        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(forward, rollAngleRad);

        camera.up.applyQuaternion(quaternion);
        controls.update();
      }
    } else {
      velocity.current.roll = 0;
    }


    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current;
      const controls = controlsRef.current;

      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
      const forward = new THREE.Vector3()
        .setFromMatrixColumn(camera.matrix, 2)
        .negate();

      let needsUpdate = false;
      const panOffset = new THREE.Vector3();

      if (Math.abs(velocity.current.panX) > 0.01) {
        panOffset.add(right.clone().multiplyScalar(velocity.current.panX * delta));
      } else {
        velocity.current.panX = 0;
      }

      if (Math.abs(velocity.current.panY) > 0.01) {
        panOffset.add(up.clone().multiplyScalar(velocity.current.panY * delta));
      } else {
        velocity.current.panY = 0;
      }

      if (panOffset.lengthSq() > 0) {
        camera.position.add(panOffset);
        controls.target.add(panOffset);
        needsUpdate = true;
      }

      if (Math.abs(velocity.current.dolly) > 0.01) {
        const dollyOffset = forward
          .clone()
          .multiplyScalar(velocity.current.dolly * delta);
        camera.position.add(dollyOffset);
        needsUpdate = true;
      } else {
        velocity.current.dolly = 0;
      }

      const rotateX = velocity.current.rotateX * delta;
      const rotateY = velocity.current.rotateY * delta;

      if (cubeRef.current && cameraRef.current) {
        const camera = cameraRef.current;
        if (Math.abs(rotateX) > 0) {
          // Yaw
          const cameraUp = new THREE.Vector3().setFromMatrixColumn(
            camera.matrix,
            1,
          );
          cubeRef.current.rotateOnWorldAxis(cameraUp, -rotateX);
        }
        if (Math.abs(rotateY) > 0) {
          // Pitch
          const cameraRight = new THREE.Vector3().setFromMatrixColumn(
            camera.matrix,
            0,
          );
          cubeRef.current.rotateOnWorldAxis(cameraRight, rotateY);
        }
      }

      if (Math.abs(velocity.current.rotateX) < 0.01) {
        velocity.current.rotateX = 0;
      }
      if (Math.abs(velocity.current.rotateY) < 0.01) {
        velocity.current.rotateY = 0;
      }

      if (needsUpdate) {
        controls.update();
      }
    }
  });

  return null;
}

function ShapePreview({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const {
    state: { gridSize },
  } = useSimulation();
  const {
    state: { selectedShape, shapeSize, isHollow, selectorPos },
  } = useBrush();
  const { rotateOffsets } = useKeyboardSelector(controlsRef as any);
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
        position={[0, selectorPos[1] - offset, selectorPos[2] - offset]}
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
        position={[selectorPos[0] - offset, 0, selectorPos[2] - offset]}
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

function AxisLabels({ size }: { size: number }) {
  const half = size / 2;
  const padding = 1.5; // Distance from the edge
  const labelStyle: React.CSSProperties = {
    color: "silver",
    fontSize: "12pt",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    whiteSpace: "nowrap",
  };

  const signs = [-1, 1];

  return (
    <group>
      {/* X labels */}
      {signs.map((sy) =>
        signs.map((sz) => (
          <Html
            key={`x-${sy}-${sz}`}
            position={[0, sy * (half + padding), sz * (half + padding)]}
            center
          >
            <div style={labelStyle}>X</div>
          </Html>
        )),
      )}
      {/* Y labels */}
      {signs.map((sx) =>
        signs.map((sz) => (
          <Html
            key={`y-${sx}-${sz}`}
            position={[sx * (half + padding), 0, sz * (half + padding)]}
            center
          >
            <div style={labelStyle}>Y</div>
          </Html>
        )),
      )}
      {/* Z labels */}
      {signs.map((sx) =>
        signs.map((sy) => (
          <Html
            key={`z-${sx}-${sy}`}
            position={[sx * (half + padding), sy * (half + padding), 0]}
            center
          >
            <div style={labelStyle}>Z</div>
          </Html>
        )),
      )}
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

  const offset = (gridSize - 1) / 2;

  return (
    <group>
      <AxisChannels selectorPos={selectorPos} gridSize={gridSize} />
      <ShapePreview controlsRef={controlsRef} />
      <mesh
        raycast={() => null}
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
        raycast={() => null}
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
    state: {
      speed,
      cellMargin,
      rotationMode,
      running,
      community,
      gridSize,
      panSpeed,
      rotationSpeed,
    },
    actions: { tick, setCommunity },
    meta: { gridRef },
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
        if (!controlsRef.current || !cameraRef.current) return;
        
        // Ensure we calculate from the origin for symmetric centering
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
        
        const direction = new THREE.Vector3().subVectors(cameraRef.current.position, new THREE.Vector3(0, 0, 0)).normalize();
        cameraRef.current.position.copy(direction.multiplyScalar(distance));
        cameraRef.current.lookAt(0, 0, 0);
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
        if (!controlsRef.current) return;
        // Snap to nearest 90 degree azimuthal and 90 degree polar
        const azimuth = controlsRef.current.getAzimuthalAngle();
        const snappedAzimuth = Math.round(azimuth / (Math.PI / 2)) * (Math.PI / 2);
        
        // We want front face at 90 degrees to camera. 
        // OrbitControls use polar and azimuthal. 
        // Polar PI/2 is level.
        
        const distance = cameraRef.current?.position.distanceTo(controlsRef.current.target) ?? 30;
        
        // Calculate new position based on snapped angles
        const x = distance * Math.sin(snappedAzimuth) * Math.sin(Math.PI / 2);
        const y = distance * Math.cos(Math.PI / 2);
        const z = distance * Math.cos(snappedAzimuth) * Math.sin(Math.PI / 2);
        
        cameraRef.current?.position.set(x, y, z).add(controlsRef.current.target);
        controlsRef.current.update();
      },
    };
    return () => {
      cameraActionsRef.current = null;
    };
  }, [cameraActionsRef, gridRef]);

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
      <KeyboardCameraControls
        controlsRef={controlsRef}
        cameraRef={cameraRef}
        cubeRef={cubeRef}
        panSpeed={panSpeed}
        rotationSpeed={rotationSpeed}
      />
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
        <AxisLabels size={gridRef.current.size} />
        {!rotationMode && <KeyboardSelector controlsRef={controlsRef} />}
      </group>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        enabled={true} // always allow dragging/zooming even in edit mode
        maxDistance={maxDistance}
      />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, -40]} />
    </>
  );
}
