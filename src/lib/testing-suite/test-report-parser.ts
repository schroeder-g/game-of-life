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
