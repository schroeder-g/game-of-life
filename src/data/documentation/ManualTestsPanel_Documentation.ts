import { DocItem } from "./_Documentation";

export const manualTestsPanelDocumentation: DocItem[] = [
  {
    id: "MTP_PANEL_001",
    type: "h3",
    text: "<b>Manual Tests Panel</b>",
  },
  {
    id: "MTP_PANEL_001_CLAIM",
    type: "p",
    text: `Available in non-production builds, the <span class="code-ref">ManualTestsPanel</span> (<span class="code-ref">src/components/ManualTestsPanel.tsx</span>) allows developers and testers to track the verification status of features. Users can cycle a test's status between 'unchecked', 'checked', and 'failed'. Test details, including steps and associated documentation claims, can be viewed by expanding each test item. Statuses are persisted in local storage under the key <span class="code-ref">'manual-tests-statuses'</span>, as managed by the <span class="code-ref">useManualTests</span> hook.`,
    references: ["src/components/ManualTestsPanel.tsx", "src/hooks/useManualTests.ts"],
  },
];
