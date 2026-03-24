export type TestStatus = 'pass' | 'fail' | 'skipped';

export interface VitestTest { name: string; status: TestStatus; }
export interface VitestSuite { name: string; suites: VitestSuite[]; tests: VitestTest[]; }
export interface VitestFileResult { suites: VitestSuite[]; }
export interface VitestReport { testResults: VitestFileResult[]; }

export function parseVitestReport(report: VitestReport): Map<string, TestStatus> {
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
export type TestStatus = 'pass' | 'fail' | 'skipped';

export interface VitestError {
  message: string;
  messageStack?: string;
}

export interface VitestTest {
  name: string;
  status: TestStatus;
  duration?: number;
  errors?: VitestError[];
}

export interface VitestSuite { name: string; suites: VitestSuite[]; tests: VitestTest[]; }
export interface VitestFileResult { suites: VitestSuite[]; }
export interface VitestReport {
  testResults: VitestFileResult[];
  startTime: number;
}
