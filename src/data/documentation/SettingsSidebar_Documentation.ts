import { DocItem } from "./_Documentation";

export const settingsSidebarDocumentation: DocItem[] = [
  {
    id: "UC-7",
    type: "h3",
    text: "Environment Configuration",
  },
  {
    id: "UC-7_GRID_SIZE_CLAIM",
    type: "p",
    text: `The <b>Grid Size</b> slider allows users to adjust the dimensions of the 3D grid from 10x10x10 to 60x60x60. Changing the grid size will reset the current simulation.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-7"],
  },
  {
    id: "UC-7_CELL_MARGIN_CLAIM",
    type: "p",
    text: `The <b>Cell Margin</b> slider controls the spacing between individual cells, allowing for better visibility of the internal structure of 3D patterns.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-7"],
  },
  {
    id: "UC-7_RESET_CLAIM",
    type: "p",
    text: `The <b>Reset</b> button restores the grid to its initial state before the simulation started. This button is disabled while the simulation is running.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-7"],
  },
  {
    id: "UC-7_CLEAR_CLAIM",
    type: "p",
    text: `The <b>Clear</b> button removes all living cells from the grid. This action is only available in Edit Mode and when there are living cells present.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-7"],
  },
  {
    id: "UC-7_RANDOM_CLAIM",
    type: "p",
    text: `The <b>Random</b> button populates the grid with a random distribution of living cells based on the specified <b>Density</b>. This is only available in Edit Mode when the grid is clear.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-7"],
  },

  {
    id: "UC-8",
    type: "h3",
    text: "Simulation Rules",
  },
  {
    id: "UC-8_NEIGHBORS_CLAIM",
    type: "p",
    text: `Users can define what constitutes a "neighbor" in 3D space by toggling <b>Faces</b> (up to 6), <b>Edges</b> (up to 12), and <b>Corners</b> (up to 8). At least one neighbor type must remain selected.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-8"],
  },
  {
    id: "UC-8_SURVIVE_CLAIM",
    type: "p",
    text: `The <b>Survive Min/Max</b> sliders define the range of living neighbors required for a cell to remain alive in the next generation.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-8"],
  },
  {
    id: "UC-8_BIRTH_CLAIM",
    type: "p",
    text: `The <b>Birth Min/Max</b> sliders define the range of living neighbors required for a dead cell to become alive. The <b>Birth Margin</b> provides an additional buffer for complex rule sets.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-8"],
  },

  {
    id: "UC-9",
    type: "h3",
    text: "Cursor Navigation",
  },
  {
    id: "UC-9_COORDINATES_CLAIM",
    type: "p",
    text: `The <b>Cursor Position</b> section allows for precise manual entry of X, Y, and Z coordinates for the placement brush. Coordinates are validated against the current grid size.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-9"],
  },
  {
    id: "UC-9_BUTTONS_CLAIM",
    type: "p",
    text: `Beside each coordinate input, <b>Increment/Decrement</b> buttons (▲/▼) allow for step-by-step movement of the brush through the 3D space.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-9"],
  },

  {
    id: "UC-10",
    type: "h3",
    text: "Scene Management",
  },
  {
    id: "UC-10_SAVE_CLAIM",
    type: "p",
    text: `Users can save their current grid state and simulation settings as a custom scene. Scenes are persisted locally and can be reloaded via the Scene Selector.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-10"],
  },
  {
    id: "UC-10_EXPORT_CLAIM",
    type: "p",
    text: `The <b>Export</b> button allows users to download the current scene configuration as a JSON file for sharing or external storage.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-10"],
  },
  {
    id: "UC-10_IMPORT_CLAIM",
    type: "p",
    text: `The <b>Import</b> button allows users to load a scene configuration from a local JSON file.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-10"],
  },

  {
    id: "UC-11",
    type: "h3",
    text: "Camera Controls",
  },
  {
    id: "UC-11_SPEEDS_CLAIM",
    type: "p",
    text: `In View Mode, users can adjust the sensitivity of camera movement via <b>Pan/Dolly Speed</b>, <b>Yaw (Swivel) Speed</b>, and <b>Roll Speed</b> sliders.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-11"],
  },
  {
    id: "UC-11_INVERSION_CLAIM",
    type: "p",
    text: `Users can <b>Invert</b> the axes for Yaw, Pitch, and Roll movement to suit their preference for 3D navigation.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-11"],
  },
  {
    id: "UC-11_EASING_CLAIM",
    type: "p",
    text: `The <b>Ease In/Out</b> sliders control the acceleration and deceleration of camera movement, providing smoother transitions during navigation.`,
    references: ["src/components/SettingsSidebar.tsx"],
    testIds: ["UC-11"],
  },
  {
    id: 'SS_SCENE_NAME_INPUT_001',
    type: 'p',
    text: 'The <b>Scene Name</b> input field allows users to enter a name for saving or exporting a scene. When focused, this input field correctly captures keyboard input and suppresses global keyboard shortcuts, ensuring that typing "R" (reset) or "Space" (play/pause) does not trigger those actions.',
    references: [
      'src/components/SettingsSidebar.tsx::SceneManagementSection',
      'src/components/SettingsSidebar.tsx::handleSaveConfig',
      'src/components/SettingsSidebar.tsx::handleExportConfig',
    ],
    testIds: ['SS_SCENE_NAME_INPUT_001_TEST'],
  },
  {
    id: 'SS_CURSOR_POSITION_KEY_HINTS_001',
    type: 'p',
    text: 'The <b>Cursor Position</b> section displays keyboard shortcuts for moving the brush cursor along the X, Y, and Z axes. These hints dynamically update based on the current camera orientation (face and rotation) to reflect the screen-relative movement keys.',
    references: [
      'src/components/SettingsSidebar.tsx::SelectorPositionSection',
      'src/components/SettingsSidebar.tsx::deriveKeyMap',
      'src/core/faceOrientationKeyMapping.ts::KEY_MAP',
    ],
    testIds: ['SS_CURSOR_POSITION_KEY_HINTS_001_TEST'],
  },
];
