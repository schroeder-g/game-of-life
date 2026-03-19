import { useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, CameraFace, CameraRotation } from "../core/cameraUtils";

export function useAppShortcuts() {
  const {
    state: { running, rotationMode, cameraOrientation },
    actions: { setRotationMode, playStop, step },
    meta,
  } = useSimulation();

}
