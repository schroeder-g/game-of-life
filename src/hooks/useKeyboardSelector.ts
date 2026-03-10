import { MutableRefObject, useEffect, useRef, useState } from "react";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { generateShape } from "../core/shapes";

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

export function useKeyboardSelector(controlsRef: MutableRefObject<any>) {
  const {
    state: { gridSize },
    actions: { toggleCell, setCells, deleteCells, setCommunity },
    meta: { gridRef },
  } = useSimulation();

  const {
    state: { selectedShape, shapeSize, isHollow, selectorPos },
    actions: { setSelectorPos, clearShape, changeSize },
  } = useBrush();

  const [spaceHeld, setSpaceHeld] = useState(false);
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

  // Handle continuous painting with space held
  useEffect(() => {
    if (!selectorPos) return;
    if (spaceHeld && selectedShape === "None") {
      const posKey = `${selectorPos[0]},${selectorPos[1]},${selectorPos[2]}`;
      if (lastPaintedPos.current !== posKey) {
        lastPaintedPos.current = posKey;
        toggleCell(selectorPos[0], selectorPos[1], selectorPos[2]);
      }
    }
  }, [selectorPos, spaceHeld, selectedShape, toggleCell]);

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
          setCells(cells);
        } else {
          if (!spaceHeld) {
            setSpaceHeld(true);
            lastPaintedPos.current = `${selectorPos[0]},${selectorPos[1]},${selectorPos[2]}`;
            toggleCell(selectorPos[0], selectorPos[1], selectorPos[2]);
          }
        }
        return;
      }

      if (e.code === "Backspace" || e.key === "Delete") {
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
          deleteCells(cells);
        } else {
          deleteCells([[selectorPos[0], selectorPos[1], selectorPos[2]]]);
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
        const newX = Math.max(0, Math.min(gridSize - 1, selectorPos[0] + dx));
        const newY = Math.max(0, Math.min(gridSize - 1, selectorPos[1] + dy));
        const newZ = Math.max(0, Math.min(gridSize - 1, selectorPos[2] + dz));
        setSelectorPos([newX, newY, newZ]);
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
    selectedShape,
    shapeSize,
    isHollow,
    spaceHeld,
    setSelectorPos,
    clearShape,
    setCells,
    toggleCell,
    deleteCells,
  ]);

  return { rotateOffsets };
}
