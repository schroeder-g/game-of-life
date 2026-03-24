import { useEffect, useState } from "react";
import { ManualTest } from "../types.ts";
import { type TestStatus as VitestStatus } from '../lib/testing-suite/test-report-parser';

type DisplayStatus = VitestStatus | 'not_run';

const StatusIndicator = ({ status }: { status: DisplayStatus }) => {
  const styles: React.CSSProperties = {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    userSelect: 'none',
    fontWeight: 'bold',
  };
  let content = '?';
  let color = '#888';
  let backgroundColor = 'rgba(128, 128, 128, 0.2)';

  if (status === 'skipped') {
    content = '-';
    color = '#ffab40'; // amber
    backgroundColor = 'rgba(255, 171, 64, 0.2)';
  } else if (status === 'pass') {
    content = '✓';
    color = '#4caf50';
    backgroundColor = 'rgba(76, 175, 80, 0.2)';
  } else if (status === 'fail') {
    content = '✕';
    color = '#f44336';
    backgroundColor = 'rgba(244, 67, 54, 0.2)';
  }

  return (
    <div style={{ ...styles, backgroundColor, color }}>
      {content}
    </div>
  );
};

interface AutomatedTestsPanelProps {
  manualTests: ManualTest[];
  automatedTestIds: Set<string>;
}

export function AutomatedTestsPanel({ manualTests, automatedTestIds }: AutomatedTestsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Map<string, VitestStatus>>(new Map());

  const toggleExpandedTest = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      newSet.has(testId) ? newSet.delete(testId) : newSet.add(testId);
      return newSet;
    });
  };

  useEffect(() => {
    async function fetchStatuses() {
      try {
        const response = await fetch('/data/automated-test-statuses.json');
        if (!response.ok) throw new Error('Failed to fetch test results');
        const statusesObj = await response.json();
        const statusesMap = new Map<string, VitestStatus>(Object.entries(statusesObj));
        setTestResults(statusesMap);
      } catch (error) {
        console.error("Failed to load automated test statuses:", error);
        const errorStatuses = new Map<string, VitestStatus>();
        automatedTestIds.forEach(id => errorStatuses.set(id, 'skipped'));
        setTestResults(errorStatuses);
      }
    }

    fetchStatuses();
  }, [automatedTestIds]);

  const automatedTests = manualTests.filter(test => automatedTestIds.has(test.id));

  if (automatedTests.length === 0) {
    return null;
  }

  return (
    <div className="tests-panel glass-panel">
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Automated Tests
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
      </h3>
      {!isCollapsed && automatedTests.map((test) => {
        const isExpanded = expandedTests.has(test.id);
        const status: DisplayStatus = testResults.get(test.id) || 'not_run';
        return (
          <div key={test.id} className="test-item-container" style={{ marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StatusIndicator status={status} />
              <span className="test-id" style={{ flexShrink: 0 }}>[{test.id}]</span>
            </div>
            <div
              onClick={() => toggleExpandedTest(test.id)}
              style={{
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginTop: '4px', paddingLeft: '28px',
              }}
            >
              <span style={{ flex: 1, fontWeight: 'normal' }}>{test.title}</span>
              <span style={{ fontSize: '12px', opacity: 0.6, marginLeft: '8px' }}>
                {isExpanded ? "▲" : "▼"}
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
  );
}
