import { useEffect } from "react";
import { DOCUMENTATION_CONTENT } from "../data/documentation";

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
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

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content doc-modal" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div className="modal-header">
          <h2>User Manual</h2>
          <button className="glass-button" onClick={onClose}>&times;</button>
        </div>
        <div className="doc-content" style={{ overflowY: 'auto', flexGrow: 1, padding: '0 1rem' }}>
          {DOCUMENTATION_CONTENT.map((item) => {
            switch (item.type) {
              case 'h3':
                return <h3 key={item.id} style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>{item.text}</h3>;
              case 'p':
                return (
                  <div key={item.id} className="claim-item" style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: 0 }}>{item.text}</p>
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
          })}
        </div>
        <div className="modal-actions">
          <button className="glass-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
