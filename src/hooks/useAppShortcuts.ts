import { useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, CameraFace, CameraRotation, getExplicitRotationAxis, rotationLookup } from "../core/cameraUtils";
import { useBrush } from "../contexts/BrushContext";
import * as THREE from "three";

export function useAppShortcuts() {
  const {
    state: {
      running,
      rotationMode,
      cameraOrientation,
      hasInitialState,
      hasPastHistory,
      invertYaw,
      invertPitch,
      gridSize,
    },
    actions: {
      setRotationMode,
      playStop,
      step,
      stepBackward,
      reset,
      fitDisplay,
      recenter,
      squareUp,
      setCell,
    },
    meta: { movement, eventBus, cameraActionsRef },
  } = useSimulation();

  const {
    state: brushState,
    actions: { changeSize, clearShape, setSelectorPos },
  } = useBrush();
  const { selectorPos, selectedShape } = brushState;

  useEffect(() => {
    // When entering edit mode, if cursor is not set, center it.
    if (!rotationMode && !selectorPos) {
      const center = Math.floor(gridSize / 2);
      setSelectorPos([center, center, center]);
    }
  }, [rotationMode, selectorPos, setSelectorPos, gridSize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTextBox =
        (target.tagName === "INPUT" &&
          ["text", "number", "email", "password", "url", "search", "tel"].includes(
            (target as HTMLInputElement).type,
          )) ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const key = e.key.toLowerCase();
      const code = e.code;

      // Rotation keys: i, p, o, k, ., ;
      const isRotationCode = ["KeyO", "KeyK", "Period", "Semicolon", "KeyI", "KeyP"].includes(code);
      // Allow rotation keys through even in text boxes, but nothing else
      if (isTextBox && !isRotationCode) return;

      const isBrushActive = selectedShape !== "None";
      const face = cameraOrientation.face;
      const rotation = cameraOrientation.rotation;
      const hasValidOrientation = face !== 'unknown' && rotation !== 'unknown';

      // --- ROTATION KEY HANDLING (i, p, o, k, ., ;) ---
      if (isRotationCode && !rotationMode) {
        if (hasValidOrientation) {
          const f = face as CameraFace;
          const r = rotation as CameraRotation;
          // Normalize key name to match rotationLookup keys
          const rotKey = code === "Period" ? "period"
            : code === "Semicolon" ? "semicolon"
            : code.replace("Key", "").toLowerCase() as 'o' | 'k' | 'i' | 'p';

          if (isBrushActive && !e.ctrlKey && !e.shiftKey) {
            // Rotate the BRUSH using the same direction as cube snapRotate,
            // but transformed into grid-local space for the brush quaternion.
            // Map key to the same direction + angle that snapRotate would use:
            let direction: string | null = null;
            switch (key) {
              case 'o': direction = invertPitch ? 'down' : 'up'; break;
              case '.': direction = invertPitch ? 'up' : 'down'; break;
              case 'k': direction = invertYaw ? 'left' : 'right'; break;
              case ';': direction = invertYaw ? 'right' : 'left'; break;
              case 'i': direction = 'rollLeft'; break;
              case 'p': direction = 'rollRight'; break;
            }
            if (direction) {
              cameraActionsRef.current?.rotateBrushByDirection(direction as any);
            }
            e.preventDefault();
            e.stopPropagation();
            return;
          } else if (e.ctrlKey && e.shiftKey) {
            // Rotate the CUBE (environment snap) using the same lookup as before
            switch (key) {
              case 'o': cameraActionsRef.current?.snapRotate(invertPitch ? 'down' : 'up'); break;
              case '.': cameraActionsRef.current?.snapRotate(invertPitch ? 'up' : 'down'); break;
              case 'k': cameraActionsRef.current?.snapRotate(invertYaw ? 'left' : 'right'); break;
              case ';': cameraActionsRef.current?.snapRotate(invertYaw ? 'right' : 'left'); break;
              case 'i': cameraActionsRef.current?.snapRotate('rollLeft'); break;
              case 'p': cameraActionsRef.current?.snapRotate('rollRight'); break;
            }
            e.preventDefault();
            e.stopPropagation();
            return;
          } else if (!isBrushActive && !e.ctrlKey && !e.shiftKey) {
            // No brush: rotation keys rotate the cube normally
            switch (key) {
              case 'o': cameraActionsRef.current?.snapRotate(invertPitch ? 'down' : 'up'); break;
              case '.': cameraActionsRef.current?.snapRotate(invertPitch ? 'up' : 'down'); break;
              case 'k': cameraActionsRef.current?.snapRotate(invertYaw ? 'left' : 'right'); break;
              case ';': cameraActionsRef.current?.snapRotate(invertYaw ? 'right' : 'left'); break;
              case 'i': cameraActionsRef.current?.snapRotate('rollLeft'); break;
              case 'p': cameraActionsRef.current?.snapRotate('rollRight'); break;
            }
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      let handled = true;

      // --- MOVEMENT KEYS IN EDIT MODE ---
      if (!rotationMode) {
        if (["w", "x", "a", "d", "q", "z"].includes(key)) {
          if (hasValidOrientation) {
            const f = face as CameraFace;
            const r = rotation as CameraRotation;
            const keymapForOrientation = KEY_MAP[f][r];
            if (key in keymapForOrientation) {
              const delta = (keymapForOrientation as any)[key] as [number, number, number];
              eventBus.emit("moveSelector", { delta });
              handled = true;
            }
          }
        } else {
          switch (key) {
            case "[": changeSize(-1, 0); break;
            case "]": changeSize(1, 0); break;
            case "escape": clearShape(); break;
            case "e": setRotationMode(false); break;
            case "v": setRotationMode(true); break;
            case "f": fitDisplay(); break;
            case "s": recenter(); break;
            case "l": squareUp(); break;
            case "r": if (hasInitialState) reset(); break;
            case " ":
              if (selectorPos) {
                cameraActionsRef.current?.toggleBrushCells(selectorPos, brushState);
              }
              break;
            case "delete":
            case "backspace":
              if (selectorPos) {
                cameraActionsRef.current?.clearBrushCells(selectorPos, brushState);
              }
              break;
            case "arrowright":
              if (!running) step();
              break;
            case "arrowleft":
              if (!running && hasPastHistory) stepBackward();
              break;
            default: handled = false;
          }
        }
      } else {
        // --- VIEWING MODE ---
        switch (key) {
          case "e": setRotationMode(false); break;
          case "v": setRotationMode(true); break;
          case "f": fitDisplay(); break;
          case "s": recenter(); break;
          case "l": squareUp(); break;
          case "r": if (hasInitialState) reset(); break;
          case " ": playStop(); break;
          case "arrowright": if (!running) step(); break;
          case "arrowleft": if (!running && hasPastHistory) stepBackward(); break;
          case "w": movement.current.forward = true; break;
          case "x": movement.current.backward = true; break;
          case "a": movement.current.left = true; break;
          case "d": movement.current.right = true; break;
          case "q": movement.current.up = true; break;
          case "z": movement.current.down = true; break;
          case ";": movement.current.rotateSemicolon = true; break;
          case "k": movement.current.rotateK = true; break;
          case "o": movement.current.rotateO = true; break;
          case ".": movement.current.rotatePeriod = true; break;
          case "i": movement.current.rotateI = true; break;
          case "p": movement.current.rotateP = true; break;
          default: handled = false;
        }
      }

      if (handled) e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!rotationMode) return; // Key up only matters for continuous view mode movement
      let handled = true;
      switch (key) {
        case "w": movement.current.forward = false; break;
        case "x": movement.current.backward = false; break;
        case "a": movement.current.left = false; break;
        case "d": movement.current.right = false; break;
        case "q": movement.current.up = false; break;
        case "z": movement.current.down = false; break;
        case ";": movement.current.rotateSemicolon = false; break;
        case "k": movement.current.rotateK = false; break;
        case "o": movement.current.rotateO = false; break;
        case ".": movement.current.rotatePeriod = false; break;
        case "i": movement.current.rotateI = false; break;
        case "p": movement.current.rotateP = false; break;
        default: handled = false;
      }
      if (handled) e.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    running, rotationMode, cameraOrientation, hasInitialState, hasPastHistory,
    invertYaw, invertPitch, setRotationMode, playStop, step, stepBackward, reset,
    fitDisplay, recenter, squareUp, movement, eventBus, changeSize, clearShape,
    gridSize, selectorPos, setSelectorPos, cameraActionsRef, selectedShape, setCell,
  ]);
}
