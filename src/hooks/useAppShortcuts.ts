import { useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, CameraFace, CameraRotation } from "../core/cameraUtils";

export function useAppShortcuts() {
  const {
    state: { running, rotationMode, cameraOrientation },
    actions: { setRotationMode, playStop, step },
    meta,
  } = useSimulation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      // Selector movement, only in edit mode
      if (!rotationMode) {
        const key = e.key.toLowerCase();
        if (["w", "x", "a", "d", "q", "z"].includes(key)) {
          e.preventDefault();

          if (cameraOrientation.face !== 'unknown' && cameraOrientation.rotation !== 'unknown') {
            const face = cameraOrientation.face as CameraFace;
            const rotation = cameraOrientation.rotation as CameraRotation;
            const keymapForOrientation = KEY_MAP[face][rotation];
            
            if (key in keymapForOrientation) {
              const delta = (keymapForOrientation as any)[key] as [number, number, number];
              meta.eventBus.emit("moveSelector", { delta });
            }
          }
          return; // Prevent other shortcuts from firing
        }
      }

      if (e.key === "m" || e.key === "M") {
        setRotationMode((prev) => !prev);
      }

      if (e.key === "Enter") {
        // shift+enter steps only when paused and in view mode
        if (e.shiftKey && !running && rotationMode) {
          step();
        } else if (!e.shiftKey && rotationMode) {
          // don't start/stop simulation while editing
          playStop();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    setRotationMode,
    playStop,
    step,
    running,
    rotationMode,
    meta,
    cameraOrientation,
  ]);
}
