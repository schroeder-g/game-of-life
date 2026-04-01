import { Fragment, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { DOCUMENTATION_CONTENT, DOCUMENTATION_INDEX_GROUPS } from "../data/documentation/_Documentation";
import { useManualTests } from "../hooks/useManualTests";
import { CheckCircle, XCircle, Circle } from 'lucide-react';
import { useAutomatedTestResults } from "../hooks/useAutomatedTestResults"; // Import the new hook

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentationModal({ isOpen, onClose }: DocumentationModalProps) {
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const [indexSearch, setIndexSearch] = useState("");
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

  interface IndexTreeItem {
    id: string;
    text: string;
  }

  interface GroupedIndexSection {
    title: string;
    items: IndexTreeItem[];
  }

  const generateGroupedIndex = (): GroupedIndexSection[] => {
    const grouped: GroupedIndexSection[] = [];
    const allGroupedIds = new Set<string>();

    // Process defined groups first
    DOCUMENTATION_INDEX_GROUPS.forEach(group => {
      const groupItems: IndexTreeItem[] = [];

      // Find all h3 items belonging to this group
      const relatedItems = DOCUMENTATION_CONTENT.filter(item => 
        item.type === 'h3' && item.id.startsWith(group.idPrefix) && !item.id.startsWith('deprecated-')
      );

      relatedItems.forEach(item => {
        allGroupedIds.add(item.id);
        const cleanedText = stripHtmlTags(item.text.replace(group.stripPrefix, ''));
        groupItems.push({ id: item.id, text: cleanedText });
      });

      if (groupItems.length > 0) {
        grouped.push({ title: group.title, items: groupItems });
      }
    });

    // Main Manual Section (h3 items not in any other group)
    const mainManualItems: IndexTreeItem[] = [];

    DOCUMENTATION_CONTENT.forEach(item => {
      if (item.type === 'h3' && !item.id.startsWith('deprecated-') && !allGroupedIds.has(item.id)) {
        const cleanedText = stripHtmlTags(item.text);
        mainManualItems.push({ id: item.id, text: cleanedText });
      }
    });

    if (mainManualItems.length > 0) {
      grouped.unshift({ title: "Reference Manual", items: mainManualItems });
    }

    return grouped;
  };

  const groupedIndex = generateGroupedIndex();

  const handleIndexClick = (id: string) => {
    const el = contentRef.current?.querySelector(`#${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      // Add a brief highlight
      el.classList.add('highlight-flash');
      setTimeout(() => el.classList.remove('highlight-flash'), 2000);
    }
    setIsIndexOpen(false);
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
                  {item.references.map((ref: string, index: number) => (
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
    <>
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
              <button className="glass-button" onClick={() => setIsIndexOpen(true)} style={{ marginRight: '8px' }}>Index</button>
              <button className="glass-button" onClick={onClose}>&times;</button>
            </div>
          </div>
        <div ref={contentRef} className="doc-content" style={{ overflowY: 'auto', flexGrow: 1, padding: '0 1.5rem 1rem' }}>
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
          <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'flex-end', paddingRight: '1.5rem' }}>
            <button className="glass-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
      <IndexModal 
        isOpen={isIndexOpen} 
        onClose={() => setIsIndexOpen(false)} 
        data={groupedIndex}
        onItemClick={handleIndexClick}
        searchQuery={indexSearch}
        onSearchChange={setIndexSearch}
      />
    </>
    ,
    document.body
  );
}

function IndexModal({ 
  isOpen, 
  onClose, 
  data, 
  onItemClick,
  searchQuery,
  onSearchChange 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  data: any[]; 
  onItemClick: (id: string) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
}) {
  if (!isOpen) return null;

  const filteredData = data.map(section => ({
    ...section,
    items: section.items.filter((item: any) => 
      item.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return createPortal(
    <div className="modal-overlay index-overlay" onClick={onClose} style={{ zIndex: 2000000001 }}>
      <div 
        className="glass-panel index-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'clamp(280px, 80vw, 500px)',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <div className="modal-header" style={{ marginBottom: '1rem', border: 'none' }}>
          <h3 style={{ margin: 0, color: '#fff' }}>Documentation Index</h3>
          <button className="glass-button" onClick={onClose}>&times;</button>
        </div>

        <div className="search-container" style={{ marginBottom: '1.5rem' }}>
          <input 
            type="text" 
            placeholder="Search topics..." 
            className="coordinate-input"
            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            autoFocus
          />
        </div>

        <div className="index-tree" style={{ overflowY: 'auto', flexGrow: 1 }}>
          {filteredData.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#8b949e', marginTop: '2rem' }}>No matching topics found.</p>
          ) : (
            filteredData.map(section => (
              <div key={section.title} style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ color: '#8ab4f8', margin: '0 0 0.75rem 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {section.title}
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {section.items.map((item: any) => (
                    <li key={item.id} style={{ marginBottom: '0.5rem' }}>
                      <a 
                        href={`#${item.id}`} 
                        onClick={(e) => { e.preventDefault(); onItemClick(item.id); }}
                        style={{ color: '#fff', textDecoration: 'none', fontSize: '0.95rem', fontWeight: 500 }}
                      >
                        {item.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
