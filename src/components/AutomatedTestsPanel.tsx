import React, { useState, useEffect, useMemo, Fragment } from "react";
import { DocItem, ManualTest, VitestReport, VitestTest } from "../types/testing";
import { ClaimHint } from "./ClaimHint";

interface AutomatedTestsPanelProps {
  manualTests: ManualTest[];
  automatedTestIds: Set<string>;
  documentation: DocItem[];
}

interface AutomatedTestResult {
  id: string;
  title: string;
  claimIds: string[];
  status: "pass" | "fail" | "skipped";
  narrative: string;
}

export function AutomatedTestsPanel({
  manualTests,
  automatedTestIds,
  documentation,
}: AutomatedTestsPanelProps) {
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
        const response = await fetch("/automated-test-results.json");
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
    if (!report) {
      const summary = { total: automatedTestIds.size, passed: 0, failed: 0, skipped: automatedTestIds.size };
      return { testResults: [], summary, testDate: "N/A" };
    }

    // Parse the Jest-style test report.
    const allParsedTests: VitestTest[] = [];
    (report as any).testResults.forEach((fileResult: any) => {
      if (fileResult.assertionResults) {
        fileResult.assertionResults.forEach((assertion: any) => {
          const fullTitle = [...(assertion.ancestorTitles || []), assertion.title].join(' ');
          const extractedClaimIds: string[] = [];
          const regex = /\[(.*?)\]/g;
          let match;
          while ((match = regex.exec(fullTitle)) !== null) {
            extractedClaimIds.push(match[1]);
          }

          allParsedTests.push({
            name: fullTitle, // Use fullTitle as the unique identifier for the test instance
            fullTitle: assertion.title, // The display title
            claimIds: extractedClaimIds, // Store all extracted claim IDs
            status: assertion.status === "passed" ? "pass" : assertion.status,
            duration: assertion.duration,
            errors: assertion.failureMessages?.map((msg: string) => ({ message: msg })) || [],
          });
        });
      }
    });

    const finalTestResultsMap = new Map<string, AutomatedTestResult>();

    // 1. Add tests from automatedTestIds (expected claims)
    automatedTestIds.forEach(expectedClaimId => {
      const matchingTests = allParsedTests.filter(pt => pt.claimIds?.includes(expectedClaimId));

      if (matchingTests.length > 0) {
        matchingTests.forEach(parsedTest => {
          const manualTest = manualTests.find(mt => mt.id === expectedClaimId);
          const title = manualTest ? manualTest.title : parsedTest.fullTitle.replace(/\[.*?\]\s*/g, "").trim();

          finalTestResultsMap.set(parsedTest.name, {
            id: parsedTest.name, // Unique fullTitle
            title: title,
            claimIds: parsedTest.claimIds || [],
            status: parsedTest.status as "pass" | "fail" | "skipped",
            narrative: parsedTest.status === "fail"
              ? parsedTest.errors?.[0]?.message || "No error message provided."
              : `${parsedTest.status} in ${(parsedTest.duration ?? 0).toFixed(2)}ms`,
          });
        });
      } else {
        // If an expected claim ID has no matching test in the report, mark it as skipped
        const manualTest = manualTests.find(mt => mt.id === expectedClaimId);
        const title = manualTest ? manualTest.title : `(Orphaned) ${expectedClaimId}`;
        finalTestResultsMap.set(`skipped-${expectedClaimId}`, { // Ensure unique key for skipped items
          id: `skipped-${expectedClaimId}`,
          title: title,
          claimIds: [expectedClaimId],
          status: "skipped",
          narrative: `Test for claim ID "${expectedClaimId}" not found in report.`,
        });
      }
    });

    // 2. Add tests from the report that are not associated with any automatedTestIds (untracked)
    allParsedTests.forEach(parsedTest => {
      const isTracked = parsedTest.claimIds?.some(claimId => automatedTestIds.has(claimId));
      if (!isTracked && !finalTestResultsMap.has(parsedTest.name)) {
        const title = `(Untracked) ${parsedTest.fullTitle.replace(/\[.*?\]\s*/g, "").trim()}`;

        finalTestResultsMap.set(parsedTest.name, {
          id: parsedTest.name,
          title: title,
          claimIds: parsedTest.claimIds || [],
          status: parsedTest.status as "pass" | "fail" | "skipped",
          narrative: parsedTest.status === "fail"
            ? parsedTest.errors?.[0]?.message || "No error message provided."
            : `${parsedTest.status} in ${(parsedTest.duration ?? 0).toFixed(2)}ms`,
        });
      }
    });

    const combinedResults = Array.from(finalTestResultsMap.values()).sort((a, b) => a.title.localeCompare(b.title));
    const passed = combinedResults.filter((r) => r.status === "pass").length;
    const failed = combinedResults.filter((r) => r.status === "fail").length;
    const skipped = combinedResults.filter((r) => r.status === "skipped").length;

    return {
      testResults: combinedResults,
      summary: { total: combinedResults.length, passed, failed, skipped },
      testDate: new Date(report.startTime).toLocaleString(),
    };
  }, [report, manualTests, automatedTestIds, documentation]);

  if (isLoading) {
    return <div className="automated-tests-panel-status">Loading automated test report...</div>;
  }

  if (error) {
    return <div className="automated-tests-panel-status error">{error}</div>;
  }

  return (
    <section className="menu-section">
      <div className={`${isCollapsed ? "collapsed" : ""}`}>
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
                  <summary style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-indicator ${test.status}`} style={{ flexShrink: 0 }}>
                      {test.status === "pass" ? "✔" : test.status === "fail" ? "✖" : "○"}
                    </span>
                    <div className="test-title" style={{ flexGrow: 1 }}>{test.title}</div>
                    {test.claimIds.length > 0 && (
                      <span className="claim-id-tags" style={{ flexShrink: 0, marginLeft: 'auto' }}>
                        {test.claimIds.map(id => <Fragment key={id}><ClaimHint claimId={id} /></Fragment>)}
                      </span>
                    )}
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
      </div></section >
  );
}
