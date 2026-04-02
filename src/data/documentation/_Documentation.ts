/**
 * Represents a single piece of documentation content.
 * Each item is a block-level element, like a heading or a paragraph,
 * and can be linked to tests and source code references.
 */
export interface DocItem {
  /** A unique identifier for the documentation item, used for linking and keys. */
  id:string;
  /** The type of the documentation item, determining its HTML tag. */
  type: 'h3' | 'p'; // h3 for section headings, p for paragraphs/claims
  /** The main content of the item, which may include HTML for formatting. */
  text: string;
  /** An optional array of test IDs (e.g., "UC-1", "QA-3") that verify this claim. */
  testIds?: string[];
  /** An optional array of source file paths relevant to this documentation item. */
  references?: string[];
}

/**
 * Defines a grouping for documentation items in the index.
 * This is used to create collapsible sections in the documentation modal's index.
 */
export interface IndexGroup {
  /** The display title for the group in the documentation index UI. */
  title: string;
  /** The prefix used to identify which `DocItem`s belong to this group. */
  idPrefix: string;
  /** A string, often HTML tags like `<b>`, to be stripped from the item's text for a cleaner display in the index. */
  stripPrefix: string;
}

import { brushControlsDocumentation } from "./brushControls_Documentation";
import { appHeaderPanelDocumentation } from "./AppHeaderPanel_Documentation";
import { appHeaderPanelButtonsDocumentation } from "./AppHeaderPanelButtons_Documentation";
import { automatedTestsPanelDocumentation } from "./AutomatedTestsPanel_Documentation";
import { cellDocumentation } from "./Cell_Documentation";
import { claimHintDocumentation } from "./ClaimHint_Documentation";
import { controlsDocumentation } from "./Controls_Documentation";
import { documentationModalDocumentation } from "./DocumentationModal_Documentation";
import { gridDocumentation } from "./Grid_Documentation";
import { introductionModalDocumentation } from "./IntroductionModal_Documentation";
import { keyMapPageDocumentation } from "./KeyMapPage_Documentation";
import { settingsSidebarDocumentation } from "./SettingsSidebar_Documentation"; // New import
import { manualTestsPanelDocumentation } from "./ManualTestsPanel_Documentation";
import { releaseNotesModalDocumentation } from "./ReleaseNotesModal_Documentation";
import { selectedCommunityPanelDocumentation } from "./SelectedCommunityPanel_Documentation";
import { shortcutOverlayDocumentation } from "./ShortcutOverlay_Documentation";
import { welcomeModalDocumentation } from "./WelcomeModal_Documentation";

const DEPRECATED_CONTENT: DocItem[] = [
  {
    id: 'heading-deprecated',
    type: 'h3',
    text: 'DEPRECATED CLAIMS'
  },
  {
    id: "deprecated-camera-control",
    type: 'p',
    text: "[DEPRECATED as of 2024-03-15: Content merged into claim 'header-camera'] You can toggle the 'Auto Square Up' mode using the 'L' key. When this mode is disabled, the camera can be rotated freely for cinematic views. When enabled, camera movement will snap to the nearest face of the cube, which is ideal for editing the grid.",
    testIds: ["UC-11", "UC-2"],
  },
  {
    id: "deprecated-brush-control",
    type: 'p',
    text: "[DEPRECATED as of 2024-03-15: Content merged into claim 'config-shape-brush'] While in Edit Mode, you can use a 'brush' to place patterns of cells. This brush can be rotated using the 'I' and 'P' keys. These rotations are always relative to your current screen orientation, making them intuitive to use regardless of the camera's angle.",
    testIds: ["UX-1"],
  },
  {
    id: "deprecated-dev-welcome",
    type: 'p',
    text: "[DEPRECATED as of 2024-03-15: Content merged into claim 'dev-welcome'] For development and test builds, the application provides a personalized experience. Your name is requested on first launch and remembered across sessions, with a welcome message displayed in the header.",
  },
  {
    id: "deprecated-dev-testing-panel",
    type: 'p',
    text: "[DEPRECATED as of 2024-03-15: Content merged into claim 'dev-testing-panel'] A 'Manual Tests' panel is also available in non-production builds. This panel allows you to track which features you have tested. Your checked items are saved in your browser's local storage and will be remembered on your next visit.",
    testIds: ["UI-1", "UX-6"],
  },
  {
    id: "deprecated-accessing-documentation",
    type: 'p',
    text: "[DEPRECATED as of 2024-03-15: Content merged into claim 'header-docs'] This documentation modal can be opened at any time by clicking the '?' button located in the main control panel.",
    testIds: ["UI-2"],
  },
];

const CURRENT_MANUAL: DocItem[] = [
  {
    id: 'intro',
    type: 'p',
    text: "Welcome to Cube of Life! This manual explains how to interact with the simulation. The application has two main modes: View Mode for observing, and Edit Mode for modifying the grid."
  },

  { id: 'heading-header', type: 'h3', text: 'Main Header Controls' },
  {
    id: "header-mode-toggle",
    type: 'p',
    text: "<b>Mode Toggle (✏️/📽️):</b> Switches between Edit Mode (Pencil icon), where you can modify the grid, and View Mode (Projector icon), where you can run the simulation and freely move the camera.",
    testIds: ["UC-1"],
    references: ["src/contexts/BrushContext.tsx", "src/contexts/SimulationContext.tsx"],
  },
  {
    id: "header-playback",
    type: 'p',
    text: "<b>Playback Controls (▶/⏸, ⏮/⏭, ↺):</b> Play/Pause the simulation (Spacebar), step forward/backward one generation (→/←), or reset the grid to its initial state (R). Step and Reset are only available when paused.",
    testIds: ["UC-2"],
    references: ["src/core/Grid3D.ts", "src/contexts/SimulationContext.tsx"],
  },
  {
    id: "header-camera",
    type: 'p',
    text: "<b>Camera Actions (Fit/Recenter):</b> Use 'Fit' (F) to zoom and frame all live cells. 'Recenter' (S) moves the camera to the origin.",
    testIds: ["UC-11"],
    references: ["src/contexts/SimulationContext.tsx"],
  },
  {
    id: "header-scene-selector",
    type: 'p',
    text: "<b>Select Scene (🖼️):</b> Opens a dropdown to quickly load pre-made or user-saved scenes, including their patterns and rules.",
    testIds: ["UC-3", "AHP_SCENE_SELECT_001"],
  },
  {
    id: "header-docs",
    type: 'p',
    text: "<b>Documentation (?):</b> Opens this user manual. (Shortcut: ? or Shift+/)",
    testIds: ["UI-2"],
    references: ["src/components/DocumentationModal.tsx"],
  },
  {
    id: "header-shortcuts",
    type: 'p',
    text: "<b>Shortcuts Help:</b> Opens a modal displaying all keyboard shortcuts for both View and Edit modes. The overlay can be closed by clicking its backdrop or pressing 'Escape'.",
    testIds: ["UC-12"],
    references: ["src/components/ShortcutOverlay.tsx"],
  },

  {
    id: 'heading-camera-rotation',
    type: 'h3',
    text: 'Camera Controls & Rotation',
  },
  {
    id: 'rotation-free-form',
    type: 'p',
    text: "<b>Camera Rotation:</b> Use the rotation keys (<b>O/Period</b> for Pitch, <b>K/Semicolon</b> for Yaw, <b>I/P</b> for Roll) for smooth, continuous 'flight-sim' style rotation. This is the only rotation mode, optimized for intuitive navigation.",
    testIds: ["UC-11"],
  },
  {
    id: 'rotation-edit-mode',
    type: 'p',
    text: "<b>Special Rules in Edit Mode:</b> When a brush shape is active (e.g., 'Cube', 'Sphere'), the rotation keys will rotate the brush instead of the camera. To rotate the camera while a brush is active, you must use the <b>Ctrl/Shift</b> override.",
    testIds: ["UX-1"],
  },
  {
    id: 'rotation-override',
    type: 'p',
    text: "<b>Ctrl/Shift Override:</b> At any time, holding <b>Ctrl</b> or <b>Shift</b> (or both) while pressing a rotation key will temporarily perform smooth, continuous camera rotation, even if a brush is active.",
    testIds: ["UX-5"],
  },

  { id: 'heading-edit', type: 'h3', text: 'Editing the Grid (Edit Mode)' },
  {
    id: "edit-paint-clear",
    type: 'p',
    text: "<b>Paint/Clear Modes (+/-):</b> Select Paint (+) to add cells or Clear (-) to remove them. You can click-and-drag on the grid, or use the Spacebar (paint) and Delete (clear) keys to apply the current brush.",
    testIds: ["UC-4"],
    references: ["src/contexts/BrushContext.tsx", "src/contexts/SimulationContext.tsx"],
  },
  {
    id: "edit-brush-selector",
    type: 'p',
    text: "<b>Select Brush (🖌️):</b> Opens a dropdown to choose a brush shape, such as Cube or Sphere. You can also select a 'Community' of cells from the grid to use as a custom brush.",
    testIds: ["UC-5", "UC-6"], // Added UC-6 here
    references: ["src/contexts/BrushContext.tsx", "src/core/Grid3D.ts"],
  },


  { id: 'heading-dev', type: 'h3', text: 'Developer & Testing Features' },
  {
    id: "dev-testing-panel",
    type: 'p',
    text: "The 'Manual Tests' panel is available in non-production builds for feature verification. Your checked items are saved for your next session.",
    testIds: ["UI-1", "UX-6"],
    references: ["src/hooks/useManualTests.ts"],
  },

  {
    id: 'heading-quality',
    type: 'h3',
    text: 'Architectural & Quality Claims'
  },
  {
    id: "quality-input-focus",
    type: 'p',
    text: "To prevent accidental actions while typing, global keyboard shortcuts are disabled when an input field (e.g., in the Configuration Panel or the Welcome Modal) is focused. This ensures typing does not trigger camera movement or simulation controls.",
    testIds: ["QA-1", "UX-7"],
    references: ["src/hooks/useAppShortcuts.ts", "src/components/WelcomeModal.tsx"],
  },
  {
    id: "quality-key-mapping",
    type: 'p',
    text: "The file `core/faceOrientationKeyMapping.ts` is critical for predictable camera and brush orientation. It must not be modified without a deep understanding of its spatial rotation logic. This ensures that user controls for navigation remain consistent and reliable.",
    testIds: ["QA-2"],
    references: ["src/core/faceOrientationKeyMapping.ts"],
  },
  {
    id: "quality-doc-test-process",
    type: 'p',
    text: "This project adheres to a strict quality process. Every feature or claim documented in this manual is cross-referenced with one or more manual tests (e.g., UX-1, QA-1). This ensures all documented functionality is verifiable and that the documentation stays in sync with the application's behavior. (`src/data/documentation.ts`, `src/data/manual-tests.ts`)",
    testIds: [
      "QA-3",
      "QA-3_CLAIMS_HAVE_TESTS",
      "QA-3_VALID_TEST_ID_REFERENCES",
      "QA-3_AUTOMATED_TEST_IDS_REFERENCED",
      "QA-3_MANUAL_TEST_IDS_REFERENCED",
      "QA-2_KEY_MAPPING_WARNING",
    ],
  },
  {
    id: 'DS-1',
    type: 'p',
    text: `<b>Data Structure Integrity (DS-1):</b> The core <code>Grid3D</code> data structure shall
     reliably manage cell states. It must initialize correctly, handle out-of-bounds
     access gracefully, accurately set, get, and toggle cell states, and support
     clearing, saving, and restoring its state without data loss. Its simulation
     tick must correctly apply the rules of life.`,
    testIds: ['CORE-1', 'CORE-2', 'CORE-3', 'CORE-4', 'CORE-5', 'CORE-6', 'CORE-7', 'CORE-8'],
    references: ["src/core/Grid3D.ts"],
  },
];

export const DOCUMENTATION_INDEX_GROUPS: IndexGroup[] = [
  {
    title: "Application Header",
    idPrefix: "AHP_",
    stripPrefix: "<b>",
  },
  {
    title: "Header Buttons",
    idPrefix: "AHPB_",
    stripPrefix: "<b>",
  },
  {
    title: "Brush Controls",
    idPrefix: "BC_",
    stripPrefix: "<b>",
  },
  {
    title: "Simulation Controls",
    idPrefix: "CTRL_",
    stripPrefix: "<b>",
  },
  {
    title: "Manual Testing",
    idPrefix: "MTP_",
    stripPrefix: "<b>",
  },
  {
    title: "Automated Testing",
    idPrefix: "ATP_",
    stripPrefix: "<b>",
  },
];

export const DOCUMENTATION_CONTENT: DocItem[] = [
  ...CURRENT_MANUAL,
  ...brushControlsDocumentation,
  ...appHeaderPanelDocumentation,
  ...appHeaderPanelButtonsDocumentation,
  ...automatedTestsPanelDocumentation,
  ...cellDocumentation,
  ...claimHintDocumentation,
  ...controlsDocumentation,
  ...documentationModalDocumentation,
  ...gridDocumentation,
  ...introductionModalDocumentation,
  ...keyMapPageDocumentation,
  ...settingsSidebarDocumentation, // Add new documentation
  ...manualTestsPanelDocumentation,
  ...releaseNotesModalDocumentation,
  ...selectedCommunityPanelDocumentation,
  ...shortcutOverlayDocumentation,
  ...welcomeModalDocumentation,
  ...DEPRECATED_CONTENT,
];
