import { useMemo, useState, Fragment } from "react";
import { DocItem, ManualTest, ManualTestResult } from "../types/testing";
import { useManualTests } from "../hooks/useManualTests";
import { CheckCircle, XCircle, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { DOCUMENTATION_CONTENT } from "../data/documentation";

const ClaimHint = ({ claimId }: { claimId: string }) => {
  const [showHint, setShowHint] = useState(false);
  const claim = useMemo(() => DOCUMENTATION_CONTENT.find(c => c.id === claimId), [claimId]);

  if (!claim) {
    return (
      <span style={{ color: 'red', marginRight: '4px', fontStyle: 'italic', textDecoration: 'none' }}>
        [{claimId}]
      </span>
    );
  }

  return (
    <span
      style={{ position: 'relative', marginRight: '4px' }}
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
    >
      <a href={`#${claimId}`} onClick={e => e.preventDefault()} style={{ color: '#a5d6ff', textDecoration: 'none' }}>
        [{claimId}]
      </a>
      {showHint && (
        <div style={{ position: 'absolute', bottom: '120%', left: '0', backgroundColor: '#334', border: '1px solid #556', padding: '8px', borderRadius: '4px', zIndex: 10, width: '300px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <p style={{ margin: 0, fontSize: '12px' }} dangerouslySetInnerHTML={{ __html: claim.text }} />
        </div>
      )}
    </span>
  );
};

const StatusIcon = ({ status }: { status: ManualTestResult['status'] }) => {
  const iconProps = { size: 18, style: { flexShrink: 0 } };
  if (status === 'checked') return <CheckCircle color="#4caf50" {...iconProps} />;
  if (status === 'failed') return <XCircle color="#f44336" {...iconProps} />;
  return <Circle color="#888" {...iconProps} />;
};

interface ManualTestsPanelProps {
  manualTests: ManualTest[];
  automatedTestIds: Set<string>;
  documentation: DocItem[]; // This prop is maintained for API compatibility but is not used internally.
}

export function ManualTestsPanel({ manualTests, automatedTestIds }: ManualTestsPanelProps) {
  const { testStatuses, cycleTestStatus } = useManualTests();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const toggleExpandedTest = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) newSet.delete(testId);
      else newSet.add(testId);
      return newSet;
    });
  };
  
  return (
    <div className="tests-panel glass-panel">
      <h3 onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Manual Tests
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
      </h3>
      {!isCollapsed && (
        <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', paddingRight: '8px', marginTop: '12px' }}>
          {manualTests.map((test) => {
            const isExpanded = expandedTests.has(test.id);
            return (
              <div key={test.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <div onClick={() => cycleTestStatus(test.id)}>
                    <StatusIcon status={testStatuses.get(test.id)?.status} />
                  </div>
                  <span
                    onClick={() => toggleExpandedTest(test.id)}
                    style={{ flex: 1, fontWeight: automatedTestIds.has(test.id) ? 'bold' : 'normal', userSelect: 'none' }}
                  >
                    {test.title}
                  </span>
                  <div onClick={() => toggleExpandedTest(test.id)} style={{ color: '#aaa' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ paddingLeft: '26px', marginTop: '8px', fontSize: '13px', color: '#ccc' }}>
                    <div style={{ marginBottom: '8px', fontStyle: 'italic', fontSize: '12px' }}>
                      Verifies claims:{' '}
                      {test.claimIds.map(id => <Fragment key={id}><ClaimHint claimId={id} /></Fragment>)}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {test.steps.map((step, i) => <li key={i} dangerouslySetInnerHTML={{ __html: step }} />)}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
