// Re-export everything from faceOrientationKeyMapping for backward compatibility.
// The actual data and types have moved to faceOrientationKeyMapping.ts.
export {
  KEY_MAP,
  rotationLookup,
  CameraFace,
  CameraRotation,
  CameraOrientation,
  getRotationAxis,
  getExplicitRotationAxis,
} from "./faceOrientationKeyMapping";
