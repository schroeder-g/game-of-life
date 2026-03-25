// AGENT INSTRUCTION:
// The keyboard control logic, especially for rotation, is sourced from
// `src/core/faceOrientationKeyMapping.ts`. To ensure consistency, please avoid
// adding new keyboard control logic here. Instead, modify the mappings in
// the source of truth file.

import { useEffect, useRef, useCallback } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, CameraFace, CameraRotation, getExplicitRotationAxis } from "../core/faceOrientationKeyMapping";
import { useBrush } from "../contexts/BrushContext";
import * as THREE from "three";

export function useAppShortcuts() {
  const {
    state: {
      running,
      rotationMode,
      cameraOrientation,
      autoSquare,
      hasInitialState,
      hasPastHistory,
      invertYaw,
      invertPitch,
      invertRoll,
      gridSize,
    },
    actions: {
      setRotationMode,
      playStop,
      step,
      stepBackward,
      reset,
      setAutoSquare,
      fitDisplay,
      recenter,
      squareUp,
      setCell,
    },
    meta: { movement, eventBus, cameraActionsRef },
  } = useSimulation();

  const {
    state: brushState,
    actions: { changeSize, clearShape, setSelectorPos, setPaintMode },
  } = useBrush();
  const { selectorPos, selectedShape, paintMode } = brushState;

  const prevPaintModeRef = useRef<1 | 0 | -1>();

  useEffect(() => {
    // If we just transitioned into a paint mode from an idle state...
    if (paintMode === 1 && prevPaintModeRef.current !== 1) {
      if (selectorPos) {
        cameraActionsRef.current?.birthBrushCells();
      }
    } else if (paintMode === -1 && prevPaintModeRef.current !== -1) {
      if (selectorPos) {
        cameraActionsRef.current?.clearBrushCells();
      }
    }

    // Update the ref for the next render.
    prevPaintModeRef.current = paintMode;
  }, [paintMode, selectorPos, brushState, cameraActionsRef]);

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

      const face = cameraOrientation.face;
      const rotation = cameraOrientation.rotation;
      const hasValidOrientation = face !== 'unknown' && rotation !== 'unknown';

      if (isRotationCode) {
        if (autoSquare) {
          // Snap/Brush rotation when autoSquare is ON
          if (hasValidOrientation) {
            const f = face as CameraFace;
            const r = rotation as CameraRotation;
            let rotKey: "o" | "k" | "period" | "semicolon" | "i" | "p" = code === "Period" ? "period"
              : code === "Semicolon" ? "semicolon"
              : code.replace("Key", "").toLowerCase() as 'o' | 'k' | 'i' | 'p';

            // Handle inversion by swapping key pairs before lookup
            if (invertPitch) {
              if (rotKey === 'o') rotKey = 'period';
              else if (rotKey === 'period') rotKey = 'o';
            }
            if (invertYaw) {
              if (rotKey === 'k') rotKey = 'semicolon';
              else if (rotKey === 'semicolon') rotKey = 'k';
            }
            if (invertRoll) {
              if (rotKey === 'i') rotKey = 'p';
              else if (rotKey === 'p') rotKey = 'i';
            }

            let angle = Math.PI / 2;

            // In Edit mode, if painting, rotate brush. Otherwise snap-rotate camera.
            if (!rotationMode && selectedShape !== "None" && paintMode !== 0) {
              // Reverse direction for roll (i/p) to match user expectations
              if (["i", "p"].includes(rotKey)) {
                angle = -angle;
              }
              const axis = getExplicitRotationAxis(f, r, rotKey); // Brush rotation uses explicit (screen-relative) axis
              cameraActionsRef.current?.rotateBrush(axis, angle);
            } else {
              // For camera snapping, use the same screen-relative axes as brush rotation.
              const axis = getExplicitRotationAxis(f, r, rotKey);
              let snapAngle = angle;
              // The `rotationLookup` has inverted i/p axes, so we apply the same fix
              // as brush rotation to ensure consistent roll direction.
              if (["i", "p"].includes(rotKey)) {
                snapAngle = -angle;
              }
              cameraActionsRef.current?.snapRotateWithAxis(axis, snapAngle);
            }
          }
        } else {
          // Continuous rotation when autoSquare is OFF
          switch (key) {
            case ";": movement.current.rotateSemicolon = true; break;
            case "k": movement.current.rotateK = true; break;
            case "o": movement.current.rotateO = true; break;
            case ".": movement.current.rotatePeriod = true; break;
            case "i": movement.current.rotateI = true; break;
            case "p": movement.current.rotateP = true; break;
          }
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      let handled = true;

      if (!rotationMode) {
        // --- EDIT MODE CONTROLS ---
        if (["w", "x", "a", "d", "q", "z"].includes(key)) {
          if (hasValidOrientation) {
            const f = face as CameraFace;
            const r = rotation as CameraRotation;
            const keymapForOrientation = KEY_MAP[f][r];
            if (key in keymapForOrientation) {
              const delta = (keymapForOrientation as any)[key] as [number, number, number];
              eventBus.emit("moveSelector", { delta });
            }
          }
        } else if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
          const arrowMap: { [key: string]: string } = {
            "arrowup": e.shiftKey ? "q" : "w",
            "arrowdown": e.shiftKey ? "z" : "x",
            "arrowleft": "a",
            "arrowright": "d"
          };
          const mappedKey = arrowMap[key];
          if (mappedKey && hasValidOrientation) {
            const f = face as CameraFace;
            const r = rotation as CameraRotation;
            const keymapForOrientation = KEY_MAP[f][r];
            if (mappedKey in keymapForOrientation) {
              const delta = (keymapForOrientation as any)[mappedKey] as [number, number, number];
              eventBus.emit("moveSelector", { delta });
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
            case "l":
              if (!autoSquare) squareUp(); // one-shot when activating
              setAutoSquare(prev => !prev);
              break;
            case "r": if (hasInitialState) reset(); break;
            case " ":
              setPaintMode(prev => (prev === 1 ? 0 : 1));
              break;
            case "delete":
            case "backspace":
              setPaintMode(prev => (prev === -1 ? 0 : -1));
              break;
            default: handled = false;
          }
        }
      } else {
        // --- VIEW MODE CONTROLS ---
        switch (key) {
          case "e": setRotationMode(false); break;
          case "v": setRotationMode(true); break;
          case "f": fitDisplay(); break;
          case "s": recenter(); break;
          case "l":
            if (!autoSquare) squareUp(); // one-shot when activating
            setAutoSquare(prev => !prev);
            break;
          case "r": if (hasInitialState) reset(); break;
          case " ": playStop(); break;
          case "arrowup":
            if(e.shiftKey) movement.current.up = true;
            else movement.current.forward = true;
            break;
          case "arrowdown":
            if(e.shiftKey) movement.current.down = true;
            else movement.current.backward = true;
            break;
          case "arrowleft":
            movement.current.left = true;
            break;
          case "arrowright":
            movement.current.right = true;
            break;
          case "w": movement.current.forward = true; break;
          case "x": movement.current.backward = true; break;
          case "a": movement.current.left = true; break;
          case "d": movement.current.right = true; break;
          case "q": movement.current.up = true; break;
          case "z": movement.current.down = true; break;
          default: handled = false;
        }
      }

      if (handled) e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const code = e.code;
      const isRotationCode = ["KeyO", "KeyK", "Period", "Semicolon", "KeyI", "KeyP"].includes(code);

      // Key up matters for continuous movement in View mode OR Edit mode (if auto-square is off)
      const isContinuousAllowed = rotationMode || (!autoSquare && isRotationCode);
      if (!isContinuousAllowed) return;

      let handled = true;
      switch (key) {
        case "w": movement.current.forward = false; break;
        case "x": movement.current.backward = false; break;
        case "a": movement.current.left = false; break;
        case "d": movement.current.right = false; break;
        case "q": movement.current.up = false; break;
        case "z": movement.current.down = false; break;
        case "arrowup":
          movement.current.up = false;
          movement.current.forward = false;
          break;
        case "arrowdown":
          movement.current.down = false;
          movement.current.backward = false;
          break;
        case "arrowleft":
          movement.current.left = false;
          break;
        case "arrowright":
          movement.current.right = false;
          break;
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
    autoSquare,
    running, rotationMode, cameraOrientation, hasInitialState, hasPastHistory, invertYaw,
    invertPitch, invertRoll, setRotationMode, playStop, step, stepBackward, reset,
    setAutoSquare, fitDisplay, recenter, squareUp, movement, eventBus, changeSize, clearShape,
    gridSize, selectorPos, setSelectorPos, cameraActionsRef, selectedShape, setCell, setPaintMode, paintMode,
  ]);
}
