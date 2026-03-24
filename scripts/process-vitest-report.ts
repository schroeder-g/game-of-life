import { mkdir, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { parseVitestReport, type VitestReport } from '../src/lib/testing-suite/test-report-parser';

const reportUrl = process.argv[2];
if (!reportUrl) {
  console.error("Usage: bun scripts/process-vitest-report.ts <URL_TO_VITEST_REPORT>");
  process.exit(1);
}

const outputFile = resolve(process.cwd(), 'src/public/data/automated-test-statuses.json');

async function main() {
  try {
    console.log(`Fetching report from: ${reportUrl}`);
    const response = await fetch(reportUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch report: ${response.statusText}`);
    }
    const report: VitestReport = await response.json();

    console.log("Parsing report...");
    const statusesMap = parseVitestReport(report);
    const statusesObj = Object.fromEntries(statusesMap);

    await mkdir(dirname(outputFile), { recursive: true });
    await writeFile(outputFile, JSON.stringify(statusesObj, null, 2));

    console.log(`Successfully processed and saved results to ${outputFile}`);
  } catch (error) {
    console.error("Error processing vitest report:", error);
    process.exit(1);
  }
}

main();
