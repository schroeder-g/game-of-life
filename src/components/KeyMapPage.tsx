// @documentation-skip
import { KEY_MAP, type CameraFace, type CameraRotation } from "../core/faceOrientationKeyMapping";

const KeyDisplay = ({ k, v }: { k: string; v: readonly number[] }) => (
  <div className="key-map-row">
    <kbd>{k.toUpperCase()}</kbd>
    <span>{`[${v.join(", ")}]`}</span>
  </div>
);

export function KeyMapPage() {
  return (
    <div className="key-map-container">
      {Object.keys(KEY_MAP).map((face) => (
        <div key={face} className="key-map-face-section">
          <h2>{face.charAt(0).toUpperCase() + face.slice(1)}</h2>
          <div className="key-map-rotations-grid">
            {(Object.keys(KEY_MAP[face as CameraFace]) as unknown as CameraRotation[]).map(
              (rotation) => (
                <div key={rotation} className="key-map-rotation-block">
                  <h3>{rotation}°</h3>
                  <div className="key-map-keys">
                    {Object.entries(KEY_MAP[face as CameraFace][rotation]).map(
                      ([key, value]) => (
                        <KeyDisplay key={key} k={key} v={value} />
                      ),
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
