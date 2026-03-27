import { ManualTest } from "../types/testing";

export const MANUAL_TESTS: ManualTest[] = [
  // Existing Tests (Rewritten)
  {
    id: "UX-1",
    title: "Verify Brush Rotation",
    steps: [
      "Enter Edit Mode.",
      "Select a non-symmetrical brush (e.g., Triangle).",
      "Press 'I' and 'P' keys.",
      "<b>Expected</b>: The brush preview rotates around an axis perpendicular to the screen.",
    ],
    claimIds: ["config-shape-brush"],
  },
  // Removed UX-2 and UX-3
  {
    id: "UX-4",
    title: "Verify User Name Persistence",
    steps: [
      "On first launch (clear local storage if needed), enter a name in the welcome modal and proceed.",
      "Refresh the page.",
      "<b>Expected</b>: The welcome modal should not appear, and the header should show the entered name.",
    ],
    claimIds: ["dev-welcome"],
  },
  {
    id: "UX-5",
    title: "Verify Development Build Info in Header",
    steps: [
      "Run the application in a development environment.",
      "Look at the header text.",
      "<b>Expected</b>: The header contains 'Welcome, [Name]! Build: [Version] (Dev build)'.",
    ],
    claimIds: ["dev-welcome"],
  },
  {
    id: "UX-6",
    title: "Verify Test Panel Persistence",
    steps: [
      "In a non-production build, open the 'Manual Tests' panel.",
      "Check any checkbox next to a test.",
      "Refresh the page.",
      "<b>Expected</b>: The test panel should remain open and the checkbox should remain checked.",
    ],
    claimIds: ["dev-testing-panel"],
  },
  {
    id: "UI-1",
    title: "Verify 'Manual Tests' Panel Visibility",
    steps: [
      "Run a non-production build.",
      "<b>Expected</b>: The 'Manual Tests' panel should be visible.",
      "Run a production build (if possible).",
      "<b>Expected</b>: The 'Manual Tests' panel should NOT be visible.",
    ],
    claimIds: ["dev-testing-panel"],
  },
  {
    id: "UI-2",
    title: "Verify Documentation Modal Access",
    steps: [
      "Click the '?' button in the header.",
      "<b>Expected</b>: The documentation modal appears.",
      "Close the modal and press '?' or 'Shift+/' on the keyboard.",
      "<b>Expected</b>: The documentation modal appears.",
    ],
    claimIds: ["header-docs"],
  },
  {
    id: "QA-1",
    title: "Verify Text Inputs Ignore Global Shortcuts",
    steps: [
      "Click into a text or number input field (e.g., 'Grid Size').",
      "Press keys that are global shortcuts (e.g., 'L', 'F', 'R', 'Spacebar').",
      "<b>Expected</b>: The keys should only perform their text-input function and not trigger global actions (e.g., camera squaring, simulation reset).",
    ],
    claimIds: ["quality-input-focus"],
  },
  {
    id: "QA-2",
    title: "Verify Key Mapping Warning in Documentation",
    steps: [
      "Open the documentation modal ('?').",
      "Scroll to the 'Architectural & Quality Claims' section.",
      "<b>Expected</b>: A claim must exist stating that `core/faceOrientationKeyMapping.ts` is critical and should not be modified lightly.",
    ],
    claimIds: ["quality-key-mapping"],
  },
  {
    id: "QA-3",
    title: "Verify All Claims Have Tests",
    steps: [
      "Open the documentation modal ('?').",
      "Review every claim (paragraph of text).",
      "<b>Expected</b>: Every functional claim should be followed by one or more test IDs (e.g., '[UX-1]').",
    ],
    claimIds: ["quality-doc-test-process"],
  },

  // New Tests for User Controls
  {
    id: "UC-1",
    title: "Toggle Edit/View Mode",
    steps: ["Click the '✏️'/'📽️' icon in the header.", "<b>Expected</b>: The UI and available controls should switch between View and Edit modes."],
    claimIds: ["header-mode-toggle"],
  },
  {
    id: "UC-2",
    title: "Use Playback Controls",
    steps: [
      "Press Play (▶) or Spacebar. <b>Expected</b>: Simulation runs.",
      "Press Pause (⏸) or Spacebar. <b>Expected</b>: Simulation pauses.",
      "While paused, press Step Forward (⏭) or '→'. <b>Expected</b>: Simulation advances one generation.",
      "Press Step Backward (⏮) or '←'. <b>Expected</b>: Simulation reverts one generation.",
      "Press Reset (↺) or 'R'. <b>Expected</b>: Grid reverts to its initial saved state.",
    ],
    claimIds: ["header-playback"],
  },
  {
    id: "UC-3",
    title: "Use Scene Selector",
    steps: ["Click the '🖼️' icon.", "<b>Expected</b>: A dropdown of pre-made and saved scenes appears.", "Select a scene.", "<b>Expected</b>: The grid and rules update to the selected scene."],
    claimIds: ["header-scene-selector"],
  },
  {
    id: "UC-4",
    title: "Use Paint/Clear Edit Modes",
    steps: [
      "Enter Edit Mode.",
      "Select Paint mode (+). Click or drag on the grid. <b>Expected</b>: Cells are activated.",
      "Select Clear mode (-). Click or drag on the grid. <b>Expected</b>: Cells are deactivated.",
    ],
    claimIds: ["edit-paint-clear"],
  },
  {
    id: "UC-5",
    title: "Use Brush Selector",
    steps: [
      "Enter Edit Mode.",
      "Click the '🖌️' icon.",
      "<b>Expected</b>: A dropdown with shape brushes (Cube, Sphere, etc.) and 'Community' appears.",
      "Select a shape. <b>Expected</b>: The cursor preview updates to that shape.",
    ],
    claimIds: ["edit-brush-selector"],
  },
  {
    id: "UC-6",
    title: "Adjust Simulation Speed",
    steps: ["In View Mode, move the 'Speed' slider.", "<b>Expected</b>: The rate of generations per second changes when the simulation is playing."],
    claimIds: ["config-speed"],
  },
  {
    id: "UC-7",
    title: "Use Environment Controls",
    steps: [
      "Adjust 'Grid Size'. <b>Expected</b>: The grid resizes.",
      "Click 'Clear'. <b>Expected</b>: All cells are removed.",
      "Adjust 'Density' and click 'Random'. <b>Expected</b>: The grid is populated with a new random pattern at the specified density.",
    ],
    claimIds: ["config-environment"],
  },
  {
    id: "UC-8",
    title: "Adjust Automaton Rules",
    steps: ["Adjust the 'Survive' and 'Born' sliders.", "Toggle the 'Faces', 'Edges', 'Corners' checkboxes.", "Step the simulation.", "<b>Expected</b>: The next generation is calculated based on the new rules."],
    claimIds: ["config-rules"],
  },
  {
    id: "UC-9",
    title: "Use Cursor Position Controls",
    steps: ["In Edit Mode, manually change the X, Y, Z coordinates in the 'Cursor Position' inputs.", "<b>Expected</b>: The cursor teleports to the new coordinates."],
    claimIds: ["config-cursor"],
  },
  {
    id: "UC-10",
    title: "Use Scene Management Controls",
    steps: [
      "Modify the grid and click 'Save New'. Name the scene. <b>Expected</b>: The new scene appears in the Scene Selector.",
      "Select a scene and click 'Export'. <b>Expected</b>: A file download is triggered.",
      "Click 'Import'. Select a valid scene file. <b>Expected</b>: The scene is loaded.",
    ],
    claimIds: ["config-scene-management"],
  },
  {
    id: "UC-11",
    title: "Adjust Camera Controls",
    steps: ["Go to the 'Camera Controls' section.", "Adjust 'Pan Sensitivity' and move the camera. <b>Expected</b>: Camera movement speed changes.", "Toggle an 'Invert' checkbox. <b>Expected</b>: The corresponding camera rotation axis is inverted."],
    claimIds: ["config-camera-controls"],
  },
  {
    id: "UC-12",
    title: "Access and Dismiss Shortcut Overlay",
    steps: [
      "Open the shortcut overlay (Note: a dedicated button or key may exist for this).",
      "<b>Expected</b>: A modal titled 'Shortcuts' appears, with 'View Mode' and 'Edit Mode' tabs.",
      "Click the dark backdrop area outside the modal.",
      "<b>Expected</b>: The modal closes.",
      "Re-open the shortcut overlay.",
      "Press the 'Escape' key.",
      "<b>Expected</b>: The modal closes.",
    ],
    claimIds: ["header-shortcuts"],
  },
  {
    id: "UX-7",
    title: "Verify Input Focus in Welcome Modal",
    steps: [
      "Trigger the Welcome Modal (e.g., by clearing local storage and reloading the app).",
      "Click into the 'Enter your name' input field.",
      "Press camera rotation keys (e.g., W, A, S, D, Q, E).",
      "<b>Expected</b>: The camera should not move. The keys pressed should appear as text in the input field.",
    ],
    claimIds: ["quality-input-focus"],
  },

 // CORE Tests for Grid3D data model integrity
 {
   id: 'CORE-1',
   title: 'Grid3D: Initialization',
   steps: ['Automated test verifies correct initialization.'],
   claimIds: ['DS-1'],
 },
 {
   id: 'CORE-2',
   title: 'Grid3D: Out of Bounds Get',
   steps: ['Automated test verifies graceful handling of out-of-bounds get requests.'],
   claimIds: ['DS-1'],
 },
 {
   id: 'CORE-3',
   title: 'Grid3D: Set and Get State',
   steps: ['Automated test verifies correct setting and getting of cell states.'],
   claimIds: ['DS-1'],
 },
 {
   id: 'CORE-4',
   title: 'Grid3D: Out of Bounds Set',
   steps: ['Automated test verifies graceful handling of out-of-bounds set requests.'],
   claimIds: ['DS-1'],
 },
 {
   id: 'CORE-5',
   title: 'Grid3D: Toggle State',
   steps: ['Automated test verifies correct toggling of cell states.'],
   claimIds: ['DS-1'],
 },
 {
   id: 'CORE-6',
   title: 'Grid3D: Clear',
   steps: ['Automated test verifies correct clearing of the grid.'],
   claimIds: ['DS-1'],
 },
 {
   id: 'CORE-7',
   title: 'Grid3D: Save and Restore',
   steps: ['Automated test verifies state is saved and restored without data loss.'],
   claimIds: ['DS-1'],
 },
 {
   id: 'CORE-8',
   title: 'Grid3D: Tick Simulation',
   steps: ['Automated test verifies the simulation tick correctly applies rules.'],
   claimIds: ['DS-1'],
 },
];
