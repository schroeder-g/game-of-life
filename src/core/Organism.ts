import * as THREE from 'three';

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

/**
 * Computes the Cytoplasm (1-cell-deep buffer) for a set of living cells.
 * Always uses all 26 neighbor directions (Faces, Edges, and Corners).
 */
export function computeCytoplasm(
	livingCells: Set<string>,
	gridSize: number,
): Set<string> {
	const cytoplasm = new Set<string>();
	const livingCellsArray = Array.from(livingCells).map(parseKey);

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
		// Match Cell.tsx: chroma.hsl(240 - hue, saturation, 0.55)
		// Compute manually without chroma dependency
		const h = (240 - hue + 360) % 360; // Ensure hue is positive
		const s = saturation;
	const l = 0.55;

		// HSL to RGB conversion logic
		const c = (1 - Math.abs(2 * l - 1)) * s;
		const x2 = c * (1 - Math.abs(((h / 60) % 2) - 1));
		const m = l - c / 2;

		let r = 0,
			g = 0,
			b = 0;
		if (0 <= h && h < 60) {
			r = c;
			g = x2;
			b = 0;
		} else if (60 <= h && h < 120) {
			r = x2;
			g = c;
			b = 0;
		} else if (120 <= h && h < 180) {
			r = 0;
			g = c;
			b = x2;
		} else if (180 <= h && h < 240) {
			r = 0;
			g = x2;
			b = c;
		} else if (240 <= h && h < 300) {
			r = x2;
			g = 0;
			b = c;
		} else if (300 <= h && h < 360) {
			r = c;
			g = 0;
			b = x2;
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
