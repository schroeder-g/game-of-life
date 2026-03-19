import { MutableRefObject, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
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
  controlsRef: MutableRefObject<any>,
  cubeRef: MutableRefObject<THREE.Group | null>,
) {
  const {
    state: { gridSize, arrowKeyMappings },
    actions: { toggleCell, setCells, deleteCells, setCommunity },
    meta: { gridRef },
  } = useSimulation();

  const {
    state: { selectedShape, shapeSize, isHollow, selectorPos },
    actions: { setSelectorPos, clearShape, changeSize },
  } = useBrush();

  const [spaceHeld, setSpaceHeld] = useState(false);
  const [eraseMode, setEraseMode] = useState(false);
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

  // Handle continuous painting with space held (activate or erase)
  useEffect(() => {
    if (!selectorPos) return;
    if (spaceHeld && selectedShape === "None") {
      const posKey = `${selectorPos[0]},${selectorPos[1]},${selectorPos[2]}`;
      if (lastPaintedPos.current !== posKey) {
        lastPaintedPos.current = posKey;
        if (eraseMode) {
          deleteCells([[selectorPos[0], selectorPos[1], selectorPos[2]]]);
        } else {
          setCells([[selectorPos[0], selectorPos[1], selectorPos[2]]]);
        }
      }
    }
  }, [selectorPos, spaceHeld, selectedShape, setCells, deleteCells, eraseMode]);

  // Handle zooming / resizing shape with mouse wheel
  useEffect(() => {
    if (selectedShape === "None") return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 1 : -1;
      changeSize(delta, gridSize);
    };

    window.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
    return () =>
      window.removeEventListener("wheel", handleWheel, { capture: true });
  }, [selectedShape, changeSize, gridSize]);

  // Keyboard navigation
  useEffect(() => {
    if (!selectorPos) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.code === "Escape" && selectedShape !== "None") {
        e.preventDefault();
        clearShape();
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        const isCtrl = e.ctrlKey;
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
          if (isCtrl) {
            deleteCells(cells);
          } else {
            setCells(cells);
          }
        } else {
          if (!spaceHeld) {
            setSpaceHeld(true);
            setEraseMode(isCtrl);
            lastPaintedPos.current = `${selectorPos[0]},${selectorPos[1]},${selectorPos[2]}`;
            if (isCtrl) {
              deleteCells([[selectorPos[0], selectorPos[1], selectorPos[2]]]);
            } else {
              setCells([[selectorPos[0], selectorPos[1], selectorPos[2]]]);
            }
          }
        }
        return;
      }

      if (!e.key.startsWith("Arrow")) return;
      e.preventDefault();

      let dx = 0,
        dy = 0,
        dz = 0;

      // Determine movement based on arrowKeyMappings
      // The arrowKeyMappings are already calculated based on the cube's orientation
      // and the camera's perspective in Grid.tsx.
      // We just need to apply the corresponding delta to the selector position.
      const move = (axis: string, direction: number) => {
        switch (axis) {
          case "X":
            dx = direction;
            break;
          case "Y":
            dy = direction;
            break;
          case "Z":
            dz = direction;
            break;
        }
      };

      let targetDirection: "up" | "down" | "left" | "right" | "forward" | "backward" | null = null;

      if (e.shiftKey && e.ctrlKey) {
        if (e.key === "ArrowUp") {
          targetDirection = "forward";
        } else if (e.key === "ArrowDown") {
          targetDirection = "backward";
        }
      } else if (!e.shiftKey && !e.ctrlKey) {
        if (e.key === "ArrowRight") {
          targetDirection = "right";
        } else if (e.key === "ArrowLeft") {
          targetDirection = "left";
        } else if (e.key === "ArrowUp") {
          targetDirection = "up";
        } else if (e.key === "ArrowDown") {
          targetDirection = "down";
        }
      }

      if (targetDirection) {
        const mapping = Object.entries(arrowKeyMappings).find(
          ([_key, value]) => value === targetDirection,
        );
        if (mapping) {
          const [key] = mapping;
          const axis = key.replace(/[^XYZ]/g, "");
          const direction = key.startsWith("+") ? 1 : -1;
          move(axis, direction);
        }
      }

      if (dx !== 0 || dy !== 0 || dz !== 0) {
        const newX = Math.max(0, Math.min(gridSize - 1, selectorPos[0] + dx));
        const newY = Math.max(0, Math.min(gridSize - 1, selectorPos[1] + dy));
        const newZ = Math.max(0, Math.min(gridSize - 1, selectorPos[2] + dz));
        setSelectorPos([newX, newY, newZ]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
        setEraseMode(false);
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
    selectedShape,
    shapeSize,
    isHollow,
    spaceHeld,
    setSelectorPos,
    clearShape,
    setCells,
    toggleCell,
    deleteCells,
    arrowKeyMappings, // Add arrowKeyMappings to dependencies
  ]);

  return { rotateOffsets };
}
