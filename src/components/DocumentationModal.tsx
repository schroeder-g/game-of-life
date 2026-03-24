import { useEffect } from "react";
import { DOCUMENTATION_CLAIMS } from "../data/documentation";

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
      <div className="glass-panel modal-content doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Project Documentation & Claims</h2>
          <button className="glass-button" onClick={onClose}>&times;</button>
        </div>
        <div className="doc-content">
          <p>This document lists the formal claims made about the application's behavior and features. Each claim is cross-referenced with one or more manual test IDs.</p>

          <div className="claims-list">
            {DOCUMENTATION_CLAIMS.map((claim) => (
              <div key={claim.id} className="claim-item">
                <p><strong>{claim.text}</strong></p>
                <p style={{marginTop: '-10px'}}>
                  <small>
                    <i>Verified by test(s): <span className="claim-tag">[{claim.testIds.join("], [")}]</span></i>
                  </small>
                </p>
              </div>
            ))}
          </div>
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
