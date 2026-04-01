import { Fragment, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { DOCUMENTATION_CONTENT } from "../data/documentation/_Documentation";
import { useManualTests } from "../hooks/useManualTests";
import { CheckCircle, XCircle, Circle } from 'lucide-react';
import { useAutomatedTestResults } from "../hooks/useAutomatedTestResults"; // Import the new hook

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
  const [showIndex, setShowIndex] = useState(true);
  const [deprecatedCollapsed, setDeprecatedCollapsed] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const { testStatuses: manualTestStatuses } = useManualTests(); // Rename to avoid conflict
  const { claimStatuses: automatedClaimStatuses, isLoading: isLoadingAutomatedTests, error: automatedTestsError, testDate: automatedReportDate } = useAutomatedTestResults(); // Use the new hook

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

  // Separate current and deprecated content
  const currentItems = DOCUMENTATION_CONTENT.filter(item => !item.id.startsWith('deprecated-') && item.id !== 'heading-deprecated');
  const deprecatedItems = DOCUMENTATION_CONTENT.filter(item => item.id.startsWith('deprecated-') || item.id === 'heading-deprecated');
  const deprecatedHeader = deprecatedItems.find(item => item.id === 'heading-deprecated');
  const deprecatedClaims = deprecatedItems.filter(item => item.id !== 'heading-deprecated');

  const stripHtmlTags = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  interface IndexHeadingItem {
    id: string;
    text: string;
  }

  interface GroupedIndexSection {
    title: string;
    items: IndexHeadingItem[];
  }

  const generateGroupedIndex = (): GroupedIndexSection[] => {
    const grouped: GroupedIndexSection[] = [];

    // Main Manual Section
    const mainManualItems: IndexHeadingItem[] = DOCUMENTATION_CONTENT
      .filter(item => item.type === 'h3' && !item.id.startsWith('deprecated-') && !item.id.startsWith('BC_'))
      .map(item => ({ id: item.id, text: stripHtmlTags(item.text) }));

    if (mainManualItems.length > 0) {
      grouped.push({ title: "Main Manual", items: mainManualItems });
    }

    // Brush Controls Section
    const brushControlsPrefix = "<b>Brush Controls Panel ";
    const brushControlsItems: IndexHeadingItem[] = DOCUMENTATION_CONTENT
      .filter(item => item.type === 'h3' && item.id.startsWith('BC_') && !item.id.startsWith('deprecated-'))
      .map(item => {
        let text = item.text;
        // Remove the prefix, case-insensitively and handling bold tags
        const cleanedText = text.replace(brushControlsPrefix, '');
        return { id: item.id, text: stripHtmlTags(cleanedText) };
      });

    if (brushControlsItems.length > 0) {
      grouped.push({ title: "Brush Controls", items: brushControlsItems });
    }

    return grouped;
  };

  const groupedIndex = generateGroupedIndex();

  const handleIndexClick = (id: string) => {
    const el = contentRef.current?.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const StatusIcon = ({ status }: { status: 'checked' | 'failed' | 'pass' | 'fail' | 'skipped' | undefined }) => {
    const iconProps = { size: 14, style: { verticalAlign: 'middle', marginRight: '4px' } };
    if (status === 'checked' || status === 'pass') return <CheckCircle color="#4caf50" {...iconProps} />;
    if (status === 'failed' || status === 'fail') return <XCircle color="#f44336" {...iconProps} />;
    if (status === 'skipped') return <Circle color="#888" {...iconProps} />;
    return <Circle color="#9ca3af" {...iconProps} />;
  };

  const renderItem = (item: any) => {
    switch (item.type) {
      case 'h3':
        return <h3 id={item.id} key={item.id} style={{ marginTop: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem' }} dangerouslySetInnerHTML={{ __html: item.text }} />;
      case 'p':
        return (
          <div key={item.id} className="claim-item" style={{ marginBottom: '1rem', paddingLeft: '0.5rem' }}>
            <p style={{ margin: 0, lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: item.text }} />
            {item.testIds && item.testIds.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                {item.testIds.map((testId: string) => {
                  const manualResult = manualTestStatuses.get(testId);
                  const automatedStatus = automatedClaimStatuses.get(testId);

                  let status: 'checked' | 'failed' | 'pass' | 'fail' | 'skipped' | undefined;
                  let timestamp: string | undefined;
                  let testType: 'Manual' | 'Automated' | 'Untested' = 'Untested';

                  if (manualResult) {
                    status = manualResult.status;
                    timestamp = manualResult.timestamp ? new Date(manualResult.timestamp).toLocaleDateString() : 'N/A';
                    testType = 'Manual';
                  } else if (automatedStatus) {
                    status = automatedStatus;
                    timestamp = automatedReportDate; // Use the report's date
                    testType = 'Automated';
                  }

                  // If no status, default to 'skipped' and 'Untested'
                  if (!status) {
                    status = 'skipped';
                    testType = 'Untested';
                  }

                  return (
                    <div key={testId} style={{ fontSize: '12px', color: '#bbb', marginBottom: '2px' }}>
                      <StatusIcon status={status} />
                      <strong>{testId}:</strong> {status} ({testType})
                      {timestamp && ` (on ${timestamp})`}
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
              <h4 style={{ marginTop: 0 }}>Index</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {groupedIndex.map(section => (
                  <li key={section.title} style={{ marginBottom: '1rem' }}>
                    <strong style={{ color: '#fff' }}>{section.title}</strong>
                    <ul style={{ listStyle: 'none', paddingLeft: '1rem', columns: 2 }}>
                      {section.items.map(h => (
                        <li key={h.id} style={{ marginBottom: '0.5rem' }}>
                          <a href={`#${h.id}`} onClick={(e) => { e.preventDefault(); handleIndexClick(h.id); }} style={{ color: '#a5d6ff', textDecoration: 'none' }}>{h.text}</a>
                        </li>
                      ))}
                    </ul>
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
