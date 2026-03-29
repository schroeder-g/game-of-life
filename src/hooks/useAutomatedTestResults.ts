import { useState, useEffect, useMemo } from "react";
import { VitestReport, AutomatedTestResult } from "../types/testing";

export interface ProcessedAutomatedTestResults {
  allTests: AutomatedTestResult[]; // All individual tests from the report
  claimStatuses: Map<string, 'pass' | 'fail' | 'skipped'>; // Aggregated status per claim ID
  summary: { total: number; passed: number; failed: number; skipped: number };
  testDate: string;
  isLoading: boolean;
  error: string | null;
}

export function useAutomatedTestResults(): ProcessedAutomatedTestResults {
  const [report, setReport] = useState<VitestReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const processedResults = useMemo(() => {
    if (isLoading || error || !report) {
      return {
        allTests: [],
        claimStatuses: new Map<string, 'pass' | 'fail' | 'skipped'>(),
        summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
        testDate: "N/A",
        isLoading,
        error,
      };
    }

    const allParsedTests: AutomatedTestResult[] = [];
    const claimIdToStatusMap = new Map<string, 'pass' | 'fail' | 'skipped'>();

    report.testResults.forEach((fileResult) => {
      fileResult.assertionResults.forEach((assertionResult) => {
        const fullTitle = assertionResult.fullName;
        const extractedClaimIds: string[] = [];
        const regex = /\[(.*?)\]/g;
        let match;
        while ((match = regex.exec(fullTitle)) !== null) {
          extractedClaimIds.push(match[1]);
        }

        // Normalize status from Vitest's 'passed'/'failed' to internal 'pass'/'fail'
        let normalizedStatus: 'pass' | 'fail' | 'skipped';
        if (assertionResult.status === 'passed') {
          normalizedStatus = 'pass';
        } else if (assertionResult.status === 'failed') {
          normalizedStatus = 'fail';
        } else {
          normalizedStatus = 'skipped';
        }

        const automatedTest: AutomatedTestResult = {
          id: fullTitle, // Unique identifier for the test instance
          title: assertionResult.title, // The display title
          claimIds: extractedClaimIds,
          status: normalizedStatus,
          narrative: normalizedStatus === "fail"
            ? assertionResult.failureMessages?.[0] || "No error message provided."
            : `${normalizedStatus} in ${(assertionResult.duration ?? 0).toFixed(2)}ms`,
        };
        allParsedTests.push(automatedTest);

        // Aggregate status for each claim ID
        extractedClaimIds.forEach(claimId => {
          const currentClaimStatus = claimIdToStatusMap.get(claimId);
          // If currentClaimStatus is 'fail', it remains 'fail'.
          // If currentClaimStatus is 'pass' and new is 'fail', it becomes 'fail'.
          // If currentClaimStatus is 'skipped' and new is 'pass', it becomes 'pass'.
          // If currentClaimStatus is 'skipped' and new is 'fail', it becomes 'fail'.
          if (!currentClaimStatus || normalizedStatus === 'fail' || (normalizedStatus === 'pass' && currentClaimStatus === 'skipped')) {
            claimIdToStatusMap.set(claimId, normalizedStatus);
          }
        });
      });
    });

    // Calculate summary based on allParsedTests
    let passedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    allParsedTests.forEach(test => {
      if (test.status === 'pass') passedCount++;
      else if (test.status === 'fail') failedCount++;
      else if (test.status === 'skipped') skippedCount++;
    });

    return {
      allTests: allParsedTests,
      claimStatuses: claimIdToStatusMap,
      summary: {
        total: allParsedTests.length,
        passed: passedCount,
        failed: failedCount,
        skipped: skippedCount,
      },
      testDate: new Date(report.startTime).toLocaleString(),
      isLoading: false,
      error: null,
    };
  }, [report, isLoading, error]);

  return processedResults;
}
