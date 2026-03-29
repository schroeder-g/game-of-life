export interface DocItem {
  id: string;
  type: 'h3' | 'p'; // h3 for section headings, p for paragraphs/claims
  text: string;
  testIds?: string[];
  references?: string[];
}

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
    testIds: ["UX-4", "UX-5"],
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
    references: ["src/contexts/BrushContext.tsx"],
  },
  {
    id: "header-playback",
    type: 'p',
    text: "<b>Playback Controls (▶/⏸, ⏮/⏭, ↺):</b> Play/Pause the simulation (Spacebar), step forward/backward one generation (→/←), or reset the grid to its initial state (R). Step and Reset are only available when paused.",
    testIds: ["UC-2"],
    references: ["src/core/Grid3D.ts"],
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
    testIds: ["UC-3"],
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
    references: ["src/contexts/BrushContext.tsx"],
  },
  {
    id: "edit-brush-selector",
    type: 'p',
    text: "<b>Select Brush (🖌️):</b> Opens a dropdown to choose a brush shape, such as Cube or Sphere. You can also select a 'Community' of cells from the grid to use as a custom brush.",
    testIds: ["UC-5"],
    references: ["src/contexts/BrushContext.tsx", "src/core/Grid3D.ts"],
  },

  { id: 'heading-config', type: 'h3', text: 'Configuration Panel' },
  {
    id: "config-speed",
    type: 'p',
    text: "<b>Speed:</b> In View Mode, this slider controls the simulation speed in generations per second.",
    testIds: ["UC-6"],
    references: ["src/contexts/SimulationContext.tsx"],
  },
  {
    id: "config-environment",
    type: 'p',
    text: "<b>Environment Section:</b> Controls the grid's properties. Adjust 'Grid Size' and 'Cell Margin'. 'Reset' reverts to the initial state, 'Clear' removes all cells, and 'Random' populates the grid based on the 'Density' slider.",
    testIds: ["UC-7"],
    references: ["src/contexts/SimulationContext.tsx", "src/core/Grid3D.ts"],
  },
  {
    id: "config-rules",
    type: 'p',
    text: "<b>Rules Section:</b> Defines the automaton's logic. Set the neighbor count for a cell to 'Survive' or for a new cell to be 'Born'. Checkboxes for Faces, Edges, and Corners determine which neighbor types are counted.",
    testIds: ["UC-8"],
    references: ["src/contexts/SimulationContext.tsx"],
  },
  {
    id: "config-cursor",
    type: 'p',
    text: "<b>Cursor Position Section:</b> Provides inputs to set the editor cursor's X, Y, and Z coordinates. It also shows the keyboard shortcuts for moving the cursor, which change based on your camera angle.",
    testIds: ["UC-9"],
    references: ["src/contexts/BrushContext.tsx"],
  },
  {
    id: "config-shape-brush",
    type: 'p',
    text: "<b>Shape Brush Section:</b> Customize the selected brush's 'Size' and 'Hollow' properties. Brush rotation is controlled with the 'I' and 'P' keys. When using destructive tools like the 'Clear Brush', the rotation direction for 'I' and 'P' is reversed for intuitive control.",
    testIds: ["UX-1"],
    references: ["src/core/shapes.ts", "src/contexts/BrushContext.tsx", "src/hooks/useAppShortcuts.ts"],
  },
  {
    id: "config-scene-management",
    type: 'p',
    text: "<b>Scene Management Section:</b> Save the current grid, rules, and settings as a new named scene. You can also 'Export' scenes to a file, 'Import' them from a file, or 'Delete' saved scenes.",
    testIds: ["UC-10"],
  },
  {
    id: "config-camera-controls",
    type: 'p',
    text: "<b>Camera Controls Section:</b> Adjust sensitivity for Pan, Yaw (swivel), and Roll. You can invert controls and set camera easing (acceleration/deceleration) for smoother movements.",
    testIds: ["UC-11"],
  },

  { id: 'heading-dev', type: 'h3', text: 'Developer & Testing Features' },
  {
    id: "dev-welcome",
    type: 'p',
    text: "A welcome message with your name and build info is shown in the header. Your name is remembered between sessions.",
    testIds: ["UX-4", "UX-5"],
    references: ["src/hooks/useSettings.ts"],
  },
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
    testIds: ["QA-3"],
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
  },
];

export const DOCUMENTATION_CONTENT: DocItem[] = [ ...CURRENT_MANUAL, ...DEPRECATED_CONTENT ];
