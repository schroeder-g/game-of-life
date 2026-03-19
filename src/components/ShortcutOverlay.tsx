import { useState } from "react";
import { KEY_MAP, CameraFace, CameraRotation } from "../core/cameraUtils";

const KeyDisplay = ({ k, v }: { k: string; v: number[] }) => (
  <div className="key-map-row">
    <kbd>{k.toUpperCase()}</kbd>
    <span>{`[${v.join(", ")}]`}</span>
  </div>
);

function KeyMapPage() {
  return (
    <div className="key-map-container">
      {Object.keys(KEY_MAP).map((face) => (
        <div key={face} className="key-map-face-section">
          <h2>{face.charAt(0).toUpperCase() + face.slice(1)} View</h2>
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

interface ShortcutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutOverlay({ isOpen, onClose }: ShortcutOverlayProps) {
  const [activeTab, setActiveTab] = useState<"view" | "edit" | "keymap">("view");

  if (!isOpen) return null;

  return (
    <div className="shortcuts-modal-backdrop" onClick={onClose}>
      <div
        className="shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: "rgba(20, 20, 22, 0.95)" }}
      >
        <div className="shortcuts-header">
          <h2>Shortcuts</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="shortcuts-tabs">
          <button
            className={`tab-btn ${activeTab === "view" ? "active" : ""}`}
            onClick={() => setActiveTab("view")}
          >
            View Mode
          </button>
          <button
            className={`tab-btn ${activeTab === "edit" ? "active" : ""}`}
            onClick={() => setActiveTab("edit")}
          >
            Edit Mode
          </button>
          <button
            className={`tab-btn ${activeTab === "keymap" ? "active" : ""}`}
            onClick={() => setActiveTab("keymap")}
          >
            Key Map
          </button>
        </div>

        <div
          className="shortcuts-content"
          style={{ overflowY: "auto", maxHeight: "70vh" }}
        >
          {activeTab === "view" && (
            <>
              <div className="shortcut-section">
                <h3>Global</h3>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Toggle View/Edit Mode</span>
                  <div className="shortcut-keys">
                    <kbd>V</kbd> / <kbd>E</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Reset Simulation</span>
                  <div className="shortcut-keys">
                    <kbd>R</kbd>
                  </div>
                </div>
              </div>
              <div className="shortcut-section">
                <h3>Simulation</h3>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Play / Pause</span>
                  <div className="shortcut-keys">
                    <kbd>␣ Space</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Step Forward</span>
                  <div className="shortcut-keys">
                    <kbd>→</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Step Backward</span>
                  <div className="shortcut-keys">
                    <kbd>←</kbd>
                  </div>
                </div>
              </div>
              <div className="shortcut-section">
                <h3>Camera Actions</h3>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Fit Display</span>
                  <div className="shortcut-keys">
                    <kbd>F</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Recenter View</span>
                  <div className="shortcut-keys">
                    <kbd>S</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Square Up View</span>
                  <div className="shortcut-keys">
                    <kbd>L</kbd>
                  </div>
                </div>
              </div>
              <div className="shortcut-section">
                <h3>Camera Movement</h3>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Pan Camera</span>
                  <div className="shortcut-keys">
                    <kbd>A</kbd> <kbd>D</kbd> (Left/Right), <kbd>Q</kbd> <kbd>Z</kbd> (Up/Down)
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Dolly Camera</span>
                  <div className="shortcut-keys">
                    <kbd>W</kbd> (In) / <kbd>X</kbd> (Out)
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Rotate Cube</span>
                  <div className="shortcut-keys">
                    <kbd>K</kbd> <kbd>;</kbd> (Yaw), <kbd>O</kbd> <kbd>.</kbd> (Pitch)
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Roll Camera</span>
                  <div className="shortcut-keys">
                    <kbd>I</kbd> <kbd>P</kbd>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "edit" && (
            <>
              <div className="shortcut-section">
                <h3>Global</h3>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Toggle View/Edit Mode</span>
                  <div className="shortcut-keys">
                    <kbd>V</kbd> / <kbd>E</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Reset Simulation</span>
                  <div className="shortcut-keys">
                    <kbd>R</kbd>
                  </div>
                </div>
              </div>
              <div className="shortcut-section">
                <h3>Cursor & Cells</h3>
                <div className="shortcut-row">
                  <span className="shortcut-desc">
                    Move Cursor (screen relative)
                  </span>
                  <div className="shortcut-keys">
                    <kbd>W</kbd> <kbd>X</kbd> <kbd>A</kbd> <kbd>D</kbd> <kbd>Q</kbd> <kbd>Z</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Activate Cell(s)</span>
                  <div className="shortcut-keys">
                    <kbd>␣ Space</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Deactivate Cell(s)</span>
                  <div className="shortcut-keys">
                    <kbd>Ctrl</kbd> <span>+</span> <kbd>␣ Space</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Delete Cells (in shape)</span>
                  <div className="shortcut-keys">
                    <kbd>Delete</kbd> / <kbd>Backspace</kbd>
                  </div>
                </div>
              </div>
              <div className="shortcut-section">
                <h3>Brush</h3>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Change Brush Size</span>
                  <div className="shortcut-keys">
                    <kbd>[</kbd> <kbd>]</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Cancel Shape</span>
                  <div className="shortcut-keys">
                    <kbd>Esc</kbd>
                  </div>
                </div>
              </div>
              <div className="shortcut-section">
                <h3>Mouse Controls</h3>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Rotate Camera</span>
                  <div className="shortcut-keys">
                    <kbd>Click</kbd> <span>+</span> <kbd>Drag</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Pan Camera</span>
                  <div className="shortcut-keys">
                    <kbd>⇧ Shift</kbd> <span>+</span> <kbd>Click</kbd>{" "}
                    <span>+</span> <kbd>Drag</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Zoom</span>
                  <div className="shortcut-keys">
                    <kbd>Scroll</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Change Brush Size</span>
                  <div className="shortcut-keys">
                    <kbd>Scroll</kbd> (with cursor)
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "keymap" && <KeyMapPage />}
        </div>
      </div>
    </div>
  );
}
