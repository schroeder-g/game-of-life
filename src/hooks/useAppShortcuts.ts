import { useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";

export function useAppShortcuts() {
  const {
    state: { running, rotationMode },
    actions: { setRotationMode, playStop, step },
    meta,
  } = useSimulation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      // Selector movement, only in edit mode
      if (!rotationMode) {
        if (["w", "s", "a", "d", "q", "e"].includes(e.key.toLowerCase())) {
          e.preventDefault();
          const key = e.key.toLowerCase();
          let axis: "x" | "y" | "z" | undefined;
          let direction: 1 | -1 | undefined;

          switch (key) {
            case "d": axis = "x"; direction = 1; break;
            case "a": axis = "x"; direction = -1; break;
            case "w": axis = "y"; direction = 1; break;
            case "s": axis = "y"; direction = -1; break;
            case "e": axis = "z"; direction = 1; break;
            case "q": axis = "z"; direction = -1; break;
          }

          if (axis && direction) {
            meta.eventBus.emit("moveSelector", { axis, direction });
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
  ]);
}
