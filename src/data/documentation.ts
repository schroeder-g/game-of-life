export interface Claim {
  id: string;
  text: string;
  testIds: string[];
}

export const DOCUMENTATION_CLAIMS: Claim[] = [
  {
    id: "user-persistence",
    text: "In non-production builds, the application remembers the user's name between sessions. The user is prompted for their name only if it is not already known.",
    testIds: ["UX-4"],
  },
  {
    id: "user-welcome",
    text: "A welcome message, including the user's name, build version, and distribution type, is displayed in non-production builds.",
    testIds: ["UX-5"],
  },
  {
    id: "tests-panel-visibility",
    text: "Development and Test builds provide a 'Manual Tests' panel. This panel is hidden in the Production build.",
    testIds: ["UI-1"],
  },
  {
    id: "tests-panel-state",
    text: "Progress in the 'Manual Tests' panel (i.e., which items are checked) is saved and restored across browser sessions.",
    testIds: ["UX-6"],
  },
  {
    id: "documentation-modal",
    text: "A documentation modal can be accessed, displaying project claims and their corresponding test references.",
    testIds: ["UI-2"],
  },
];
