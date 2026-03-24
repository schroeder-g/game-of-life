export interface Claim {
  id: string;
  text: string;
  testIds: string[];
}

export const DOCUMENTATION_CLAIMS: Claim[] = [
  {
    id: "camera-control",
    text: "Toggle 'Auto Square Up' mode with the 'L' key. When disabled, the camera rotates freely. When enabled, it snaps to the nearest square face.",
    testIds: ["UX-2", "UX-3"],
  },
  {
    id: "brush-control",
    text: "Rotate the brush using the 'I' and 'P' keys. These rotations are relative to your screen's orientation, not the grid's.",
    testIds: ["UX-1"],
  },
  {
    id: "dev-welcome",
    text: "Your name is remembered across sessions, and a personalized welcome message is displayed in the header. (Dev/Test builds only).",
    testIds: ["UX-4", "UX-5"],
  },
  {
    id: "dev-testing-panel",
    text: "A 'Manual Tests' panel is available for you to track testing progress. Your selections are automatically saved for your next session. (Dev/Test builds only).",
    testIds: ["UI-1", "UX-6"],
  },
  {
    id: "accessing-documentation",
    text: "You can access this documentation modal at any time by clicking the '?' button in the main control panel.",
    testIds: ["UI-2"],
  },
];
