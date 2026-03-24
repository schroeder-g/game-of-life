import { useEffect, useState } from "react";
import { ManualTest } from "../types.ts";

type TestStatus = 'pass' | 'fail' | 'skipped';

// ... (Vitest report interfaces are unchanged)
interface VitestTest { name: string; status: TestStatus; }
interface VitestSuite { name: string; suites: VitestSuite[]; tests: VitestTest[]; }
interface VitestFileResult { suites: VitestSuite[]; }
interface VitestReport { testResults: VitestFileResult[]; }

// ... (StatusIndicator sub-component is unchanged)
const StatusIndicator = ({ status }: { status: TestStatus | 'not_run' }) => {
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

  if (status === 'pass') {
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

// ... (parseVitestReport function is unchanged)
function parseVitestReport(report: VitestReport): Map<string, TestStatus> {
  const results = new Map<string, TestStatus>();
  const idRegex = /\[([A-Z]{2,3}-\d+)\]/g;

  function getSuiteStatus(suite: VitestSuite): TestStatus {
    if (suite.tests.some(t => t.status === 'fail')) return 'fail';
    for (const subSuite of suite.suites) {
      if (getSuiteStatus(subSuite) === 'fail') return 'fail';
    }
    return 'pass';
  }

  function processSuite(suite: VitestSuite) {
    const suiteName = suite.name;
    const matches = [...suiteName.matchAll(idRegex)];
    if (matches.length > 0) {
      const suiteStatus = getSuiteStatus(suite);
      for (const match of matches) {
        const testId = match[1];
        if (results.get(testId) !== 'fail') {
          results.set(testId, suiteStatus);
        }
      }
    }
    suite.suites.forEach(processSuite);
  }

  report.testResults.forEach(fileResult => {
    fileResult.suites.forEach(processSuite);
  });
  return results;
}

interface AutomatedTestsPanelProps {
  manualTests: ManualTest[];
  automatedTestIds: Set<string>;
  reportUrl?: string;
}

export function AutomatedTestsPanel({ manualTests, automatedTestIds, reportUrl = '/automated-test-results.json' }: AutomatedTestsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Map<string, TestStatus>>(new Map());

  const toggleExpandedTest = (testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      newSet.has(testId) ? newSet.delete(testId) : newSet.add(testId);
      return newSet;
    });
  };

  useEffect(() => {
    fetch(reportUrl)
      .then(res => {
        if (!res.ok) throw new Error("File not found");
        return res.json();
      })
      .then((report: VitestReport) => {
        setTestResults(parseVitestReport(report));
      })
      .catch(err => {
        console.warn("Could not load or parse automated test results:", err);
      });
  }, [reportUrl]);

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
        const status = testResults.get(test.id) || 'not_run';
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
