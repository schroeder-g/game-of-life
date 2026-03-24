export interface DocItem {
  id: string;
  type: 'h3' | 'p'; // h3 for section headings, p for paragraphs/claims
  text: string;
  testIds?: string[];
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
    text: "[DEPRECATED] You can toggle the 'Auto Square Up' mode using the 'L' key. When this mode is disabled, the camera can be rotated freely for cinematic views. When enabled, camera movement will snap to the nearest face of the cube, which is ideal for editing the grid.",
    testIds: ["UX-2", "UX-3"],
  },
  {
    id: "deprecated-brush-control",
    type: 'p',
    text: "[DEPRECATED] While in Edit Mode, you can use a 'brush' to place patterns of cells. This brush can be rotated using the 'I' and 'P' keys. These rotations are always relative to your current screen orientation, making them intuitive to use regardless of the camera's angle.",
    testIds: ["UX-1"],
  },
  {
    id: "deprecated-dev-welcome",
    type: 'p',
    text: "[DEPRECATED] For development and test builds, the application provides a personalized experience. Your name is requested on first launch and remembered across sessions, with a welcome message displayed in the header.",
    testIds: ["UX-4", "UX-5"],
  },
  {
    id: "deprecated-dev-testing-panel",
    type: 'p',
    text: "[DEPRECATED] A 'Manual Tests' panel is also available in non-production builds. This panel allows you to track which features you have tested. Your checked items are saved in your browser's local storage and will be remembered on your next visit.",
    testIds: ["UI-1", "UX-6"],
  },
  {
    id: "deprecated-accessing-documentation",
    type: 'p',
    text: "[DEPRECATED] This documentation modal can be opened at any time by clicking the '?' button located in the main control panel.",
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
    text: "Mode Toggle (✏️/📽️): Switches between Edit Mode (Pencil icon), where you can modify the grid, and View Mode (Projector icon), where you can run the simulation and freely move the camera."
  },
  {
    id: "header-playback",
    type: 'p',
    text: "Playback Controls (▶/⏸, ⏮/⏭, ↺): Play/Pause the simulation (Spacebar), step forward/backward one generation (→/←), or reset the grid to its initial state (R). Step and Reset are only available when paused."
  },
  {
    id: "header-camera",
    type: 'p',
    text: "Camera Actions (Fit/Recenter/Square Up): Use 'Fit' (F) to zoom and frame all live cells. 'Recenter' (S) moves the camera to the origin. 'Auto Square Up' (L) toggles a mode where the camera snaps to the nearest face-on view. When Auto Square is off, the camera rotates freely.",
    testIds: ["UX-2", "UX-3"],
  },
  {
    id: "header-scene-selector",
    type: 'p',
    text: "Select Scene (🖼️): Opens a dropdown to quickly load pre-made or user-saved scenes, including their patterns and rules."
  },
  {
    id: "header-docs",
    type: 'p',
    text: "Documentation (?): Opens this user manual. (Shortcut: ? or Shift+/)",
    testIds: ["UI-2"],
  },

  { id: 'heading-edit', type: 'h3', text: 'Editing the Grid (Edit Mode)' },
  {
    id: "edit-paint-clear",
    type: 'p',
    text: "Paint/Clear Modes (+/-): Select Paint (+) to add cells or Clear (-) to remove them. You can click-and-drag on the grid, or use the Spacebar (paint) and Delete (clear) keys to apply the current brush."
  },
  {
    id: "edit-brush-selector",
    type: 'p',
    text: "Select Brush (🖌️): Opens a dropdown to choose a brush shape, such as Cube or Sphere. You can also select a 'Community' of cells from the grid to use as a custom brush."
  },

  { id: 'heading-config', type: 'h3', text: 'Configuration Panel' },
  {
    id: "config-speed",
    type: 'p',
    text: "Speed: In View Mode, this slider controls the simulation speed in generations per second."
  },
  {
    id: "config-environment",
    type: 'p',
    text: "Environment Section: Controls the grid's properties. Adjust 'Grid Size' and 'Cell Margin'. 'Reset' reverts to the initial state, 'Clear' removes all cells, and 'Random' populates the grid based on the 'Density' slider."
  },
  {
    id: "config-rules",
    type: 'p',
    text: "Rules Section: Defines the automaton's logic. Set the neighbor count for a cell to 'Survive' or for a new cell to be 'Born'. Checkboxes for Faces, Edges, and Corners determine which neighbor types are counted."
  },
  {
    id: "config-cursor",
    type: 'p',
    text: "Cursor Position Section: Provides inputs to set the editor cursor's X, Y, and Z coordinates. It also shows the keyboard shortcuts for moving the cursor, which change based on your camera angle."
  },
  {
    id: "config-shape-brush",
    type: 'p',
    text: "Shape Brush Section: Customize the selected brush's 'Size' and 'Hollow' properties. Brush rotation is controlled with the 'I' and 'P' keys.",
    testIds: ["UX-1"],
  },
  {
    id: "config-scene-management",
    type: 'p',
    text: "Scene Management Section: Save the current grid, rules, and settings as a new named scene. You can also 'Export' scenes to a file, 'Import' them from a file, or 'Delete' saved scenes."
  },
  {
    id: "config-camera-controls",
    type: 'p',
    text: "Camera Controls Section: Adjust sensitivity for Pan, Yaw (swivel), and Roll. You can invert controls and set camera easing (acceleration/deceleration) for smoother movements."
  },

  { id: 'heading-dev', type: 'h3', text: 'Developer & Testing Features' },
  {
    id: "dev-welcome",
    type: 'p',
    text: "A welcome message with your name and build info is shown in the header. Your name is remembered between sessions.",
    testIds: ["UX-4", "UX-5"],
  },
  {
    id: "dev-testing-panel",
    type: 'p',
    text: "The 'Manual Tests' panel is available in non-production builds for feature verification. Your checked items are saved for your next session.",
    testIds: ["UI-1", "UX-6"],
  },

  {
    id: 'heading-quality',
    type: 'h3',
    text: 'Architectural & Quality Claims'
  },
  {
    id: "quality-input-focus",
    type: 'p',
    text: "To prevent accidental actions while typing, global keyboard shortcuts are disabled when an input field (e.g., in the Configuration Panel) is focused. This ensures typing does not trigger camera movement or simulation controls.",
    testIds: ["QA-1"],
  },
  {
    id: "quality-key-mapping",
    type: 'p',
    text: "The file `core/faceOrientationKeyMapping.ts` is critical for predictable camera and brush orientation. It must not be modified without a deep understanding of its spatial rotation logic. This ensures that user controls for navigation remain consistent and reliable.",
    testIds: ["QA-2"],
  },
  {
    id: "quality-doc-test-process",
    type: 'p',
    text: "This project adheres to a strict quality process. Every feature or claim documented in this manual is cross-referenced with one or more manual tests (e.g., UX-1, QA-1). This ensures all documented functionality is verifiable and that the documentation stays in sync with the application's behavior. (`src/data/documentation.ts`, `src/data/manual-tests.ts`)",
    testIds: ["QA-3"],
  },
];

export const DOCUMENTATION_CONTENT: DocItem[] = [ ...CURRENT_MANUAL, ...DEPRECATED_CONTENT ];
