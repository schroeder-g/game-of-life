import { useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { useBrush } from "../contexts/BrushContext"; // Import useBrush

export function useAppShortcuts() {
  const {
    state: { running, rotationMode },
    actions: { setRotationMode, playStop, step },
  } = useSimulation();

  const {
    actions: { clearShape }, // Destructure clearShape from useBrush
  } = useBrush();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.key === "m" || e.key === "M") {
        setRotationMode((prev) => !prev);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        // In edit mode (rotationMode === false), delete the selected shape
        if (!rotationMode) {
          clearShape();
          e.preventDefault(); // Prevent browser back/forward actions
        }
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
    clearShape, // Add clearShape to dependencies
  ]);
}
