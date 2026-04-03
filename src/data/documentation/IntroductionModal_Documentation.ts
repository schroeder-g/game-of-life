import { DocItem } from './_Documentation';

export const introductionModalDocumentation: DocItem[] = [
	{
		id: 'INTRO_OVERVIEW',
		type: 'h3',
		text: '<b>Project Overview</b>',
	},
	{
		id: 'INTRO_OVERVIEW_CLAIM',
		type: 'p',
		text: `The <b>Introduction Modal</b> provides a high-level overview of Cube of Life, a 3D adaptation of Conway's Game of Life. It explains how cells evolve on a 3D grid based on survival and birth rules.`,
		references: ['src/components/IntroductionModal.tsx'],
		testIds: ['AHPB_HELP_INT_001'],
	},
	{
		id: 'INTRO_VIEW_MODE',
		type: 'h3',
		text: '<b>View Mode Basics</b>',
	},
	{
		id: 'INTRO_VIEW_MODE_CLAIM',
		type: 'p',
		text: `The modal explains that in <b>View Mode</b> (Projector icon), the application is optimized for observing the simulation. Users can play/pause, step through generations, and adjust the playback speed.`,
		references: ['src/components/IntroductionModal.tsx'],
		testIds: ['AHPB_HELP_INT_001'],
	},
	{
		id: 'INTRO_EDIT_MODE',
		type: 'h3',
		text: '<b>Edit Mode Basics</b>',
	},
	{
		id: 'INTRO_EDIT_MODE_CLAIM',
		type: 'p',
		text: `In <b>Edit Mode</b> (Pencil icon), the modal explains that users can modify the grid. This includes using different brush shapes (Cube, Sphere, etc.) and sizes to paint or clear cells.`,
		references: ['src/components/IntroductionModal.tsx'],
		testIds: ['AHPB_HELP_INT_001'],
	},
	{
		id: 'INTRO_HEADER_CONTROLS',
		type: 'h3',
		text: '<b>Header Interface</b>',
	},
	{
		id: 'INTRO_HEADER_CONTROLS_CLAIM',
		type: 'p',
		text: `The introduction guides users to the <b>App Header</b>, which contains the central controls for scene management, camera focus, and toggling the primary settings menu.`,
		references: ['src/components/IntroductionModal.tsx'],
		testIds: ['AHPB_HELP_INT_001'],
	},
];
