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
	id: string;
	title: string;
	steps: string[];
	claimIds: string[];
}

export type ManualTestStatus = 'checked' | 'failed' | undefined;

export interface ManualTestResult {
	status: ManualTestStatus;
	timestamp?: number;
}

export type VitestStatus = 'passed' | 'failed' | 'skipped'; // Status from Vitest report

export interface VitestAssertionResult {
	ancestorTitles: string[];
	fullName: string;
	status: VitestStatus;
	title: string;
	duration?: number;
	failureMessages?: string[]; // Array of strings for failure messages
	meta?: Record<string, any>;
	tags?: string[];
}

export interface VitestFileResult {
	assertionResults: VitestAssertionResult[];
	startTime: number;
	endTime: number;
	status: 'passed' | 'failed'; // Status of the test file itself
	message?: string;
	name: string; // File path
}

export interface VitestReport {
	testResults: VitestFileResult[];
	startTime: number;
	numTotalTestSuites: number;
	numPassedTestSuites: number;
	numFailedTestSuites: number;
	numPendingTestSuites: number;
	numTotalTests: number;
	numPassedTests: number;
	numFailedTests: number;
	numPendingTests: number;
	numTodoTests: number;
	success: boolean;
}

export interface AutomatedTestResult {
	id: string; // Full title of the test
	title: string; // Short title of the test
	claimIds: string[];
	status: 'pass' | 'fail' | 'skipped';
	narrative: string; // Error message or success message
	timestamp?: number; // When the test was run (from report.startTime)
}
