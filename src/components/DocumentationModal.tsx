import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DOCUMENTATION_CONTENT } from "../data/documentation";

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
  const [deprecatedCollapsed, setDeprecatedCollapsed] = useState(true);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const rootEl = document.getElementById('root');
    if (!rootEl) return;

    // Save the original display style and hide the root element
    const originalDisplay = rootEl.style.display;
    rootEl.style.display = 'none';

    // When the component unmounts or isOpen changes, restore the original display
    return () => {
      rootEl.style.display = originalDisplay;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }
  
  // Separate current and deprecated content
  const currentItems = DOCUMENTATION_CONTENT.filter(item => !item.id.startsWith('deprecated-') && item.id !== 'heading-deprecated');
  const deprecatedItems = DOCUMENTATION_CONTENT.filter(item => item.id.startsWith('deprecated-') || item.id === 'heading-deprecated');
  const deprecatedHeader = deprecatedItems.find(item => item.id === 'heading-deprecated');
  const deprecatedClaims = deprecatedItems.filter(item => item.id !== 'heading-deprecated');

  const renderItem = (item: any) => { // Using 'any' for item to match the original structure, consider defining a proper type if not already done.
    switch (item.type) {
      case 'h3':
        return <h3 key={item.id} style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>{item.text}</h3>;
      case 'p':
        return (
          <div key={item.id} className="claim-item" style={{ marginBottom: '1rem' }}>
            <p style={{ margin: 0 }} dangerouslySetInnerHTML={{ __html: item.text }} />
            {item.testIds && item.testIds.length > 0 && (
              <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>
                <small>
                  <i>Verified by test(s): <span className="claim-tag">[{item.testIds.join("], [")}]</span></i>
                </small>
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };


  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass-panel modal-content doc-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100vw',
          height: '100vh',
          borderRadius: 0,
        }}
      >
        <div className="modal-header">
          <h2>User Manual</h2>
          <button className="glass-button" onClick={onClose}>&times;</button>
        </div>
        <div className="doc-content" style={{ overflowY: 'auto', flexGrow: 1, padding: '0 1rem' }}>
          {currentItems.map(renderItem)}

          {deprecatedHeader && (
            <h3
              key={deprecatedHeader.id}
              onClick={() => setDeprecatedCollapsed(v => !v)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}
            >
              {deprecatedHeader.text}
              <span style={{ fontSize: '12px', opacity: 0.6 }}>{deprecatedCollapsed ? "▼" : "▲"}</span>
            </h3>
          )}
          {!deprecatedCollapsed && deprecatedClaims.map(renderItem)}

        </div>
        <div className="modal-actions">
          <button className="glass-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
