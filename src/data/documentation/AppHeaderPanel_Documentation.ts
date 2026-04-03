import { DocItem } from './_Documentation';

export const appHeaderPanelDocumentation: DocItem[] = [
	{
		id: 'AHP_HEADER_001',
		type: 'h3',
		text: '<b>Application Header Panel</b>',
	},
	{
		id: 'AHP_HEADER_001_CLAIM',
		type: 'p',
		text: `The <span class="code-ref">AppHeaderPanel</span> (<span class="code-ref">src/components/AppHeaderPanel.tsx</span>) serves as the main control and information hub at the top of the screen. It is divided into three main sections: the title, the status panel, and the control buttons area.`,
		references: ['src/components/AppHeaderPanel.tsx'],
		testIds: ['AHP_TITLE_001'],
	},
	{
		id: 'AHP_TITLE_001',
		type: 'h3',
		text: '<b>Title and Build Information</b>',
	},
	{
		id: 'AHP_TITLE_001_CLAIM',
		type: 'p',
		text: `The left section of the header displays the application title, "Cube of Life". Below the title, it shows build information, including the version number and build time. In non-production builds, it also displays a personalized welcome message if a username is set.`,
		references: ['src/components/AppHeaderPanel.tsx'],
		testIds: ['AHP_TITLE_001'],
	},
	{
		id: 'AHP_STATUS_001',
		type: 'h3',
		text: '<b>Live Status Panel</b>',
	},
	{
		id: 'AHP_STATUS_001_CLAIM',
		type: 'p',
		text: `The central status panel provides real-time information about the simulation state. It displays the current scene name, the camera's face orientation and rotation, the active brush shape (in Edit Mode), and live simulation statistics like generation count and number of living cells.`,
		references: ['src/components/AppHeaderPanel.tsx'],
		testIds: ['AHP_STATUS_001'],
	},
	{
		id: 'AHP_MODAL_001',
		type: 'h3',
		text: '<b>Modal and Panel Management</b>',
	},
	{
		id: 'AHP_MODAL_001_CLAIM',
		type: 'p',
		text: `The header panel is responsible for managing the visibility of several key UI elements, including the <span class="code-ref">DocumentationModal</span>, <span class="code-ref">IntroductionModal</span>, <span class="code-ref">ShortcutOverlay</span>, <span class="code-ref">ReleaseNotesModal</span>, and the <span class="code-ref">SelectedCommunityPanel</span>. It ensures these overlays are presented correctly based on user interaction and application state.`,
		references: ['src/components/AppHeaderPanel.tsx'],
		testIds: ['AHP_MODAL_001'],
	},
	{
		id: 'AHP_MENU_001',
		type: 'h3',
		text: '<b>Main Menu Management</b>',
	},
	{
		id: 'AHP_MENU_001_CLAIM',
		type: 'p',
		text: `The header panel also controls the visibility of the main configuration menu (<span class="code-ref">SettingsSidebar.tsx</span>). This menu provides access to simulation settings, rules, scene management, and other configuration options. The panel uses the <span class="code-ref">showSettingsSidebar</span> and <span class="code-ref">setShowSettingsSidebar</span> props to toggle its display.`,
		references: [
			'src/components/AppHeaderPanel.tsx',
			'src/components/SettingsSidebar.tsx',
		],
		testIds: ['AHP_MENU_001'],
	},
];
