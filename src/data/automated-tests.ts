
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
  'UC-2', // Playback Controls
  'UC-6', // Adjust Simulation Speed

  // AppHeaderPanel.test.tsx
  'AHP_TITLE_001',
  'AHP_STATUS_001',
  'AHP_MODAL_001',
  'AHPB_SCENE_001',
  'AHPB_MODE_001',
  'AHPB_PLAY_001',
  'AHPB_SPEED_001',
  'AHPB_STEP_BACK_001',
  'AHPB_STEP_FWD_001',
  'AHPB_RESET_001',
  'AHPB_FIT_001',
  'AHPB_RECENTER_001',
  'AHPB_SQUARE_001',
  'AHPB_COMM_001',
  'AHPB_GEAR_001',
  'AHPB_HELP_INT_001',
  'AHPB_HELP_SHORT_001',
  'AHPB_HELP_NOTES_001',
  'AHPB_HELP_DOCS_001',

  // BrushControls.test.tsx
  'TEST_BC_DRAG_001',
  'TEST_BC_INIT_001',
  'TEST_BC_APPEAR_001',
  'TEST_BC_APPEAR_002',
  'TEST_BC_VIS_001',
  'TEST_BC_BUTTON_001_W',
  'TEST_BC_BUTTON_001_X',
  'TEST_BC_BUTTON_001_A',
  'TEST_BC_BUTTON_001_D',
  'TEST_BC_BUTTON_001_Q',
  'TEST_BC_BUTTON_001_Z',
]);
