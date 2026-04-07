import * as THREE from 'three';
import { Grid3D } from './Grid3D';
import {
	Organism,
	cloneOrganisms,
	parseKey,
	makeKey,
	computeCytoplasm,
	getCentroid,
	rotateCells,
	deserializeOrganism,
} from './Organism';
import { processOrganisms } from './organism-processing';

export interface TickParams {
	surviveMin: number;
	surviveMax: number;
	birthMin: number;
	birthMax: number;
	birthMargin: number;
	neighborFaces: boolean;
	neighborEdges: boolean;
	neighborCorners: boolean;
	gridSize: number;
}

export interface IOrganismManager {
	readonly organisms: Map<string, Organism>;
	readonly version: number;

	beforeTick(grid: Grid3D): void;
	afterTick(grid: Grid3D, params: TickParams): void;

	recordAction(): void;
	stepBackward(): void;

	saveInitialState(): void;
	restoreInitialState(): void;

	clear(): void;
	applyOrganisms(savedOrgs: any[], gridSize: number): void;

	rotateOrganism(grid: Grid3D, id: string, axis: THREE.Vector3, angle: number): void;
}

export class DefaultOrganismManager implements IOrganismManager {
	private _organisms = new Map<string, Organism>();
	private _version = 0;

	private initialOrganisms = new Map<string, Organism>();
	private pastOrganisms: Map<string, Organism>[] = [];
	private futureOrganisms: Map<string, Organism>[] = [];
	private readonly historyLimit = 100;

	public get organisms() {
		return this._organisms;
	}

	public get version() {
		return this._version;
	}

	private bumpVersion() {
		this._version++;
	}

	public recordAction() {
		this.pastOrganisms.push(cloneOrganisms(this._organisms));
		if (this.pastOrganisms.length > this.historyLimit) {
			this.pastOrganisms.shift();
		}
		this.futureOrganisms = [];
	}

	public clear() {
		this._organisms.clear();
		this.pastOrganisms = [];
		this.futureOrganisms = [];
		this.bumpVersion();
	}

	public saveInitialState() {
		this.initialOrganisms = new Map(this._organisms);
	}

	public restoreInitialState() {
		this._organisms = new Map(this.initialOrganisms);
		this.pastOrganisms = [];
		this.futureOrganisms = [];
		this.bumpVersion();
	}

	public stepBackward() {
		if (this.pastOrganisms.length > 0) {
			this.futureOrganisms.push(cloneOrganisms(this._organisms));
			this._organisms = this.pastOrganisms.pop()!;
			this.bumpVersion();
		}
	}

	public applyOrganisms(savedOrgs: any[], gridSize: number) {
		this.clear();
		if (savedOrgs && Array.isArray(savedOrgs)) {
			for (const orgData of savedOrgs) {
				this._organisms.set(orgData.id, deserializeOrganism(orgData, gridSize));
			}
		}
		this.bumpVersion();
	}

	public beforeTick(grid: Grid3D) {
		if (this._organisms.size === 0) return;

		for (const [, org] of this._organisms) {
			for (const key of org.livingCells) {
				const [x, y, z] = parseKey(key);
				if (grid.get(x, y, z)) {
					grid.set(x, y, z, false);
				}
			}
			for (const key of org.cytoplasm) {
				const [x, y, z] = parseKey(key);
				if (grid.get(x, y, z)) {
					grid.set(x, y, z, false);
				}
			}
		}
	}

	public afterTick(grid: Grid3D, params: TickParams) {
		if (this._organisms.size === 0) return;

		this.recordAction();

		const { updatedOrganisms, gridMutations } = processOrganisms(
			grid,
			this._organisms,
			params.gridSize,
			params.surviveMin,
			params.surviveMax,
			params.birthMin,
			params.birthMax,
			params.birthMargin,
			params.neighborFaces,
			params.neighborEdges,
			params.neighborCorners,
		);

		if (gridMutations.length > 0) {
			for (const [x, y, z, alive] of gridMutations) {
				grid.set(x, y, z, alive);
			}
		}

		this._organisms = updatedOrganisms;
		this.bumpVersion();
	}

	public rotateOrganism(grid: Grid3D, id: string, axis: THREE.Vector3, angle: number) {
		const org = this._organisms.get(id);
		if (!org || !org.centroid) return;

		this.recordAction();

		const axisKey = axis.x !== 0 ? 'x' : axis.y !== 0 ? 'y' : 'z';
		const degrees = Math.round((angle * 180) / Math.PI);
		const normalizedDegrees = (((degrees % 360) + 360) % 360);

		if (normalizedDegrees === 0 || normalizedDegrees === 360) return;
		const validAngle = normalizedDegrees as 90 | 180 | 270;

		const oldCells = Array.from(org.livingCells).map(parseKey);
		const rotatedCells = rotateCells(
			oldCells,
			axisKey,
			validAngle,
			org.centroid,
		);

		// Bounds check mapping (requires grid size which can be inferred from grid object itself theoretically)
		const gridSize = grid.size;
		for (const [nx, ny, nz] of rotatedCells) {
			if (
				nx < 0 ||
				nx >= gridSize ||
				ny < 0 ||
				ny >= gridSize ||
				nz < 0 ||
				nz >= gridSize
			) {
				return; // Out of bounds, abort
			}
		}

		// Clear old cells
		for (const cell of oldCells) {
			const [x, y, z] = cell;
			grid.set(x, y, z, false);
		}

		// Set new cells
		for (const cell of rotatedCells) {
			const [nx, ny, nz] = cell;
			grid.set(nx, ny, nz, true);
		}

		// Update Organism
		org.livingCells = new Set(
			rotatedCells.map(([x, y, z]) => makeKey(x, y, z)),
		);
		org.cytoplasm = computeCytoplasm(org.livingCells, gridSize);
		org.centroid = getCentroid(org.livingCells);
		
		this.bumpVersion();
	}
}
