import { Fragment, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { DOCUMENTATION_CONTENT } from "../data/documentation";
import { useManualTests } from "../hooks/useManualTests";
import { CheckCircle, XCircle, Circle } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
  const [showIndex, setShowIndex] = useState(true);
  const [deprecatedCollapsed, setDeprecatedCollapsed] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const { testStatuses } = useManualTests();

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

  const headings = DOCUMENTATION_CONTENT.filter(item => item.type === 'h3' && !item.id.startsWith('deprecated-'));

  const handleIndexClick = (id: string) => {
    const el = contentRef.current?.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const StatusIcon = ({ status }: { status: 'checked' | 'failed' | undefined }) => {
    const iconProps = { size: 14, style: { verticalAlign: 'middle', marginRight: '4px' } };
    if (status === 'checked') return <CheckCircle color="#4ade80" {...iconProps} />;
    if (status === 'failed') return <XCircle color="#f87171" {...iconProps} />;
    return <Circle color="#9ca3af" {...iconProps} />;
  };

  const renderItem = (item: any) => {
    switch (item.type) {
      case 'h3':
        return <h3 id={item.id} key={item.id} style={{ marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem' }}>{item.text}</h3>;
      case 'p':
        return (
          <div key={item.id} className="claim-item" style={{ marginBottom: '1rem', paddingLeft: '0.5rem' }}>
            <p style={{ margin: 0, lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: item.text }} />
            {item.testIds && item.testIds.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                {item.testIds.map((testId: string) => {
                  const result = testStatuses.get(testId);
                  const status = result?.status;
                  const timestamp = result?.timestamp ? new Date(result.timestamp).toLocaleDateString() : 'N/A';
                  // NOTE: Automated test results are not yet available here.
                  const isManual = testId.match(/^(UC|UX|QA|UI|CORE|DS)-/);

                  if (!isManual) return null;

                  return (
                    <div key={testId} style={{ fontSize: '12px', color: '#bbb', marginBottom: '2px' }}>
                      <StatusIcon status={status} />
                      <strong>{testId}:</strong> {status || 'untested'}
                      {result?.timestamp && ` (on ${timestamp})`}
                    </div>
                  );
                })}
              </div>
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
          <div>
            <button className="glass-button" onClick={() => setShowIndex(s => !s)} style={{ marginRight: '8px' }}>Index</button>
            <button className="glass-button" onClick={onClose}>&times;</button>
          </div>
        </div>
        <div ref={contentRef} className="doc-content" style={{ overflowY: 'auto', flexGrow: 1, padding: '0 1.5rem 1rem' }}>
          {showIndex && (
            <div className="doc-index" style={{ border: '1px solid #444', padding: '1rem', borderRadius: '4px', margin: '1rem 0' }}>
              <h4 style={{marginTop: 0}}>Index</h4>
              <ul style={{ listStyle: 'none', padding: 0, columns: 2 }}>
                {headings.map(h => (
                  <li key={h.id} style={{ marginBottom: '0.5rem' }}>
                    <a href={`#${h.id}`} onClick={(e) => {e.preventDefault(); handleIndexClick(h.id);}} style={{ color: '#a5d6ff', textDecoration: 'none' }}>{h.text}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
