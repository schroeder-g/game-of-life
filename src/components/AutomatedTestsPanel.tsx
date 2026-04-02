// @documentation-skip
import React, { useState, Fragment } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { DocItem, ManualTest } from "../types/testing"; // Removed AutomatedTestResult
import { ClaimHint } from "./ClaimHint";
import { useAutomatedTestResults } from "../hooks/useAutomatedTestResults"; // Import the new hook

interface AutomatedTestsPanelProps {
  manualTests: ManualTest[];
  automatedTestIds: Set<string>;
  documentation: DocItem[];
}

export function AutomatedTestsPanel({
  manualTests,
  automatedTestIds,
  documentation,
}: AutomatedTestsPanelProps) {
  const [isCollapsed, setIsCollapsed] = usePersistentState("gol_collapse_automated_tests", false);
  const { allTests, summary, testDate, isLoading, error } = useAutomatedTestResults(); // Use the new hook

  if (isLoading) {
    return <div className="automated-tests-panel-status">Loading automated test report...</div>;
  }

  if (error) {
    return <div className="automated-tests-panel-status error">{error}</div>;
  }

  return (
    <section className="menu-section">
      <div className={`${isCollapsed ? "collapsed" : ""}`}>
        <h3 onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Automated Tests
          <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
        </h3>
        {!isCollapsed && (
          <div className="panel-content">
            <div className="panel-info">
              <strong>Last Run:</strong> {testDate}
            </div>
            <div className="tests-list">
              {allTests.map((test) => ( // Iterate over allTests from the hook
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
