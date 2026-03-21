import { useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, CameraFace, CameraRotation, getExplicitRotationAxis } from "../core/cameraUtils";
import { useBrush } from "../contexts/BrushContext";

export function useAppShortcuts() {
  const {
    state: {
      running,
      rotationMode,
      cameraOrientation,
      hasInitialState,
      hasPastHistory,
      invertRotation,
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
    state: { selectorPos, selectedShape },
    actions: { changeSize, clearShape, setSelectorPos },
  } = useBrush();

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
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA";

      const key = e.key.toLowerCase();
      const code = e.code;
      const isRotationCode = ["KeyO", "KeyK", "Period", "Semicolon", "KeyI", "KeyP"].includes(code);
      const isBrushRotationCommand = e.ctrlKey && e.shiftKey && isRotationCode;

      if (isInputFocused && !isBrushRotationCommand) {
        return;
      }

      let handled = true;

      const isBrushActive = selectedShape !== "None";

      if (isBrushRotationCommand && isBrushActive) {
        if (cameraOrientation.face !== 'unknown' && cameraOrientation.rotation !== 'unknown') {
          const face = cameraOrientation.face as CameraFace;
          const rotation = cameraOrientation.rotation as CameraRotation;
          const rotationKey = code === "Period" ? "period" : code === "Semicolon" ? "semicolon" : code.replace("Key", "").toLowerCase();
          const axis = getExplicitRotationAxis(face, rotation, rotationKey as any);
          if (axis.lengthSq() > 0) {
            cameraActionsRef.current?.rotateBrush(axis, Math.PI / 2);
            e.preventDefault();
            return;
          }
        }
      }

      // --- Global Shortcuts ---
      switch (key) {
        case "e": setRotationMode(false); break;
        case "v": setRotationMode(true); break;
        case "f": fitDisplay(); break;
        case "s": recenter(); break;
        case "l": squareUp(); break;
        case "r": if (hasInitialState) reset(); break;
        case " ": // Spacebar for play/pause or activate/deactivate
          if (rotationMode) {
            playStop();
          } else {
            movement.current.space = true;
            if (selectorPos) {
              setCell(selectorPos[0], selectorPos[1], selectorPos[2], true);
            }
            handled = true;
          }
          break;
        case "delete":
        case "backspace":
          if (!rotationMode) {
            movement.current.delete = true;
            if (selectorPos) {
              setCell(selectorPos[0], selectorPos[1], selectorPos[2], false);
            }
            handled = true;
          }
          break;
        case "arrowright": // Step forward
          if (!running) step();
          break;
        case "arrowleft": // Step backward
          if (!running && hasPastHistory) stepBackward();
          break;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); return; }


      if (rotationMode) {
        // --- VIEWING MODE ---
        switch (key) {
          // Camera Movement
          case "w": movement.current.backward = true; break;
          case "x": movement.current.forward = true; break;
          case "a": movement.current.left = true; break;
          case "d": movement.current.right = true; break;
          case "q": movement.current.up = true; break;
          case "z": movement.current.down = true; break;
          // Camera Rotation
          case ";": movement.current.rotateSemicolon = true; break;
          case "k": movement.current.rotateK = true; break;
          case "o": movement.current.rotateO = true; break;
          case ".": movement.current.rotatePeriod = true; break;
          case "i": movement.current.rotateI = true; break;
          case "p": movement.current.rotateP = true; break;
          default: handled = false;
        }
      } else {
        // --- EDITING MODE ---
        switch (key) {
          case 'o': cameraActionsRef.current?.snapRotate('up'); handled = true; break;
          case '.': cameraActionsRef.current?.snapRotate('down'); handled = true; break;
          case 'k': cameraActionsRef.current?.snapRotate(invertRotation ? 'left' : 'right'); handled = true; break;
          case ';': cameraActionsRef.current?.snapRotate(invertRotation ? 'right' : 'left'); handled = true; break;
          case 'i': cameraActionsRef.current?.snapRotate('rollLeft'); handled = true; break;
          case 'p': cameraActionsRef.current?.snapRotate('rollRight'); handled = true; break;
        }
        if (handled) { e.preventDefault(); return; }


        if (["w", "x", "a", "d", "q", "z"].includes(key)) {
          if (cameraOrientation.face !== 'unknown' && cameraOrientation.rotation !== 'unknown') {
            const face = cameraOrientation.face as CameraFace;
            const rotation = cameraOrientation.rotation as CameraRotation;
            const keymapForOrientation = KEY_MAP[face][rotation];
            if (key in keymapForOrientation) {
              const delta = (keymapForOrientation as any)[key] as [number, number, number];
              eventBus.emit("moveSelector", { delta });
              handled = true;
            }
          }
        } else {
          switch (key) {
            case "[": changeSize(-1, 0); break; // Max size not needed here
            case "]": changeSize(1, 0); break;
            case "escape": clearShape(); break;
            // Add other edit mode keys like space, delete etc. here if needed
            default: handled = false;
          }
        }
      }

      if (handled) e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!rotationMode) return; // Key up only matters for continuous view mode movement
      let handled = true;
      switch (key) {
        case "w": movement.current.backward = false; break;
        case "x": movement.current.forward = false; break;
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
        case " ": movement.current.space = false; break;
        case "delete":
        case "backspace": movement.current.delete = false; break;
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
    invertRotation, setRotationMode, playStop, step, stepBackward, reset,
    fitDisplay, recenter, squareUp, movement, eventBus, changeSize, clearShape,
    gridSize, selectorPos, setSelectorPos, cameraActionsRef
  ]);
}
