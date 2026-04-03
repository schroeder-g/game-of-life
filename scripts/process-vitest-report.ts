import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import {
	parseVitestReport,
	type VitestReport,
} from '../src/lib/testing-suite/test-report-parser';

const inputFile = resolve(
	process.cwd(),
	'src/public/data/vitest-report.json',
);
const outputFile = resolve(
	process.cwd(),
	'src/public/data/automated-test-statuses.json',
);

async function main() {
	try {
		console.log(`Reading report from: ${inputFile}`);
		const fileContent = await readFile(inputFile, 'utf-8');
		const report: VitestReport = JSON.parse(fileContent);

		console.log('Parsing report...');
		const statusesMap = parseVitestReport(report);
		const statusesObj = Object.fromEntries(statusesMap);

		await mkdir(dirname(outputFile), { recursive: true });
		await writeFile(outputFile, JSON.stringify(statusesObj, null, 2));

		console.log(
			`Successfully processed and saved results to ${outputFile}`,
		);
	} catch (error) {
		console.error('Error processing vitest report:', error);
		process.exit(1);
	}
}

main();
