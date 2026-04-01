import { DocItem } from "./_Documentation";

export const controlsDocumentation: DocItem[] = [
  {
    id: "CONTROLS_DEPRECATED_001",
    type: "h3",
    text: "<b>[DEPRECATED] Controls Component</b>",
  },
  {
    id: "deprecated-CONTROLS_DEPRECATED_001_CLAIM",
    type: "p",
    text: `The <span class="code-ref">Controls.tsx</span> component is deprecated and no longer in use. Its functionality, which previously included the community selection sidebar, has been moved to <span class="code-ref">SelectedCommunityPanel.tsx</span>. This documentation entry is retained for historical purposes.`,
    references: ["src/components/Controls.tsx", "src/components/SelectedCommunityPanel.tsx"],
  },
];
