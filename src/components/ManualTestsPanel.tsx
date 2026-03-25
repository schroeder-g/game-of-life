import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "../hooks/useClickOutside";
import { DocItem, ManualTest, ManualTestStatus } from "../types/testing";

// --- Internal Hook Logic (from useManualTests.ts) ---

const STORAGE_KEY = "manual-tests-statuses";

function loadTestStatuses(): Map<string, ManualTestStatus> {
  if (typeof window === "undefined") {
    return new Map();
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const newMap = new Map<string, ManualTestStatus>();
        parsed.forEach(id => newMap.set(id, 'checked'));
        return newMap;
      }
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error("Failed to load manual test statuses:", error);
  }
  return new Map();
}

function saveTestStatuses(statuses: Map<string, ManualTestStatus>) {
  if (typeof window === "undefined") return;
  try {
    const obj = Object.fromEntries(statuses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    if (localStorage.getItem("manual-tests-checked")) {
      localStorage.removeItem("manual-tests-checked");
    }
  } catch (error) {
    console.error("Failed to save manual test statuses:", error);
  }
}

function useManualTests() {
  const [testStatuses, setTestStatuses] = useState<Map<string, ManualTestStatus>>(new Map());

  useEffect(() => {
    setTestStatuses(loadTestStatuses());
  }, []);

  const cycleTestStatus = useCallback((testId: string) => {
    setTestStatuses((prev) => {
      const newMap = new Map(prev);
      const currentStatus = newMap.get(testId);

      if (currentStatus === 'checked') {
        newMap.set(testId, 'failed');
      } else if (currentStatus === 'failed') {
        newMap.delete(testId);
      } else { // currentStatus is undefined
        newMap.set(testId, 'checked');
      }

      saveTestStatuses(newMap);
      return newMap;
    });
  }, []);

  return { testStatuses, cycleTestStatus };
}

// --- End of Internal Hook Logic ---


const ThreeStateCheckbox = ({ status, onClick }: { status: ManualTestStatus | undefined, onClick: () => void }) => {
  const styles: React.CSSProperties = {
    width: '16px', height: '16px', border: '1px solid #888', borderRadius: '3px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    flexShrink: 0, backgroundColor: 'rgba(255, 255, 255, 0.1)', userSelect: 'none',
  };
  let content = null;
  if (status === 'checked') content = <span style={{ color: '#4caf50', fontWeight: 'bold' }}>✓</span>;
  else if (status === 'failed') content = <span style={{ color: '#f44336', fontWeight: 'bold' }}>✕</span>;
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
      if (newSet.has(testId)) newSet.delete(testId);
      else newSet.add(testId);
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
        transform: 'translateX(0)',
      });
    } else {
      setPopupStyle(prev => ({ ...prev, opacity: 0, transform: 'translateX(-20px)', visibility: 'hidden' }));
    }
  }, [activeTooltip, claimTextMap]);

  useClickOutside(tooltipRef, (e) => {
    if ((e.target as HTMLElement).closest('.claim-link,.tests-panel')) return;
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
                        const itemRow = (e.target as HTMLElement).closest('.test-item-container');
                        const panel = panelRef.current;
                        if (!itemRow || !panel) return;
                        const panelRect = panel.getBoundingClientRect();
                        const itemRect = itemRow.getBoundingClientRect();
                        setActiveTooltip(activeTooltip?.id === claimId ? null : {
                          id: claimId, x: panelRect.right + 5, y: itemRect.top, minHeight: itemRect.height
                        });
                      }}
                    >{claimId}</span>
                  ))}
                </div>
              </div>
              <div onClick={() => toggleExpandedTest(test.id)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingLeft: '28px' }}>
                <span style={{ flex: 1, fontWeight: automatedTestIds.has(test.id) ? 'bold' : 'normal' }}>
                  {test.title}
                </span>
                <span style={{ fontSize: "12px", opacity: 0.6 }}>{isExpanded ? "▲" : "▼"}</span>
              </div>
              {isExpanded && (
                <div style={{ paddingLeft: '28px', marginTop: '8px', fontSize: '13px', color: '#ccc' }}>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {test.steps.map((step, i) => <li key={i} dangerouslySetInnerHTML={{ __html: step }} />)}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {isClient && createPortal(<div ref={tooltipRef} style={popupStyle}>{popupContent.current}</div>, document.body)}
    </>
  );
}
