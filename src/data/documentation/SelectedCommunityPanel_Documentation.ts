import { DocItem } from './_Documentation';

export const selectedCommunityPanelDocumentation: DocItem[] = [
	{
		id: 'COMMUNITY_PANEL_OVERVIEW',
		type: 'h3',
		text: '<b>Community Inspector</b>',
	},
	{
		id: 'COMMUNITY_PANEL_OVERVIEW_CLAIM',
		type: 'p',
		text: `The <b>Community Selection</b> panel appears when a user clicks on a living cell in **Edit Mode**. it identifies all connected living cells and presents them as a single "community" for inspection and reuse.`,
		references: ['src/components/SelectedCommunityPanel.tsx'],
		testIds: ['UC-5'],
	},
	{
		id: 'COMMUNITY_PREVIEW_3D',
		type: 'h3',
		text: '<b>3D Community Preview</b>',
	},
	{
		id: 'COMMUNITY_PREVIEW_3D_CLAIM',
		type: 'p',
		text: `The panel features a dedicated 3D canvas that renders an auto-rotating preview of the selected community. The preview preserves the original spatial arrangement and color-coding of the cells.`,
		references: ['src/components/SelectedCommunityPanel.tsx'],
		testIds: ['UC-5'],
	},
	{
		id: 'COMMUNITY_ACTIVATE_BRUSH',
		type: 'h3',
		text: '<b>Convert to Brush</b>',
	},
	{
		id: 'COMMUNITY_ACTIVATE_BRUSH_CLAIM',
		type: 'p',
		text: `By clicking the star-shaped <b>Activate Brush</b> button, the entire selected community is converted into a custom brush. This allows users to "clone" complex structures and paint them elsewhere on the grid.`,
		references: ['src/components/SelectedCommunityPanel.tsx'],
		testIds: ['UC-5'],
	},
	{
		id: 'COMMUNITY_STATS',
		type: 'h3',
		text: '<b>Community Statistics</b>',
	},
	{
		id: 'COMMUNITY_STATS_CLAIM',
		type: 'p',
		text: `The panel displays the total <b>Cell Count</b> of the community, providing a quick measure of its complexity and size.`,
		references: ['src/components/SelectedCommunityPanel.tsx'],
		testIds: ['UC-5'],
	},
];
