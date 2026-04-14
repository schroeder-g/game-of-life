import { OrganismBrush } from '../core/Organism';

/**
 * A collection of standard, non-persistent organism brushes that are 
 * always available to the user.
 */
export const STANDARD_ORGANISM_BRUSHES: OrganismBrush[] = [
	{
		id: 'std-jellyfish',
		name: 'Jellyfish',
		cells: [
			[1, -1, 0],
			[2, 0, -1],
			[0, -1, 0],
			[0, -1, 1],
			[1, -1, 1],
			[-1, 0, -1],
			[-1, 0, 2],
			[2, 0, 2],
		],
		rules: {
			surviveMin: 2,
			surviveMax: 2,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: false,
		},
	},
	{
		id: 'std-gemini-coaster',
		name: 'Gemini Coaster',
		cells: [
			[-1, 1, -1],
			[1, 0, -1],
			[1, 1, 0],
			[0, -1, 1],
			[1, -1, 0],
			[1, 0, 1],
		],
		rules: {
			surviveMin: 5,
			surviveMax: 5,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: true,
		},
	},
	{
		id: 'std-ez-coaster',
		name: 'EZ Coaster',
		cells: [
			[1, -1, 0],
			[0, -1, 1],
			[1, -1, 1],
			[0, -1, 0],
			[1, 1, -1],
			[0, 1, -1],
			[0, 1, 2],
			[1, 1, 2],
		],
		rules: {
			surviveMin: 2,
			surviveMax: 2,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: false,
		},
	},
	{
		id: 'std-pele-copter',
		name: 'Pelé-Copter',
		cells: [
			[0, 1, 1],
			[0, 0, 0],
			[1, 1, 1],
			[0, 0, -1],
		],
		rules: {
			surviveMin: 4,
			surviveMax: 4,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: true,
		},
	},
	{
		id: 'std-fidget',
		name: 'Fidget',
		cells: [
			[0, 1, 0],
			[0, 0, 1],
			[1, 1, 1],
		],
		rules: {
			surviveMin: 2,
			surviveMax: 2,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 2,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: false,
		},
	},
];
