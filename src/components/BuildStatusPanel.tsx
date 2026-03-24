import { useState, useEffect } from 'react';

// Types for the build report
interface TestResult {
  status: 'failed' | 'passed';
  message: string;
  name: string; // File path
}

interface BuildReport {
  success: boolean;
  numPassedTests: number;
  numFailedTests: number;
  testResults: TestResult[];
}

// Helper to strip ANSI color codes from strings
const stripAnsi = (str: string) => str.replace(/[\u001b\u009b][[()#;?]?[0-9]{1,4}(?:;[0-9]{0,4})?[0-9A-ORZcf-nqry=><]/g, '');

const StatusPill = ({ label, count, color, backgroundColor }: { label: string, count: number, color: string, backgroundColor: string }) => {
  if (count === 0) return null;
  return (
    <span style={{
      backgroundColor,
      color,
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      marginRight: '8px'
    }}>
      {count} {label}
    </span>
  );
};

export function ImportedTestsPanel() {
  const [report, setReport] = useState<BuildReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    async function fetchBuildStatus() {
      try {
        const response = await fetch('/data/vitest-report.json');
        if (response.status === 404) {
          // File not found is a normal state (e.g., on first run), not an error.
          setReport(null);
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed to fetch build status: ${response.statusText}`);
        }
        const data: BuildReport = await response.json();
        setReport(data);
        // Default to expanded view if the build failed, otherwise collapsed.
        setIsCollapsed(data.success);
      } catch (e: any) {
        setError(e.message);
        console.error("Failed to load build status:", e);
      }
    }

    fetchBuildStatus();
  }, []);

  if (error) {
    return (
      <div className="tests-panel glass-panel" style={{ borderColor: 'orange' }}>
        <h3>Imported Tests</h3>
        <p style={{ color: 'orange' }}>Could not load build status report.</p>
      </div>
    );
  }

  if (!report) {
    return null; // Don't render anything if the report file doesn't exist.
  }

  const failedTests = report.testResults.filter(r => r.status === 'failed');

  return (
    <div className="tests-panel glass-panel" style={{ borderColor: report.success ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)' }}>
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span>
          Imported Tests: <span style={{ color: report.success ? '#4caf50' : '#f44336', fontWeight: 'bold' }}>{report.success ? 'Success' : 'Failed'}</span>
        </span>
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
      </h3>
      {!isCollapsed && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ marginBottom: '12px' }}>
            <StatusPill label="Passed" count={report.numPassedTests} color="#4caf50" backgroundColor="rgba(76, 175, 80, 0.2)" />
            <StatusPill label="Failed" count={report.numFailedTests} color="#f44336" backgroundColor="rgba(244, 67, 54, 0.2)" />
          </div>

          {failedTests.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>Errors & Failures</h4>
              {failedTests.map((test, index) => (
                <div key={index} style={{ marginBottom: '12px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', fontSize: '13px' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#f44336' }}>
                    {test.name.split('/').pop()}
                  </p>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, color: '#ddd', fontFamily: 'monospace', fontSize: '12px' }}>
                    {stripAnsi(test.message)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
