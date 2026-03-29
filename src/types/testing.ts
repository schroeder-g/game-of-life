// From the old types.ts


// From the old test-report-parser.ts
export interface DocItem {
  id: string;
  type: 'h3' | 'p';
  text: string;
  testIds?: string[];
  references?: string[];
}

export interface ManualTest {
  id:string;
  title: string;
  steps: string[];
  claimIds: string[];
}

export type ManualTestStatus = 'checked' | 'failed' | undefined;

export interface ManualTestResult {
  status: ManualTestStatus;
  timestamp?: number;
}

export type VitestStatus = 'pass' | 'fail' | 'skipped';

export interface VitestError {
  message: string;
  messageStack?: string;
}

export interface VitestTest {
  name: string;
  fullTitle?: string;
  claimIds?: string[];
  status: VitestStatus;
  duration?: number;
  errors?: VitestError[];
}

export interface VitestSuite { name: string; suites: VitestSuite[]; tests: VitestTest[]; }
export interface VitestFileResult { suites: VitestSuite[]; }
export interface VitestReport {
  testResults: VitestFileResult[];
  startTime: number;
}

export interface AutomatedTestResult {
  id: string; // Full title of the test
  title: string; // Short title of the test
  claimIds: string[];
  status: "pass" | "fail" | "skipped";
  narrative: string; // Error message or success message
  timestamp?: number; // When the test was run (from report.startTime)
}
