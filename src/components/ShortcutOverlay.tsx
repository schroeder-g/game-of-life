interface ShortcutOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutOverlay({ isOpen, onClose }: ShortcutOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="shortcuts-modal-backdrop" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>Shortcuts</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="shortcuts-content">
          <div className="shortcut-section">
            <h3>Global</h3>
            <div className="shortcut-row">
              <span className="shortcut-desc">Toggle View/Edit Mode</span>
              <div className="shortcut-keys">
                <kbd>M</kbd>
              </div>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Play / Pause</span>
              <div className="shortcut-keys">
                <kbd>Enter</kbd>
              </div>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Step (when paused in View mode)</span>
              <div className="shortcut-keys">
                <kbd>⇧ Shift</kbd> <span>+</span> <kbd>Enter</kbd>
              </div>
            </div>
          </div>

          <div className="shortcut-section">
            <h3>View/Edit Modes</h3>
            <div className="shortcut-row">
              <span className="shortcut-desc">Rotate Camera</span>
              <div className="shortcut-keys">
                <kbd>Click</kbd> <span>+</span> <kbd>Drag</kbd>
              </div>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Move View</span>
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
          </div>

          <div className="shortcut-section">
            <h3>Edit Mode</h3>
            <div className="shortcut-row">
              <span className="shortcut-desc">Move Left/Right</span>
              <div className="shortcut-keys">
                <kbd>←</kbd> <kbd>→</kbd>
              </div>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Move Up/Down (Y-axis)</span>
              <div className="shortcut-keys">
                <kbd>↑</kbd> <kbd>↓</kbd>
              </div>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Move Z-axis</span>
              <div className="shortcut-keys">
                <kbd>⇧ Shift</kbd> <span>+</span> <kbd>↑</kbd> <kbd>↓</kbd>
              </div>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Activate cell (set alive)</span>
              <div className="shortcut-keys">
                <kbd>␣ Space</kbd>
              </div>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Deactivate cell (set dead)</span>
              <div className="shortcut-keys">
                <kbd>⇧ Shift</kbd> <span>+</span> <kbd>␣ Space</kbd>
              </div>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Paint cells on hold</span>
              <div className="shortcut-keys">
                <kbd>␣ Space</kbd> <span>(Hold)</span>
              </div>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Change Brush Size</span>
              <div className="shortcut-keys">
                <kbd>Scroll</kbd>
              </div>
            </div>
            <div className="shortcut-row">
              <span className="shortcut-desc">Cancel Shape</span>
              <div className="shortcut-keys">
                <kbd>Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
