export interface DocItem {
  id: string;
  type: 'h3' | 'p'; // h3 for section headings, p for paragraphs/claims
  text: string;
  testIds?: string[];
}

export const DOCUMENTATION_CONTENT: DocItem[] = [
  { 
    id: 'intro', 
    type: 'p', 
    text: "Welcome to Cube of Life! This user manual explains how to interact with and control the 3D cellular automaton. Each feature described below is linked to one or more manual test IDs for verification purposes." 
  },
  { 
    id: 'heading-nav', 
    type: 'h3', 
    text: 'Camera & Navigation' 
  },
  {
    id: "camera-control",
    type: 'p',
    text: "You can toggle the 'Auto Square Up' mode using the 'L' key. When this mode is disabled, the camera can be rotated freely for cinematic views. When enabled, camera movement will snap to the nearest face of the cube, which is ideal for editing the grid.",
    testIds: ["UX-2", "UX-3"],
  },
  { 
    id: 'heading-edit', 
    type: 'h3', 
    text: 'Editing the Grid' 
  },
  {
    id: "brush-control",
    type: 'p',
    text: "While in Edit Mode, you can use a 'brush' to place patterns of cells. This brush can be rotated using the 'I' and 'P' keys. These rotations are always relative to your current screen orientation, making them intuitive to use regardless of the camera's angle.",
    testIds: ["UX-1"],
  },
  { 
    id: 'heading-dev', 
    type: 'h3', 
    text: 'Developer & Testing Features' 
  },
  {
    id: "dev-welcome",
    type: 'p',
    text: "For development and test builds, the application provides a personalized experience. Your name is requested on first launch and remembered across sessions, with a welcome message displayed in the header.",
    testIds: ["UX-4", "UX-5"],
  },
  {
    id: "dev-testing-panel",
    type: 'p',
    text: "A 'Manual Tests' panel is also available in non-production builds. This panel allows you to track which features you have tested. Your checked items are saved in your browser's local storage and will be remembered on your next visit.",
    testIds: ["UI-1", "UX-6"],
  },
  {
    id: "accessing-documentation",
    type: 'p',
    text: "This documentation modal can be opened at any time by clicking the '?' button located in the main control panel.",
    testIds: ["UI-2"],
  },
];
