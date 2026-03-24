import { describe, it, expect } from 'vitest';
import { MANUAL_TESTS } from '../data/manual-tests.ts';
import { DOCUMENTATION_CONTENT } from '../data/documentation.ts';

describe('[QA-3] Data Integrity Checks', () => {
  it('ensures all documentation claims have at least one test ID', () => {
    const claimsWithText = DOCUMENTATION_CONTENT.filter(
      (item) => item.type === 'p' && !item.id.startsWith('deprecated-') && item.id !== 'intro'
    );

    const claimsMissingTests = claimsWithText.filter(
      (claim) => !claim.testIds || claim.testIds.length === 0
    );

    const missingIds = claimsMissingTests.map((c) => c.id);

    expect(claimsMissingTests, `Claims missing testIds: ${missingIds.join(', ')}`).toHaveLength(0);
  });

  it('ensures all test IDs referenced in claims exist in manual-tests.ts', () => {
    const allClaimTestIds = new Set(
      DOCUMENTATION_CONTENT.flatMap((item) => item.testIds || [])
    );

    const allManualTestIds = new Set(MANUAL_TESTS.map((test) => test.id));

    const invalidTestIds: string[] = [];
    allClaimTestIds.forEach((testId) => {
      if (!allManualTestIds.has(testId)) {
        invalidTestIds.push(testId);
      }
    });

    expect(invalidTestIds, `Invalid testIds found in claims: ${invalidTestIds.join(', ')}`).toHaveLength(0);
  });
});

describe('[QA-2] Key Mapping Documentation', () => {
  it('documentation contains the warning about faceOrientationKeyMapping', () => {
    const claim = DOCUMENTATION_CONTENT.find(item => item.id === 'quality-key-mapping');
    expect(claim?.text).toContain('core/faceOrientationKeyMapping.ts');
  });
});
