import { useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";

export function useAppShortcuts() {
  const {
    actions: { setRotationMode, playStop },
  } = useSimulation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.key === "t" || e.key === "T") {
        setRotationMode((prev) => !prev);
      }

      if (e.key === "Enter") {
        playStop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setRotationMode, playStop]);
}
