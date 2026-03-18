import { Html, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { generateShape } from "../core/shapes";
import { useKeyboardSelector } from "../hooks/useKeyboardSelector";
import { Cells } from "./Cell";

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

function KeyboardCameraControls({
  controlsRef,
  cameraRef,
  cubeRef,
  panSpeed,
  rotationSpeed,
  gridSize,
  cameraActionsRef,
}: {
  controlsRef: React.RefObject<any>;
  cameraRef: React.RefObject<THREE.PerspectiveCamera>;
  cubeRef: React.RefObject<THREE.Group>;
  panSpeed: number;
  rotationSpeed: number;
  gridSize: number;
  cameraActionsRef: React.MutableRefObject<{
    fitDisplay: () => void;
    recenter: () => void;
    squareUp: () => void;
  } | null>;
}) {
  const {
    state: { rotationMode, invertRotation, running, hasPastHistory, hasInitialState },
    actions: { setRotationMode, playStop, step, stepBackward, reset },
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

  const animationState = useRef({
    isAnimating: false,
    startQuaternion: new THREE.Quaternion(),
    targetQuaternion: new THREE.Quaternion(),
    duration: 1,
    startTime: 0,
  });

  const triggerSnapRotation = React.useCallback(
    (axis: "x" | "y" | "z", direction: number) => {
      if (animationState.current.isAnimating || !cubeRef.current) return;

      animationState.current.isAnimating = true;
      animationState.current.startTime = 0;
      animationState.current.startQuaternion.copy(cubeRef.current.quaternion);

      const worldAxis = new THREE.Vector3();
      if (axis === "x") worldAxis.set(1, 0, 0);
      if (axis === "y") worldAxis.set(0, 1, 0);
      if (axis === "z") worldAxis.set(0, 0, 1);

      const angle = direction * (Math.PI / 2);
      const rotation = new THREE.Quaternion().setFromAxisAngle(worldAxis, angle);

      animationState.current.targetQuaternion
        .copy(rotation)
        .multiply(animationState.current.startQuaternion);
    },
    [cubeRef],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName;
      if (
        tagName === "SELECT" ||
        tagName === "TEXTAREA" ||
        (tagName === "INPUT" &&
          ((target as HTMLInputElement).type === "text" ||
            (target as HTMLInputElement).type === "number"))
      ) {
        return;
      }

      if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        setRotationMode(false); // Edit mode
        return;
      }
      if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        setRotationMode(true); // View mode
        return;
      }

      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        if (hasInitialState) {
          reset();
        }
        return;
      }

      if (rotationMode) {
        if (e.key === " ") {
          e.preventDefault();
          playStop();
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (running) {
            playStop();
          }
          step();
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (hasPastHistory) {
            if (running) {
              playStop();
            }
            stepBackward();
          }
          return;
        }
      }

      if (cameraActionsRef.current) {
        if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          cameraActionsRef.current.fitDisplay();
          return;
        }
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          cameraActionsRef.current.recenter();
          velocity.current.panX = 0;
          velocity.current.panY = 0;
          velocity.current.dolly = 0;
          velocity.current.rotateX = 0;
          velocity.current.rotateY = 0;
          velocity.current.roll = 0;
          return;
        }
        if (e.key.toLowerCase() === "l") {
          e.preventDefault();
          cameraActionsRef.current.squareUp();
          velocity.current.panX = 0;
          velocity.current.panY = 0;
          velocity.current.dolly = 0;
          velocity.current.rotateX = 0;
          velocity.current.rotateY = 0;
          velocity.current.roll = 0;
          return;
        }
      }

      switch (e.key.toLowerCase()) {
        case "w": // dolly in
          e.preventDefault();
          movement.current.backward = true;
          break;
        case "x": // dolly out
          e.preventDefault();
          movement.current.forward = true;
          break;
        case "a": // pan left
          e.preventDefault();
          movement.current.left = true;
          break;
        case "d": // pan right
          e.preventDefault();
          movement.current.right = true;
          break;
        case "q": // pan up
          e.preventDefault();
          movement.current.up = true;
          break;
        case "z": // pan down
          e.preventDefault();
          movement.current.down = true;
          break;
        case ";": // rotate left/right
          e.preventDefault();
          if (!rotationMode) {
            triggerSnapRotation("y", invertRotation ? -1 : 1);
            break;
          }
          if (invertRotation) {
            movement.current.rotateRight = true;
          } else {
            movement.current.rotateLeft = true;
          }
          break;
        case "k": // rotate right/left
          e.preventDefault();
          if (!rotationMode) {
            triggerSnapRotation("y", invertRotation ? 1 : -1);
            break;
          }
          if (invertRotation) {
            movement.current.rotateLeft = true;
          } else {
            movement.current.rotateRight = true;
          }
          break;
        case "o": // rotate backward (pitch up)
          e.preventDefault();
          if (!rotationMode) {
            triggerSnapRotation("x", 1);
            break;
          }
          movement.current.rotateUp = true;
          break;
        case ".": // rotate forward (pitch down)
          e.preventDefault();
          if (!rotationMode) {
            triggerSnapRotation("x", -1);
            break;
          }
          movement.current.rotateDown = true;
          break;
        case "i": // barrel roll left
          e.preventDefault();
          if (!rotationMode) {
            triggerSnapRotation("z", 1);
            break;
          }
          movement.current.rollLeft = true;
          break;
        case "p": // barrel roll right
          e.preventDefault();
          if (!rotationMode) {
            triggerSnapRotation("z", -1);
            break;
          }
          movement.current.rollRight = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tagName = target.tagName;
      if (
        tagName === "SELECT" ||
        tagName === "TEXTAREA" ||
        (tagName === "INPUT" &&
          ((target as HTMLInputElement).type === "text" ||
            (target as HTMLInputElement).type === "number"))
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "w":
          e.preventDefault();
          movement.current.backward = false;
          break;
        case "x":
          e.preventDefault();
          movement.current.forward = false;
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
          movement.current.up = false;
          break;
        case "z":
          e.preventDefault();
          movement.current.down = false;
          break;
        case ";":
          e.preventDefault();
          movement.current.rotateLeft = false;
          movement.current.rotateRight = false;
          break;
        case "k":
          e.preventDefault();
          movement.current.rotateLeft = false;
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
  }, [rotationMode, invertRotation, cameraActionsRef, setRotationMode, playStop, step, stepBackward, running, hasPastHistory, reset, hasInitialState, triggerSnapRotation]);

  useFrame((state, delta) => {
    if (animationState.current.isAnimating) {
      if (animationState.current.startTime === 0) {
        animationState.current.startTime = state.clock.getElapsedTime();
      }
      const elapsedTime =
        state.clock.getElapsedTime() - animationState.current.startTime;
      let progress = elapsedTime / animationState.current.duration;

      if (progress >= 1) {
        progress = 1;
        animationState.current.isAnimating = false;
        animationState.current.startTime = 0;
        if (cubeRef.current) {
          cubeRef.current.quaternion.copy(
            animationState.current.targetQuaternion,
          );
        }
      } else {
        // ease in cubic
        progress = progress * progress * progress;
        if (cubeRef.current) {
          THREE.Quaternion.slerp(
            animationState.current.startQuaternion,
            animationState.current.targetQuaternion,
            cubeRef.current.quaternion,
            progress,
          );
        }
      }
    }

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

    // Set acceleration to reach max speed in 1 second
    const acceleration = panMaxSpeed;
    const dollyAcceleration = dollyMaxSpeed;
    const rotationAcceleration = rotateMaxSpeed;
    const rollAcceleration = rollMaxSpeed;

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
        velocity.current.dolly + dollyAcceleration * delta,
        dollyMaxSpeed,
      );
    } else if (movement.current.forward) {
      velocity.current.dolly = Math.max(
        velocity.current.dolly - dollyAcceleration * delta,
        -dollyMaxSpeed,
      );
    } else {
      velocity.current.dolly *= damping;
    }


    if (Math.abs(velocity.current.roll) > 0.01) {
      if (cameraRef.current && controlsRef.current && cubeRef.current) {
        const oldUp = cameraRef.current.up.clone();
        const rollAngleRad = (velocity.current.roll * delta * Math.PI) / 180;

        const camera = cameraRef.current;
        const controls = controlsRef.current;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);

        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(forward, rollAngleRad);

        camera.up.applyQuaternion(quaternion);

        const visibility = getCubeVisibility(cubeRef.current, camera, gridSize);
        if (visibility.isOffScreen) {
          camera.up.copy(oldUp);
        } else {
          controls.update();
        }
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
        const oldPosition = camera.position.clone();
        const oldTarget = controls.target.clone();

        camera.position.add(panOffset);
        controls.target.add(panOffset);

        if (cubeRef.current) {
          const visibility = getCubeVisibility(
            cubeRef.current,
            camera,
            gridSize,
          );
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
              camera.position.copy(oldPosition);
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
        const oldPosition = camera.position.clone();
        const dollyOffset = forward
          .clone()
          .multiplyScalar(velocity.current.dolly * delta);
        camera.position.add(dollyOffset);

        if (cubeRef.current) {
          const visibility = getCubeVisibility(
            cubeRef.current,
            camera,
            gridSize,
          );
          if (visibility.isOffScreen) {
            const isDollyIn = velocity.current.dolly < 0;
            if (!isDollyIn) {
              camera.position.copy(oldPosition);
            } else {
              needsUpdate = true;
            }
          } else {
            needsUpdate = true;
          }
        } else {
          needsUpdate = true;
        }
      } else {
        velocity.current.dolly = 0;
      }

      const rotateX = velocity.current.rotateX * delta;
      const rotateY = velocity.current.rotateY * delta;

      if (
        cubeRef.current &&
        cameraRef.current &&
        !animationState.current.isAnimating
      ) {
        const camera = cameraRef.current;
        const oldQuaternion = cubeRef.current.quaternion.clone();
        let rotated = false;

        if (Math.abs(rotateX) > 0) {
          // Yaw
          const cameraUp = new THREE.Vector3().setFromMatrixColumn(
            camera.matrix,
            1,
          );
          cubeRef.current.rotateOnWorldAxis(cameraUp, -rotateX);
          rotated = true;
        }
        if (Math.abs(rotateY) > 0) {
          // Pitch
          const cameraRight = new THREE.Vector3().setFromMatrixColumn(
            camera.matrix,
            0,
          );
          cubeRef.current.rotateOnWorldAxis(cameraRight, rotateY);
          rotated = true;
        }

        if (rotated) {
          const visibility = getCubeVisibility(
            cubeRef.current,
            camera,
            gridSize,
          );
          if (visibility.isOffScreen) {
            cubeRef.current.quaternion.copy(oldQuaternion);
          }
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
    meta: { gridRef },
  } = useSimulation();
  const {
    state: { selectorPos },
  } = useBrush();

  // Attach keyboard listeners
  useKeyboardSelector(controlsRef as any);

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
          selectorPos[2] - offset,
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

        // Recenter on the origin without changing camera orientation
        const offset = new THREE.Vector3().subVectors(
          new THREE.Vector3(0, 0, 0),
          controlsRef.current.target,
        );
        cameraRef.current.position.add(offset);
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
    };
    return () => {
      cameraActionsRef.current = null;
    };
  }, [cameraActionsRef, gridRef, cubeRef]);

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
        gridSize={gridSize}
        cameraActionsRef={cameraActionsRef}
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
        {!rotationMode && (
          <>
            <AxisLabels size={gridRef.current.size} />
            <KeyboardSelector controlsRef={controlsRef} />
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
      />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, -40]} />
    </>
  );
}
