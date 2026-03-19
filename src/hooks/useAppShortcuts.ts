import { useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, CameraFace, CameraRotation } from "../core/cameraUtils";
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
    },
    meta: { movement, eventBus },
  } = useSimulation();

  const {
    actions: { changeSize, clearShape },
  } = useBrush();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA"
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      let handled = true;

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
            // This will be handled by the BrushContext's keydown listener
            // if the selector is active. If not, it's ignored.
            handled = false;
          }
          break;
        case "arrowright": // Step forward
          if (rotationMode && !running) step();
          break;
        case "arrowleft": // Step backward
          if (rotationMode && !running && hasPastHistory) stepBackward();
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
          case ";": invertRotation ? (movement.current.rotateRight = true) : (movement.current.rotateLeft = true); break;
          case "k": invertRotation ? (movement.current.rotateLeft = true) : (movement.current.rotateRight = true); break;
          case "o": movement.current.rotateUp = true; break;
          case ".": movement.current.rotateDown = true; break;
          case "i": movement.current.rollLeft = true; break;
          case "p": movement.current.rollRight = true; break;
          default: handled = false;
        }
      } else {
        // --- EDITING MODE ---
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
          switch(key) {
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
        case ";":
        case "k":
          movement.current.rotateLeft = false;
          movement.current.rotateRight = false;
          break;
        case "o": movement.current.rotateUp = false; break;
        case ".": movement.current.rotateDown = false; break;
        case "i": movement.current.rollLeft = false; break;
        case "p": movement.current.rollRight = false; break;
        default: handled = false;
      }
      if(handled) e.preventDefault();
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
    fitDisplay, recenter, squareUp, movement, eventBus, changeSize, clearShape
  ]);
}
