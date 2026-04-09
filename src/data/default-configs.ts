export interface OrganismData {
	id: string;
	name: string;
	livingCells: string[]; // keys
	skinColor: string;
	centroid?: [number, number, number];
	travelVector?: [number, number, number];
	straightSteps?: number;
	avoidanceSteps?: number;
	parallelSteps?: number;
	stuckTicks?: number;
}

export interface GenesisConfig {
	name: string;
	cells: Array<[number, number, number]>;
	organisms?: OrganismData[]; // Serialized organisms
	settings: {
		speed: number;
		density: number;
		surviveMin: number;
		surviveMax: number;
		birthMin: number;
		birthMax: number;
		birthMargin: number;
		cellMargin: number;
		gridSize: number;
		neighborFaces?: boolean;
		neighborEdges?: boolean;
		neighborCorners?: boolean;
	};
	createdAt: string;
}

export const DEFAULT_CONFIGS: Record<string, GenesisConfig> = {
	'-EMPTY-': {
		name: '-EMPTY-',
		cells: [],
		settings: {
			speed: 5,
			density: 0.08,
			surviveMin: 2,
			surviveMax: 2,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			cellMargin: 0.2,
			gridSize: 24,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: false,
		},
		createdAt: new Date().toISOString(),
	},
	'squid gun': {
		name: 'squid gun',
		cells: [
			[11, 11, 11],
			[11, 11, 12],
			[11, 12, 11],
			[11, 12, 12],
			[12, 11, 11],
			[12, 11, 12],
			[12, 12, 11],
			[12, 12, 12],
		],
		settings: {
			speed: 5,
			density: 0.08,
			surviveMin: 2,
			surviveMax: 2,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			cellMargin: 0.2,
			gridSize: 24,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: false,
		},
		createdAt: new Date('2026-03-09T00:00:00Z').toISOString(),
	},
	'3d glider': {
		name: '3d glider',
		cells: [
			[11, 11, 13],
			[12, 12, 11],
			[12, 11, 13],
			[12, 12, 12],
		],
		settings: {
			speed: 6,
			density: 0.08,
			surviveMin: 4,
			surviveMax: 4,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			cellMargin: 0.2,
			gridSize: 24,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: true,
		},
		createdAt: new Date().toISOString(),
	},
	'gemini glider 2': {
		name: 'gemini glider 2',
		cells: [
			[11, 12, 12],
			[11, 12, 11],
			[12, 12, 13],
			[12, 11, 13],
		],
		settings: {
			speed: 6,
			density: 0.08,
			surviveMin: 5,
			surviveMax: 5,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			cellMargin: 0.2,
			gridSize: 24,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: true,
		},
		createdAt: new Date().toISOString(),
	},
	'Gemini Coaster': {
		name: 'Gemini Coaster',
		cells: [
			[12, 11, 21],
			[11, 12, 21],
			[13, 12, 21],
			[12, 13, 21],
			[11, 11, 22],
			[13, 13, 23],
		],
		settings: {
			speed: 10,
			density: 0.08,
			surviveMin: 5,
			surviveMax: 5,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			cellMargin: 0.2,
			gridSize: 24,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: true,
		},
		createdAt: new Date().toISOString(),
	},
	Flyer: {
		name: 'Flyer',
		cells: [
			[28, 0, 26],
			[29, 0, 26],
			[28, 1, 27],
			[29, 1, 27],
			[28, 1, 28],
			[29, 1, 28],
			[28, 0, 29],
			[29, 0, 29],
		],
		settings: {
			speed: 5,
			density: 0.08,
			surviveMin: 2,
			surviveMax: 2,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			cellMargin: 0.2,
			gridSize: 59,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: false,
		},
		createdAt: new Date('2026-03-17T00:39:36.554Z').toISOString(),
	},
	'Cubic Mandala 1': {
		name: 'Cubic Mandala 1',
		cells: [
			[11, 11, 11],
			[12, 11, 11],
			[11, 12, 11],
			[12, 12, 11],
			[11, 11, 12],
			[12, 11, 12],
			[11, 12, 12],
			[12, 12, 12],
		],
		settings: {
			speed: 30,
			density: 0.08,
			surviveMin: 2,
			surviveMax: 2,
			birthMin: 3,
			birthMax: 4,
			birthMargin: 0,
			cellMargin: 0.2,
			gridSize: 24,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: false,
		},
		createdAt: '2026-03-17T19:36:05.965Z',
	},
	'Persistent Jelly Organism': {
		name: 'Persistent Jelly Organism',
		cells: [
			[16, 6, 19],
			[17, 6, 19],
			[16, 7, 19],
			[17, 7, 19],
			[15, 5, 20],
			[18, 5, 20],
			[15, 8, 20],
			[18, 8, 20],
		],
		settings: {
			speed: 5,
			density: 0.08,
			surviveMin: 2,
			surviveMax: 2,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			cellMargin: 0.2,
			gridSize: 24,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: false,
		},
		organisms: [
			{
				id: 'ff28f1c3-8725-42d5-bc59-4d5b9008cecc',
				name: 'Juno',
				livingCells: [
					'15,8,20',
					'16,7,19',
					'17,7,19',
					'16,6,19',
					'17,6,19',
					'18,8,20',
					'15,5,20',
					'18,5,20',
				],
				skinColor: '#c49354',
				centroid: [16.5, 6.5, 19.5],
				travelVector: [0, -0.9863939238321436, 0.16439898730535843],
			},
		],
		createdAt: '2026-04-04T13:52:04.223Z',
	},
	'Four JEllies': {
		name: 'Four JEllies',
		cells: [
			[11, 12, 11], [3, 15, 12], [4, 15, 12], [3, 16, 12], [4, 16, 12], 
			[2, 14, 13], [5, 14, 13], [2, 17, 13], [5, 17, 13], [16, 6, 19], 
			[17, 6, 19], [16, 7, 19], [17, 7, 19], [16, 15, 19], [17, 15, 19], 
			[16, 16, 19], [17, 16, 19], [8, 3, 20], [9, 3, 20], [8, 4, 20], 
			[9, 4, 20], [15, 5, 20], [18, 5, 20], [15, 8, 20], [18, 8, 20], 
			[15, 14, 20], [18, 14, 20], [15, 17, 20], [18, 17, 20], 
			[7, 2, 21], [10, 2, 21], [7, 5, 21], [10, 5, 21]
		],
		settings: {
			speed: 5,
			density: 0.08,
			surviveMin: 2,
			surviveMax: 2,
			birthMin: 3,
			birthMax: 3,
			birthMargin: 0,
			cellMargin: 0.2,
			gridSize: 24,
			neighborFaces: true,
			neighborEdges: true,
			neighborCorners: false,
		},
		organisms: [
			{
				id: 'ff28f1c3-8725-42d5-bc59-4d5b9008cecc',
				name: 'Juno',
				livingCells: ['15,8,20', '16,7,19', '17,7,19', '16,6,19', '17,6,19', '18,8,20', '15,5,20', '18,5,20'],
				skinColor: '#c49354',
				centroid: [16.5, 6.5, 19.5],
				travelVector: [0, -0.9863939238321436, 0.16439898730535843],
				straightSteps: 0, avoidanceSteps: 0, parallelSteps: 0, stuckTicks: 0
			},
			{
				id: 'org-1775524697927-8fad34304',
				name: 'Maya',
				livingCells: ['9,4,20', '8,3,20', '9,3,20', '8,4,20', '10,5,21', '7,2,21', '10,2,21', '7,5,21'],
				skinColor: '#59c172',
				centroid: [8.5, 3.5, 20.5],
				travelVector: [0, 0, 1],
				straightSteps: 0, avoidanceSteps: 0, parallelSteps: 0, stuckTicks: 0
			},
			{
				id: 'org-1775524730267-3gr0g4hqr',
				name: 'Elara',
				livingCells: ['3,15,12', '4,15,12', '3,16,12', '4,16,12', '2,14,13', '5,14,13', '2,17,13', '5,17,13'],
				skinColor: '#40aed7',
				centroid: [3.5, 15.5, 12.5],
				travelVector: [0, 0, 1],
				straightSteps: 0, avoidanceSteps: 0, parallelSteps: 0, stuckTicks: 0
			},
			{
				id: 'org-1775524825866-n2i48e4ot',
				name: 'Freya',
				livingCells: ['16,16,19', '16,15,19', '17,15,19', '17,16,19', '15,17,20', '15,14,20', '18,14,20', '18,17,20'],
				skinColor: '#c49354',
				centroid: [16.5, 15.5, 19.5],
				travelVector: [0, 0, 1],
				straightSteps: 0, avoidanceSteps: 0, parallelSteps: 0, stuckTicks: 0
			}
		],
		createdAt: '2026-04-07T01:20:42.098Z',
	},
};
