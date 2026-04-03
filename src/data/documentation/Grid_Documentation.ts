import { DocItem } from './_Documentation';

export const gridDocumentation: DocItem[] = [
	{
		id: 'GRID_BOUNDS',
		type: 'h3',
		text: '<b>Grid Bounding Box</b>',
	},
	{
		id: 'GRID_BOUNDS_CLAIM',
		type: 'p',
		text: `The 3D workspace is defined by a silver bounding box that automatically resizes to match the current <b>Grid Size</b> setting (from 10 to 60 units).`,
		references: ['src/components/Grid.tsx'],
		testIds: ['UC-7'],
	},
	{
		id: 'GRID_FACE_LABELS',
		type: 'h3',
		text: '<b>Orientation Labels</b>',
	},
	{
		id: 'GRID_FACE_LABELS_CLAIM',
		type: 'p',
		text: `Each face of the 3D grid is labeled (e.g., "Front", "Top", "Right") relative to the camera's perspective. These labels include the current rotation angle (0°, 90°, 180°, 270°) to assist in precise navigation and brush placement.`,
		references: ['src/components/Grid.tsx'],
		testIds: ['UC-11'],
	},
	{
		id: 'GRID_PROJECTION_GUIDES',
		type: 'h3',
		text: '<b>Axis Projection Guides</b>',
	},
	{
		id: 'GRID_PROJECTION_GUIDES_CLAIM',
		type: 'p',
		text: `In Edit Mode, white semi-transparent "light paths" project from the cursor along the X, Y, and Z axes. These guides help users visualize the cursor's position deep within the 3D volume.`,
		references: ['src/components/Grid.tsx'],
		testIds: ['UC-9'],
	},
];
