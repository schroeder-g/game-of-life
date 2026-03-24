import React, { useState, useEffect, useMemo } from "react";
import { ManualTest } from "./types";
import { VitestReport, VitestTest, VitestSuite } from "./test-report-parser";

interface AutomatedTestsPanelProps {
  manualTests: ManualTest[];
  automatedTestIds: string[];
}

interface AutomatedTestResult {
  id: string;
  title: string;
  status: "pass" | "fail" | "skipped";
  narrative: string;
}

export function AutomatedTestsPanel({ manualTests, automatedTestIds }: AutomatedTestsPanelProps) {
  const [report, setReport] = useState<VitestReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth <= 768;
    }
    return false; // Default to open on larger screens
  });

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch("/data/vitest-report.json");
        if (!response.ok) {
          throw new Error(`Test report not found or failed to load (status: ${response.status})`);
        }
        const data = await response.json();
        setReport(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(`Automated Tests: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, []);

  const { testResults, summary, testDate } = useMemo(() => {
    const totalTests = automatedTestIds.length;
    if (!report) {
      const summary = { total: totalTests, passed: 0, failed: 0, skipped: totalTests };
      return { testResults: [], summary, testDate: "N/A" };
    }

    const allVitestTests: VitestTest[] = [];
    const collectTests = (suite: VitestSuite) => {
      suite.tests.forEach((test: VitestTest) => allVitestTests.push(test));
      suite.suites.forEach(collectTests);
    };
    report.testResults.forEach((fileResult) => {
      fileResult.suites.forEach(collectTests);
    });

    const results: AutomatedTestResult[] = automatedTestIds.map((testId) => {
      const manualTest = manualTests.find((mt) => mt.id === testId);
      const vitestTest = allVitestTests.find((vt) => vt.name === testId);
      const title = manualTest ? manualTest.title : "Unknown Test";

      if (!vitestTest) {
        return {
          id: testId,
          title,
          status: "skipped",
          narrative: "Test not found in report. It may have been skipped or is misconfigured.",
        };
      }

      const narrative =
        vitestTest.status === "fail"
          ? vitestTest.errors?.[0]?.messageStack ||
            vitestTest.errors?.[0]?.message ||
            "No error message provided."
          : `${vitestTest.status} in ${(vitestTest.duration ?? 0).toFixed(2)}ms`;

      return { id: testId, title, status: vitestTest.status, narrative };
    });

    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const skipped = totalTests - passed - failed;

    return {
      testResults: results,
      summary: { total: totalTests, passed, failed, skipped },
      testDate: new Date(report.startTime).toLocaleString(),
    };
  }, [report, manualTests, automatedTestIds]);

  if (isLoading) {
    return <div className="automated-tests-panel-status">Loading automated test report...</div>;
  }

  if (error) {
    return <div className="automated-tests-panel-status error">{error}</div>;
  }

  return (
    <div className={`automated-tests-panel glass-panel ${isCollapsed ? "collapsed" : ""}`}>
      <header className="panel-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>Automated Test Results</h3>
        <span className="collapse-toggle">{isCollapsed ? "▼" : "▲"}</span>
      </header>
      {!isCollapsed && (
        <div className="panel-content">
          <div className="panel-info">
            <strong>Last Run:</strong> {testDate}
          </div>
          <div className="tests-list">
            {testResults.map((test) => (
              <details key={test.id} className={`test-item-details ${test.status}`}>
                <summary>
                  <span className={`status-indicator ${test.status}`}>
                    {test.status === "pass" ? "✔" : test.status === "fail" ? "✖" : "○"}
                  </span>
                  <span className="test-title">{test.title}</span>
                  <span className="test-id">({test.id})</span>
                </summary>
                <div className="test-narrative">
                  <pre>
                    <code>{test.narrative}</code>
                  </pre>
                </div>
              </details>
            ))}
          </div>
          <footer className="panel-footer">
            <strong>Summary:</strong> {summary.passed} Passed, {summary.failed} Failed, {summary.skipped} Skipped
            ({summary.total} Total)
          </footer>
        </div>
      )}
    </div>
  );
}
