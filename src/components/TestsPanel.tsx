import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "../hooks/useClickOutside";
import { useManualTests } from "../hooks/useManualTests";
import { DocItem, ManualTest, ManualTestStatus } from "../types/testing";

const ThreeStateCheckbox = ({ status, onClick }: { status: ManualTestStatus | undefined, onClick: () => void }) => {
  const styles: React.CSSProperties = {
    width: '16px', height: '16px', border: '1px solid #888', borderRadius: '3px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    flexShrink: 0, backgroundColor: 'rgba(255, 255, 255, 0.1)', userSelect: 'none',
  };
  let content = null;
  if (status === 'checked') content = <span style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '14px', lineHeight: '1' }}>✓</span>;
  else if (status === 'failed') content = <span style={{ color: '#f44336', fontWeight: 'bold', fontSize: '14px', lineHeight: '1' }}>✕</span>;
  return <div style={styles} onClick={onClick}>{content}</div>;
};

interface ManualTestsPanelProps {
  manualTests: ManualTest[];
  automatedTestIds: Set<string>;
  documentation: DocItem[];
}

export function ManualTestsPanel({ manualTests, automatedTestIds, documentation }: ManualTestsPanelProps) {
  const { testStatuses, cycleTestStatus } = useManualTests();
  const [activeTooltip, setActiveTooltip] = useState<{ id: string; x: number; y: number; minHeight: number; } | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const popupContent = useRef('');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const claimTextMap = useMemo(() => {
    const map = new Map<string, string>();
    documentation.forEach(item => {
      const cleanText = item.text.replace(/<[^>]*>/g, '').replace(/\[DEPRECATED[^\]]*\]\s*/, '');
      map.set(item.id, cleanText);
    });
    return map;
  }, [documentation]);

  const toggleExpandedTest = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      newSet.has(testId) ? newSet.delete(testId) : newSet.add(testId);
      return newSet;
    });
  };

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (activeTooltip) {
      popupContent.current = claimTextMap.get(activeTooltip.id) || 'Claim not found.';
      setPopupStyle({
        position: 'fixed', top: `${activeTooltip.y}px`, left: `${activeTooltip.x}px`,
        minHeight: `${activeTooltip.minHeight}px`, background: 'rgba(40, 40, 44, 0.97)',
        border: '1px solid #555', borderRadius: '4px', padding: '12px',
        maxWidth: '600px', zIndex: 1001, opacity: 1, visibility: 'visible',
        transform: 'translateX(0)', transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
      });
    } else {
      setPopupStyle(prev => ({
        ...prev, opacity: 0, transform: 'translateX(-20px)', visibility: 'hidden',
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out, visibility 0s 0.2s',
      }));
    }
  }, [activeTooltip, claimTextMap]);

  useClickOutside(tooltipRef, (event) => {
    if ((event.target as HTMLElement).closest('.claim-link,.tests-panel')) return;
    setActiveTooltip(null);
  });

  return (
    <>
      <div ref={panelRef} className="tests-panel glass-panel">
        <h3 onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Manual Tests
          <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
        </h3>
        {!isCollapsed && manualTests.map((test) => {
          const isExpanded = expandedTests.has(test.id);
          return (
            <div key={test.id} className="test-item-container" style={{ marginBottom: '8px', marginTop: '20px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ThreeStateCheckbox status={testStatuses.get(test.id)} onClick={() => cycleTestStatus(test.id)} />
                <span className="test-id" style={{ flexShrink: 0 }}>[{test.id}]</span>
                <div className="claim-links" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {test.claimIds.map((claimId) => (
                        <span key={claimId} className="claim-link" style={{ cursor: 'pointer', color: '#a5d6ff', textDecoration: 'underline dotted 1px' }}
                          onClick={(e) => {
                            if (activeTooltip && activeTooltip.id === claimId) {
                              setActiveTooltip(null);
                            } else {
                              const itemRow = (e.target as HTMLElement).closest('.test-item-container');
                              const panel = panelRef.current;
                              if (!itemRow || !panel) return;
                              const panelRect = panel.getBoundingClientRect();
                              const itemRect = itemRow.getBoundingClientRect();
                              setActiveTooltip({ id: claimId, x: panelRect.right + 5, y: itemRect.top, minHeight: itemRect.height });
                            }
                          }}
                        >{claimId}</span>
                      ))}
                </div>
              </div>
              <div onClick={() => toggleExpandedTest(test.id)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingLeft: '28px' }}>
                <span style={{ flex: 1, fontWeight: automatedTestIds.has(test.id) ? 'bold' : 'normal' }}>{test.title}</span>
                <span style={{ fontSize: '12px', opacity: 0.6, marginLeft: '8px' }}>{isExpanded ? "▲" : "▼"}</span>
              </div>
              {isExpanded && (
                <div className="test-steps" style={{ paddingLeft: '28px', marginTop: '8px', fontSize: '13px', color: '#ccc' }}>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {test.steps.map((step, index) => <li key={index} dangerouslySetInnerHTML={{ __html: step }} />)}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div >
      {isClient && createPortal(<div ref={tooltipRef} style={popupStyle}>{popupContent.current}</div>, document.body)}
    </>
  );
}
