import { describe, it, expect } from 'vitest';
import { DOCUMENTATION_CONTENT } from '../data/documentation/_Documentation';
import { MANUAL_TESTS } from '../data/manual-tests';
import { AUTOMATED_TEST_IDS } from '../data/automated-tests';

describe('[QA-3] Data Integrity Checks', () => {
	it('[QA-3_CLAIMS_HAVE_TESTS] All documentation claims of type "p" must have at least one associated testId', () => {
		const claimsWithoutTests = DOCUMENTATION_CONTENT.filter(
			docItem =>
				docItem.type === 'p' &&
				!docItem.id.startsWith('deprecated-') && // Exclude deprecated claims
				docItem.id !== 'intro' && // Exclude the intro claim
				(!docItem.testIds || docItem.testIds.length === 0),
		);
		expect(claimsWithoutTests).toEqual([]);
	});

	it('[QA-3_VALID_TEST_ID_REFERENCES] All testIds referenced in documentation must exist in AUTOMATED_TEST_IDS or MANUAL_TESTS', () => {
		const allKnownTestIds = new Set([
			...AUTOMATED_TEST_IDS,
			...MANUAL_TESTS.map(test => test.id),
		]);

		const invalidTestIdReferences: {
			claimId: string;
			invalidTestId: string;
		}[] = [];

		DOCUMENTATION_CONTENT.forEach(docItem => {
			if (docItem.testIds) {
				docItem.testIds.forEach(testId => {
					if (!allKnownTestIds.has(testId)) {
						invalidTestIdReferences.push({
							claimId: docItem.id,
							invalidTestId: testId,
						});
					}
				});
			}
		});
		expect(invalidTestIdReferences).toEqual([]);
	});

	it('[QA-3_AUTOMATED_TEST_IDS_REFERENCED] All automated test IDs in AUTOMATED_TEST_IDS must be referenced by at least one documentation claim', () => {
		const referencedAutomatedTestIds = new Set<string>();
		DOCUMENTATION_CONTENT.forEach(docItem => {
			if (docItem.testIds) {
				docItem.testIds.forEach(testId => {
					if (AUTOMATED_TEST_IDS.has(testId)) {
						referencedAutomatedTestIds.add(testId);
					}
				});
			}
		});

		const unreferencedAutomatedTestIds = Array.from(
			AUTOMATED_TEST_IDS,
		).filter(testId => !referencedAutomatedTestIds.has(testId));
		expect(unreferencedAutomatedTestIds).toEqual([]);
	});

	it('[QA-3_MANUAL_TEST_IDS_REFERENCED] All manual test IDs in MANUAL_TESTS must be referenced by at least one documentation claim', () => {
		const referencedManualTestIds = new Set<string>();
		DOCUMENTATION_CONTENT.forEach(docItem => {
			if (docItem.testIds) {
				docItem.testIds.forEach(testId => {
					if (MANUAL_TESTS.some(mt => mt.id === testId)) {
						referencedManualTestIds.add(testId);
					}
				});
			}
		});

		const unreferencedManualTestIds = MANUAL_TESTS.filter(
			test => !referencedManualTestIds.has(test.id),
		).map(test => test.id);
		expect(unreferencedManualTestIds).toEqual([]);
	});
});

describe('[QA-2] Key Mapping Documentation', () => {
	it('[QA-2_KEY_MAPPING_WARNING] documentation contains the warning about faceOrientationKeyMapping', () => {
		const claim = DOCUMENTATION_CONTENT.find(
			item => item.id === 'quality-key-mapping',
		);
		expect(claim?.text).toContain('core/faceOrientationKeyMapping.ts');
	});
});
