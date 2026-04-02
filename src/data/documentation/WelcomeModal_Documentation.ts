import { DocItem } from "./_Documentation";

export const welcomeModalDocumentation: DocItem[] = [
  {
    id: "welcome-modal-section",
    type: "h3",
    text: "Welcome & Onboarding",
  },
  {
    id: "welcome-modal-overview",
    type: "p",
    text: "The **Welcome Modal** appears on the application's first launch to introduce you to the Cube of Life. It serves as the primary onboarding point for new users.",
    testIds: ["UX-4"],
    references: ["src/components/WelcomeModal.tsx"],
  },
  {
    id: "welcome-modal-build-info-claim",
    type: "p",
    text: "<b>Build Information:</b> The modal displays the current application **Version** and **Distribution** (e.g., 'dev' or 'prod'). This ensures users and testers are aware of the specific environment they are interactng with.",
    testIds: ["UX-5"],
    references: ["src/components/WelcomeModal.tsx"],
  },
  {
    id: "welcome-modal-onboarding",
    type: "p",
    text: "<b>Personalization:</b> You are prompted to enter your name before starting. This name is saved in your browser's local storage and used to personalize the application header in subsequent sessions. To ensure a smooth experience, the name input field is automatically focused on load, and camera shortcuts are disabled while typing.",
    testIds: ["UX-4", "UX-7"],
    references: ["src/components/WelcomeModal.tsx", "src/hooks/useAppShortcuts.ts"],
  },
];
