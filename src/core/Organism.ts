import * as THREE from 'three';

/**
 * Serialized representation of an Organism for persistence and history.
 */
export interface OrganismData {
	id: string;
	name: string;
	livingCells: string[]; // Set serialized to Array
	skinColor: string;
	centroid?: [number, number, number];
	travelVector?: [number, number, number];
	straightSteps?: number;
	avoidanceSteps?: number;
	parallelSteps?: number;
	stuckTicks?: number;
	eatenCount?: number;
	rules?: OrganismRules; // GOL Rules
}

export interface OrganismRules {
	surviveMin: number;
	surviveMax: number;
	birthMin: number;
	birthMax: number;
	birthMargin: number;
	neighborFaces: boolean;
	neighborEdges: boolean;
	neighborCorners: boolean;
}

/**
 * Organism data model.
 * An Organism is a special Community with a Cytoplasm buffer, a skin color,
 * and a name. It is maintained in SimulationContext for the session.
 */
export interface Organism {
	/** Stable UUID for the session. */
	id: string;
	/** Unique human first name (e.g. "Aiko" or "Aiko 2"). */
	name: string;
	/** Living cell keys in "x,y,z" format. */
	livingCells: Set<string>;
	/** Cytoplasm (1-cell-deep inactive buffer) keys in "x,y,z" format. */
	cytoplasm: Set<string>;
	/** Hex color string, average of living cell colors. */
	skinColor: string;
	/**
	 * The living cells from the previous generation. Used for animations
	 * like "fluttering" between states.
	 */
	previousLivingCells: Set<string>;
	/** current center of mass of living cells. */
	centroid?: [number, number, number];
	/** Unit vector of movement since last tick. */
	travelVector?: [number, number, number];
	/** Consecutive steps moved in the current travelVector. */
	straightSteps: number;
	/** Remaining steps in a wall-avoidance dash. */
	avoidanceSteps: number;
	/** Steps moved parallel to a wall within the danger zone. */
	parallelSteps: number;
	/** Consecutive steps where the organism failed to move (blocked). */
	stuckTicks: number;
	/** Total cells consumed by grazing across the organism's lifetime. */
	eatenCount: number;
	rules: OrganismRules; // GOL Rules
}

/**
 * Represents a saved organism shape and its GOL rules, used as a brush.
 */
export interface OrganismBrush {
	id: string;
	name: string;
	cells: Array<[number, number, number]>; // Relative offsets from centroid
	rules: OrganismRules; // GOL Rules
}

/** Parses "x,y,z" key to [x, y, z]. */
export function parseKey(key: string): [number, number, number] {
	const parts = key.split(',');
	return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

/** Creates "x,y,z" key from coordinates. */
export function makeKey(x: number, y: number, z: number): string {
	return `${x},${y},${z}`;
}

/** All 26 neighbor offsets. */
export const UNIT_OFFSETS: Array<[number, number, number]> = (() => {
	const offsets: Array<[number, number, number]> = [];
	for (let dz = -1; dz <= 1; dz++) {
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				if (dx === 0 && dy === 0 && dz === 0) continue;
				offsets.push([dx, dy, dz]);
			}
		}
	}
	return offsets;
})();

/**
 * Computes the Cytoplasm (1-cell-deep buffer) for a set of living cells.
 * Always uses all 26 neighbor directions (Faces, Edges, and Corners).
 */
export function computeCytoplasm(
	livingCells: Set<string>,
	gridSize: number,
): Set<string> {
	const cytoplasm = new Set<string>();
	
	// Create a temporary grid for O(1) lookups
	const tempGrid = new Set(livingCells);

	for (const key of livingCells) {
		const [x, y, z] = parseKey(key);
		for (let dz = -1; dz <= 1; dz++) {
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					if (dx === 0 && dy === 0 && dz === 0) continue;

					const nx = x + dx;
					const ny = y + dy;
					const nz = z + dz;

					// Check bounds
					if (
						nx < 0 || nx >= gridSize ||
						ny < 0 || ny >= gridSize ||
						nz < 0 || nz >= gridSize
					) {
						continue;
					}

					const nk = makeKey(nx, ny, nz);
					// If the neighbor is not a living cell of this organism, it's cytoplasm
					if (!tempGrid.has(nk)) {
						cytoplasm.add(nk);
					}
				}
			}
		}
	}
	return cytoplasm;
}

/**
 * Skin = 1-cell neighbor ring around cytoplasm that is NOT part of any organism's space.
 */
export function computeSkin(
	cytoplasmSpace: Set<string>,
	allOrganismSpaces: Set<string>,
	gridSize: number,
): Set<string> {
	const skin = new Set<string>();
	for (const cytoKey of cytoplasmSpace) {
		const [cx, cy, cz] = parseKey(cytoKey);
		for (const [dx, dy, dz] of UNIT_OFFSETS) {
			const nx = cx + dx,
				ny = cy + dy,
				nz = cz + dz;
			const nk = makeKey(nx, ny, nz);
			if (!allOrganismSpaces.has(nk)) {
				skin.add(nk);
			}
		}
	}
	return skin;
}

/**
 * Computes the average skin color for a set of living cells using the same
 * color formula as Cell.tsx.
 */
export function computeSkinColor(
	livingCells: Set<string>,
	gridSize: number,
): string {
	if (livingCells.size === 0) return '#ffffff';

	let rSum = 0,
		gSum = 0,
		bSum = 0;
	let count = 0;

	for (const key of livingCells) {
		const [x, , z] = parseKey(key);
		const hue = (x / gridSize) * 300;
		const saturation = 0.4 + ((gridSize - 1 - z) / gridSize) * 0.6;
		
		const h = (240 - hue + 360) % 360; 
		const s = saturation;
		const l = 0.55;

		const c = (1 - Math.abs(2 * l - 1)) * s;
		const x2 = c * (1 - Math.abs(((h / 60) % 2) - 1));
		const m = l - c / 2;

		let r = 0,
			g = 0,
			b = 0;
		if (0 <= h && h < 60) {
			r = c; g = x2; b = 0;
		} else if (60 <= h && h < 120) {
			r = x2; g = c; b = 0;
		} else if (120 <= h && h < 180) {
			r = 0; g = c; b = x2;
		} else if (180 <= h && h < 240) {
			r = 0; g = x2; b = c;
		} else if (240 <= h && h < 300) {
			r = x2; g = 0; b = c;
		} else if (300 <= h && h < 360) {
			r = c; g = 0; b = x2;
		}

		rSum += r + m;
		gSum += g + m;
		bSum += b + m;
		count++;
	}

	const toHex = (v: number) =>
		Math.round(Math.min(255, Math.max(0, v * 255)))
			.toString(16)
			.padStart(2, '0');

	return `#${toHex(rSum / count)}${toHex(gSum / count)}${toHex(bSum / count)}`;
}

/**
 * Calculates the center of mass (centroid) for a set of cells.
 */
export function getCentroid(cells: Set<string> | Array<[number, number, number]>): [number, number, number] {
	const cellArray = Array.isArray(cells) ? cells : Array.from(cells).map(parseKey);
	if (cellArray.length === 0) return [0, 0, 0];

	let xSum = 0, ySum = 0, zSum = 0;
	for (const [x, y, z] of cellArray) {
		xSum += x;
		ySum += y;
		zSum += z;
	}
	const count = cellArray.length;
	return [xSum / count, ySum / count, zSum / count];
}

/**
 * Returns a union of living cells and cytoplasm. 
 */
export function getExtendedBody(organism: Organism): Set<string> {
	const body = new Set(organism.livingCells);
	organism.cytoplasm.forEach(k => body.add(k));
	return body;
}

/** Converts an Organism instance to a plain data object for serialization. */
export function serializeOrganism(org: Organism): OrganismData {
	return {
		id: org.id,
		name: org.name,
		livingCells: Array.from(org.livingCells),
		skinColor: org.skinColor,
		centroid: org.centroid,
		travelVector: org.travelVector,
		straightSteps: org.straightSteps,
		avoidanceSteps: org.avoidanceSteps,
		parallelSteps: org.parallelSteps,
		stuckTicks: org.stuckTicks,
		eatenCount: org.eatenCount,
		rules: org.rules,
	};
}

/** Reconstructs an Organism instance from serialized data. */
export function deserializeOrganism(data: OrganismData, gridSize: number): Organism {
	const livingCells = new Set(data.livingCells);
	const defaultRules: OrganismRules = {
		surviveMin: 4,
		surviveMax: 5,
		birthMin: 5,
		birthMax: 5,
		birthMargin: 0,
		neighborFaces: true,
		neighborEdges: true,
		neighborCorners: false,
	};

	return {
		id: data.id,
		name: data.name,
		livingCells,
		previousLivingCells: new Set(livingCells),
		cytoplasm: computeCytoplasm(livingCells, gridSize),
		skinColor: data.skinColor,
		centroid: data.centroid,
		travelVector: data.travelVector,
		straightSteps: data.straightSteps || 0,
		avoidanceSteps: data.avoidanceSteps || 0,
		parallelSteps: data.parallelSteps || 0,
		stuckTicks: data.stuckTicks || 0,
		eatenCount: data.eatenCount || 0,
		rules: data.rules || defaultRules, // Use provided rules or defaults
	};
}

/** Deep clones a map of organisms for history snapshots. */
export function cloneOrganisms(orgs: Map<string, Organism>): Map<string, Organism> {
	const newMap = new Map<string, Organism>();
	for (const [id, org] of orgs) {
		newMap.set(id, {
			...org,
			livingCells: new Set(org.livingCells),
			cytoplasm: new Set(org.cytoplasm),
			previousLivingCells: new Set(org.previousLivingCells),
			straightSteps: org.straightSteps,
			avoidanceSteps: org.avoidanceSteps,
			parallelSteps: org.parallelSteps,
			stuckTicks: org.stuckTicks,
			eatenCount: org.eatenCount,
			travelVector: org.travelVector ? [...org.travelVector] : undefined,
			rules: { ...org.rules }, // Deep clone rules object
		});
	}
	return newMap;
}

/**
 * Rotates a 3D vector by 90-degree increments around a principal axis.
 */
export function rotateVector(v: [number, number, number], axis: 'x' | 'y' | 'z', angle: 90 | 180 | 270): [number, number, number] {
	const [x, y, z] = v;
	if (angle === 180) {
		if (axis === 'x') return [x, -y, -z];
		if (axis === 'y') return [-x, y, -z];
		if (axis === 'z') return [-x, -y, z];
	}
	if (angle === 90) {
		if (axis === 'x') return [x, -z, y];
		if (axis === 'y') return [z, y, -x];
		if (axis === 'z') return [-y, x, z];
	}
	if (angle === 270) {
		if (axis === 'x') return [x, z, -y];
		if (axis === 'y') return [-z, y, x];
		if (axis === 'z') return [y, -x, z];
	}
	return v;
}

/**
 * Rotates a set of coordinates by 90-degree increments around their centroid.
 */
export function rotateCells(
	cells: Array<[number, number, number]>,
	axis: 'x' | 'y' | 'z',
	angle: 90 | 180 | 270,
	centroid: [number, number, number]
): Array<[number, number, number]> {
	const [cx, cy, cz] = centroid.map(Math.round);
	return cells.map(([x, y, z]) => {
		const dx = x - cx;
		const dy = y - cy;
		const dz = z - cz;
		
		let rx = dx, ry = dy, rz = dz;
		if (angle === 180) {
			if (axis === 'x') { ry = -dy; rz = -dz; }
			else if (axis === 'y') { rx = -dx; rz = -dz; }
			else if (axis === 'z') { rx = -dx; ry = -dy; }
		} else if (angle === 90) {
			if (axis === 'x') { ry = -dz; rz = dy; }
			else if (axis === 'y') { rx = rz; rz = -dx; }
			else if (axis === 'z') { rx = -dy; ry = dx; }
		} else if (angle === 270) {
			if (axis === 'x') { ry = rz; rz = -dy; }
			else if (axis === 'y') { rx = -rz; rz = dx; }
			else if (axis === 'z') { rx = dy; ry = -dx; }
		}
		
		return [cx + rx, cy + ry, cz + rz];
	});
}
