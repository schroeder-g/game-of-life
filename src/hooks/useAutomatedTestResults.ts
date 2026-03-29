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
      const processSuite = (currentSuite: any, ancestorTitles: string[] = []) => {
        const newAncestorTitles = [...ancestorTitles, currentSuite.name];
        currentSuite.tests.forEach((test: any) => {
          const fullTitle = [...newAncestorTitles, test.name].join(' ');
          const extractedClaimIds: string[] = [];
          const regex = /\[(.*?)\]/g;
          let match;
          while ((match = regex.exec(fullTitle)) !== null) {
            extractedClaimIds.push(match[1]);
          }

          const automatedTest: AutomatedTestResult = {
            id: fullTitle, // Unique identifier for the test instance
            title: test.name, // The display title
            claimIds: extractedClaimIds,
            status: test.status as "pass" | "fail" | "skipped",
            narrative: test.status === "fail"
              ? test.errors?.[0]?.message || "No error message provided."
              : `${test.status} in ${(test.duration ?? 0).toFixed(2)}ms`,
          };
          allParsedTests.push(automatedTest);

          // Aggregate status for each claim ID
          extractedClaimIds.forEach(claimId => {
            const currentClaimStatus = claimIdToStatusMap.get(claimId);
            if (!currentClaimStatus || automatedTest.status === 'fail' || (automatedTest.status === 'skipped' && currentClaimStatus === 'pass')) {
              claimIdToStatusMap.set(claimId, automatedTest.status);
            }
          });
        });
        currentSuite.suites.forEach((nestedSuite: any) => processSuite(nestedSuite, newAncestorTitles));
      };
      fileResult.suites.forEach(suite => processSuite(suite));
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
