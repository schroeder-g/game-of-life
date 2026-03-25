import { Fragment, useEffect, useState } from "react";
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

  // This effect is no longer needed as we are not hiding the root element
  // useEffect(() => { ... });

  if (!isOpen) {
    return null;
  }
  
  // Separate current and deprecated content
  const currentItems = DOCUMENTATION_CONTENT.filter(item => !item.id.startsWith('deprecated-') && item.id !== 'heading-deprecated');
  const deprecatedItems = DOCUMENTATION_CONTENT.filter(item => item.id.startsWith('deprecated-') || item.id === 'heading-deprecated');
  const deprecatedHeader = deprecatedItems.find(item => item.id === 'heading-deprecated');
  const deprecatedClaims = deprecatedItems.filter(item => item.id !== 'heading-deprecated');

  const renderItem = (item: any) => {
    switch (item.type) {
      case 'h3':
        return <h3 key={item.id} style={{ marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem' }}>{item.text}</h3>;
      case 'p':
        return (
          <div key={item.id} className="claim-item" style={{ marginBottom: '1rem', paddingLeft: '0.5rem' }}>
            <p style={{ margin: 0, lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: item.text }} />
            {item.testIds && item.testIds.length > 0 && (
              <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>
                <small style={{ color: '#aaa', fontStyle: 'italic' }}>
                  Verified by test(s): <span className="claim-tag" style={{ backgroundColor: 'rgba(0,100,200,0.3)', padding: '2px 6px', borderRadius: '4px', fontStyle: 'normal', color: '#a5d6ff' }}>[{item.testIds.join("], [")}]</span>
                </small>
              </p>
            )}
            {item.references && item.references.length > 0 && (
              <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>
                <small style={{ color: '#aaa', fontStyle: 'italic' }}>
                  References:{' '}
                  {item.references.map((ref, index) => (
                    <Fragment key={index}>
                      <code
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          padding: '2px 5px',
                          borderRadius: '3px',
                          fontStyle: 'normal',
                          color: '#ccc',
                        }}
                      >{ref}</code>
                      {index < item.references.length - 1 ? ', ' : ''}
                    </Fragment>
                  ))}
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
          width: 'clamp(300px, 90vw, 800px)', // Responsive width
          maxHeight: '85vh', // Limit height
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div className="modal-header">
          <h2>User Manual</h2>
          <button className="glass-button" onClick={onClose}>&times;</button>
        </div>
        <div className="doc-content" style={{ overflowY: 'auto', flexGrow: 1, padding: '0 1.5rem 1rem' }}>
          {currentItems.map(renderItem)}

          {deprecatedHeader && (
            <h3
              key={deprecatedHeader.id}
              onClick={() => setDeprecatedCollapsed(v => !v)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem' }}
            >
              {deprecatedHeader.text}
              <span style={{ fontSize: '12px', opacity: 0.6 }}>{deprecatedCollapsed ? "▼" : "▲"}</span>
            </h3>
          )}
          {!deprecatedCollapsed && deprecatedClaims.map(renderItem)}

        </div>
        <div className="modal-actions" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
          <button className="glass-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
