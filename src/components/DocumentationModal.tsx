import React, { useEffect, useState } from "react";

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetch("/src/public/data/Documentation.md")
        .then(res => res.text())
        .then(text => setContent(text))
        .catch(err => setContent("Error loading documentation."));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Simple markdown renderer for tags
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      // Basic [UX-1] tag replacement
      const parts = line.split(/(\[UX-\d+\])/g);
      return (
        <p key={i}>
          {parts.map((part, j) => {
            if (part.match(/\[UX-\d+\]/)) {
              return <span key={j} className="claim-tag">{part}</span>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-content doc-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Documentation</h2>
          <button className="glass-button" onClick={onClose}>&times;</button>
        </div>
        <div className="doc-content">
          {renderContent(content)}
        </div>
      </div>
    </div>
  );
}
