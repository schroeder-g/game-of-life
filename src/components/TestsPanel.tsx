import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DOCUMENTATION_CONTENT } from "../data/documentation";
import { MANUAL_TESTS } from "../data/manual-tests";
import { useClickOutside } from "../hooks/useClickOutside";
import { useManualTests } from "../hooks/useManualTests";

const claimTextMap = new Map<string, string>();
DOCUMENTATION_CONTENT.forEach(item => {
  // Remove HTML tags and deprecated notices for clean tooltip text
  const cleanText = item.text
    .replace(/<[^>]*>/g, '') // strip html tags
    .replace(/\[DEPRECATED[^\]]*\]\s*/, ''); // strip deprecated prefix
  claimTextMap.set(item.id, cleanText);
});

// A component for our custom 3-state checkbox
const ThreeStateCheckbox = ({ status, onClick }: { status: 'checked' | 'failed' | undefined, onClick: () => void }) => {
  const styles: React.CSSProperties = {
    width: '16px',
    height: '16px',
    border: '1px solid #888',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    userSelect: 'none',
  };

  let content = null;
  if (status === 'checked') {
    content = <span style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '14px', lineHeight: '1' }}>✓</span>;
  } else if (status === 'failed') {
    content = <span style={{ color: '#f44336', fontWeight: 'bold', fontSize: '14px', lineHeight: '1' }}>✕</span>;
  }

  return (
    <div style={styles} onClick={onClick}>
      {content}
    </div>
  );
};

export function TestsPanel() {
  const { testStatuses, cycleTestStatus } = useManualTests();
  const [activeTooltip, setActiveTooltip] = useState<{ id: string; x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const toggleExpandedTest = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useClickOutside(tooltipRef, (event) => {
    if ((event.target as HTMLElement).closest('.claim-link')) {
      return;
    }
    setActiveTooltip(null);
  });

  return (
    <>
      <div className="tests-panel glass-panel">
        <h3
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          Manual Tests
          <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
        </h3>
        {!isCollapsed && MANUAL_TESTS.map((test) => {
          const isExpanded = expandedTests.has(test.id);
          return (
            <div key={test.id} className="test-item-container" style={{ marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="test-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ThreeStateCheckbox
                  status={testStatuses.get(test.id)}
                  onClick={() => cycleTestStatus(test.id)}
                />

                <span className="test-id" style={{ flexShrink: 0 }}>[{test.id}]</span>

                <div className="claim-links" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {test.claimIds.map((claimId) => (
                    <span
                      key={claimId}
                      className="claim-link"
                      style={{ cursor: 'pointer', color: '#a5d6ff', textDecoration: 'underline dotted 1px' }}
                      onClick={(e) => {
                        if (activeTooltip && activeTooltip.id === claimId) {
                          setActiveTooltip(null);
                        } else {
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          setActiveTooltip({ id: claimId, x: rect.right + 5, y: rect.top });
                        }
                      }}
                    >
                      {claimId}
                    </span>
                  ))}
                </div>

                <span onClick={() => toggleExpandedTest(test.id)} style={{ cursor: 'pointer', flex: 1, marginLeft: '4px' }}>
                  {test.title}
                </span>
              </div>
              {isExpanded && (
                <div className="test-steps" style={{ paddingLeft: '28px', marginTop: '8px', fontSize: '13px', color: '#ccc' }}>
                  <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc' }}>
                    {test.steps.map((step, index) => (
                      <li key={index} dangerouslySetInnerHTML={{ __html: step }} style={{ marginBottom: '4px' }} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isClient && activeTooltip && createPortal(
        <div
          ref={tooltipRef}
          className="tooltip-popup"
          style={{
            position: 'fixed',
            top: `${activeTooltip.y}px`,
            left: `${activeTooltip.x}px`,
            background: 'rgba(40, 40, 44, 0.97)',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '12px',
            maxWidth: '600px',
            zIndex: 1001,
          }}
        >
          {claimTextMap.get(activeTooltip.id)}
        </div>,
        document.body
      )}
    </>
  );
}
