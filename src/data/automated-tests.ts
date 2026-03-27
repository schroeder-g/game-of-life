
/**
 * This set contains the IDs of all manual tests that have a
 * corresponding automated test implemented in the /src/tests/ directory.
 * The TestsPanel uses this set to determine which test titles to bold.
 */
export const AUTOMATED_TEST_IDS = new Set([
  // CORE tests for Grid3D data model
  'CORE-1', 'CORE-2', 'CORE-3', 'CORE-4',
  'CORE-5', 'CORE-6', 'CORE-7', 'CORE-8',

  'UX-1', // should reverse brush rotation for i and p keys when paint tool is active
  'UX-4', // Verify User Name Persistence
  'UX-5', // Verify Development Build Info in Header
  'UX-6', // Verify Test Panel Persistence
  'UX-7', // Verify Input Focus in Welcome Modal
  'UI-1', // Verify 'Manual Tests' Panel Visibility
  'UI-2', // Verify Documentation Modal Access
  'QA-1', // Verify Text Inputs Ignore Global Shortcuts (covered by UX-7)
  'QA-2', // Verify Key Mapping Warning in Documentation
  'QA-3', // Verify All Claims Have Tests
  'UC-1', // Toggle Edit/View Mode
  'UC-6', // Adjust Simulation Speed
]);
