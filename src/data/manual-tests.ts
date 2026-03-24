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
];
