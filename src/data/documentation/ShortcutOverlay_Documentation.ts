import { DocItem } from './_Documentation';

export const shortcutOverlayDocumentation: DocItem[] = [
	{
		id: 'SHORTCUTS_OVERVIEW',
		type: 'h3',
		text: '<b>Keyboard Shortcuts Overview</b>',
	},
	{
		id: 'SHORTCUTS_OVERVIEW_CLAIM',
		type: 'p',
		text: `The <b>Shortcuts Overlay</b> provides a quick reference for all keyboard and mouse controls. It is organized into tabs for View Mode, Edit Mode, and a detailed Key Map.`,
		references: ['src/components/ShortcutOverlay.tsx'],
		testIds: ['UC-12'],
	},
	{
		id: 'SHORTCUTS_TABS_CLAIM',
		type: 'p',
		text: `Users can navigate between <b>View Mode</b>, <b>Edit Mode</b>, and <b>Key Map</b> tabs to find context-specific commands. The Key Map tab provides a visual representation of how physical keys map to 3D directions.`,
		references: ['src/components/ShortcutOverlay.tsx'],
		testIds: ['UC-12'],
	},
	{
		id: 'SHORTCUTS_VIEW_CLAIM',
		type: 'p',
		text: `The **View Mode** tab lists controls for simulation playback (Space/Arrows), camera actions (Fit/Recenter), and smooth "flight-sim" rotation using the K, O, I, and P keys.`,
		references: ['src/components/ShortcutOverlay.tsx'],
		testIds: ['UC-12'],
	},
	{
		id: 'SHORTCUTS_EDIT_CLAIM',
		type: 'p',
		text: `The **Edit Mode** tab highlights cursor movement keys, brush size adjustments ([ and ]), and mouse-based interactions for painting and clearing cells.`,
		references: ['src/components/ShortcutOverlay.tsx'],
		testIds: ['UC-12'],
	},
];
