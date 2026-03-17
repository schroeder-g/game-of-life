import { useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";

export function useAppShortcuts() {
  const {
    state: { running, rotationMode },
    actions: { setRotationMode, playStop, step, panCamera, dollyCamera },
  } = useSimulation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.key === "m" || e.key === "M") {
        setRotationMode((prev) => !prev);
      }

      if (rotationMode) {
        switch (e.key.toLowerCase()) {
          case "a": // slide left
            panCamera(-1, 0);
            break;
          case "d": // slide right
            panCamera(1, 0);
            break;
          case "w": // forward
            dollyCamera("in");
            break;
          case "x": // reverse
            dollyCamera("out");
            break;
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
    panCamera,
    dollyCamera,
  ]);
}
