export interface ManualTest {
  id: string;
  description: string;
  claimReference?: string; // For later use
}

export const MANUAL_TESTS: ManualTest[] = [
  {
    id: "UX-1",
    description: "Verify brush rotation (I/P reversed)",
  },
  {
    id: "UX-2",
    description: "Verify Square-Up toggle stop action",
  },
  {
    id: "UX-3",
    description: "Verify continuous rotation (L Off)",
  },
  {
    id: "UX-4",
    description: "Enter name in welcome modal, refresh. Verify name persists and modal is gone.",
  },
  {
    id: "UX-5",
    description: "In a dev build, verify header shows 'Welcome, [Name]! Build: [Version] (dev)'.",
  },
  {
    id: "UX-6",
    description: "Check a test in the Tests Panel, refresh. Verify it remains checked.",
  },
  {
    id: "UI-1",
    description: "Verify 'Manual Tests' panel is visible. (Confirm it's hidden in prod).",
  },
  {
    id: "UI-2",
    description: "Click the '?' button and verify this documentation modal appears.",
  },
];
