import { useState } from "react";
import { createPortal } from "react-dom";
import { KeyMapPage } from "./KeyMapPage";
import { ClaimHint } from "./ClaimHint";

interface ShortcutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutOverlay({ isOpen, onClose }: ShortcutOverlayProps) {
  const [activeTab, setActiveTab] = useState<"view" | "edit" | "keymap">("view");

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: "rgba(20, 20, 22, 0.95)" }}
      >
        <div className="shortcuts-header">
          <h2>Shortcuts <ClaimHint claimId="SHORTCUTS_OVERVIEW_CLAIM" /></h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="shortcuts-tabs">
          <button
            className={`tab-btn ${activeTab === "view" ? "active" : ""}`}
            onClick={() => setActiveTab("view")}
          >
            View Mode <ClaimHint claimId="SHORTCUTS_VIEW_CLAIM" />
          </button>
          <button
            className={`tab-btn ${activeTab === "edit" ? "active" : ""}`}
            onClick={() => setActiveTab("edit")}
          >
            Edit Mode <ClaimHint claimId="SHORTCUTS_EDIT_CLAIM" />
          </button>
          <button
            className={`tab-btn ${activeTab === "keymap" ? "active" : ""}`}
            onClick={() => setActiveTab("keymap")}
          >
            Key Map <ClaimHint claimId="SHORTCUTS_TABS_CLAIM" />
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
                    <kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd> (L/R), <kbd>Q</kbd><kbd>Z</kbd> / <kbd>⇧</kbd>+<kbd>↑</kbd><kbd>↓</kbd> (U/D)
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Dolly Camera</span>
                  <div className="shortcut-keys">
                    <kbd>W</kbd><kbd>X</kbd> / <kbd>↑</kbd><kbd>↓</kbd> (In/Out)
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
                    <kbd>W</kbd><kbd>A</kbd><kbd>X</kbd><kbd>D</kbd><kbd>Q</kbd><kbd>Z</kbd> or <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd>
                  </div>
                </div>
                <div className="shortcut-row">
                  <span className="shortcut-desc">Activate Paint Mode</span>
                  <div className="shortcut-keys">
                    <kbd>␣ Space</kbd>
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
    </div>,
    document.body
  );
}
