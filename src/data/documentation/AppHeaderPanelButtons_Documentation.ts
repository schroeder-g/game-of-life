import { DocItem } from "./_Documentation";

export const appHeaderPanelButtonsDocumentation: DocItem[] = [
  {
    id: "AHPB_CONTROLS_001",
    type: "h3",
    text: "<b>Header Button Controls</b>",
  },
  {
    id: "AHPB_CONTROLS_001_CLAIM",
    type: "p",
    text: `The <span class="code-ref">AppHeaderPanelButtons</span> component (<span class="code-ref">src/components/AppHeaderPanelButtons.tsx</span>) contains primary interactive elements like the Scene Selector, a mode toggle (UC-1), playback controls (Play/Pause, Step, Reset), and camera actions (Fit, Recenter, Square Up).`,
    references: ["src/components/AppHeaderPanelButtons.tsx"],
    testIds: ["AHPB_CONTROLS_001"],
  },
  {
    id: "AHPB_MENUS_001",
    type: "h3",
    text: "<b>Menus and Toggles</b>",
  },
  {
    id: "AHPB_MENUS_001_CLAIM",
    type: "p",
    text: `This component also houses the Help dropdown menu for accessing documentation (UI-2), shortcuts, and release notes. It also contains toggles for the main Settings panel (gear icon) and the <span class="code-ref">SelectedCommunityPanel</span> (community icon).`,
    references: ["src/components/AppHeaderPanelButtons.tsx"],
    testIds: ["AHPB_MENUS_001"],
  },
  {
    id: "AHPB_CONTEXT_001",
    type: "h3",
    text: "<b>Contextual Control Visibility</b>",
  },
  {
    id: "AHPB_CONTEXT_001_CLAIM",
    type: "p",
    text: `Controls are displayed contextually. The Play/Pause button and Speed slider (UC-6) are only available in View mode. 'Step' or 'Reset' buttons are disabled while the simulation runs. The community icon appears only when a community is selected in Edit mode.`,
    references: ["src/components/AppHeaderPanelButtons.tsx"],
    testIds: ["AHPB_CONTEXT_001"],
  },
];
