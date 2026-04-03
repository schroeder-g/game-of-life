import { DocItem } from './_Documentation';

export const cellDocumentation: DocItem[] = [
	{
		id: 'CELL_COLOR',
		type: 'h3',
		text: '<b>Dynamic Cell Coloring</b>',
	},
	{
		id: 'CELL_COLOR_CLAIM',
		type: 'p',
		text: `Cells are dynamically colored based on their spatial position. The **Hue** is determined by the X-coordinate, while **Saturation** is influenced by the Z-coordinate, creating a visually distinct 3D gradient that helps in identifying pattern depth.`,
		references: ['src/components/Cell.tsx'],
		testIds: ['CORE-1'],
	},
	{
		id: 'CELL_OPACITY',
		type: 'h3',
		text: '<b>Atmospheric Transparency</b>',
	},
	{
		id: 'CELL_OPACITY_CLAIM',
		type: 'p',
		text: `To improve the visibility of complex 3D structures, cells exhibit varying levels of transparency based on their distance from the center of the grid. Outer cells are more transparent, while the "core" remains dense and opaque.`,
		references: ['src/components/Cell.tsx'],
		testIds: ['CORE-1'],
	},
	{
		id: 'CELL_PULSE',
		type: 'h3',
		text: '<b>Interactive Highlighting</b>',
	},
	{
		id: 'CELL_PULSE_CLAIM',
		type: 'p',
		text: `When in Edit Mode, cells that are directly selected or share two or more coordinates with the cursor will pulse with increased brightness. This provides immediate visual feedback for precise alignment and editing.`,
		references: ['src/components/Cell.tsx'],
		testIds: ['UC-9'],
	},
	{
		id: 'CELL_GHOST',
		type: 'h3',
		text: '<b>Ghost Axis Highlighting</b>',
	},
	{
		id: 'CELL_GHOST_CLAIM',
		type: 'p',
		text: `In Edit Mode, faint "ghost" cells appear along the X, Y, and Z axes intersect with the cursor. This "crosshair" effect allows for intuitive placement in 3D space even when viewing from complex angles.`,
		references: ['src/components/Cell.tsx'],
		testIds: ['UC-9'],
	},
];
