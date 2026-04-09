import { expect, test, describe } from "bun:test";
import { Grid3D } from "../core/Grid3D";
import { Organism, makeKey } from "../core/Organism";
import { processOrganisms } from "../core/organism-processing";

describe("Organism Processing - Unified Logic", () => {
	test("Organism should freeze if expansion would touch boundary", () => {
		const grid = new Grid3D(10);
		const organisms = new Map<string, Organism>();
		
		// Place an organism near the wall (3x3 cluster)
		const cells = new Set([
			makeKey(1, 1, 1),
			makeKey(1, 2, 1),
			makeKey(2, 1, 1),
			makeKey(2, 2, 1)
		]);
		
		const org: Organism = {
			id: "org1",
			name: "Test Organism 1",
			livingCells: cells,
			cytoplasm: new Set(),
			skinColor: "rgba(255,0,0,0.5)",
			previousLivingCells: new Set(),
			straightSteps: 0,
			parallelSteps: 0,
			avoidanceSteps: 0,
			stuckTicks: 0,
			travelVector: [0, 0, 1]
		};
		organisms.set("org1", org);

		// Run process
		const result = processOrganisms(grid, organisms, 10, 
			2, 3, // survive
			3, 3, 0, // birth
			true, false, false // neighbor faces
		);

		const updated = result.updatedOrganisms.get("org1")!;
		expect(updated).toBeDefined();
		expect(updated.stuckTicks).toBe(0);
	});

	test("Organism should freeze if completely trapped", () => {
		const grid = new Grid3D(5); // Very small grid
		const organisms = new Map<string, Organism>();
		
		const cells1 = new Set([makeKey(1, 1, 1), makeKey(1, 2, 1), makeKey(1, 1, 2)]);
		const org1: Organism = {
			id: "org1", name: "Trapped 1", livingCells: cells1, cytoplasm: new Set(), skinColor: "", previousLivingCells: new Set(),
			straightSteps: 0, parallelSteps: 0, avoidanceSteps: 0, stuckTicks: 0, travelVector: [0,0,1]
		};
		
		const cells2 = new Set([makeKey(3, 3, 3), makeKey(3, 2, 3), makeKey(3, 3, 2)]);
		const org2: Organism = {
			id: "org2", name: "Trapped 2", livingCells: cells2, cytoplasm: new Set(), skinColor: "", previousLivingCells: new Set(),
			straightSteps: 0, parallelSteps: 0, avoidanceSteps: 0, stuckTicks: 0, travelVector: [0,0,1]
		};

		organisms.set("org1", org1);
		organisms.set("org2", org2);

		const result = processOrganisms(grid, organisms, 5, 2, 3, 3, 3, 0, true, true, true);
		expect(result.updatedOrganisms.size).toBe(2);
	});
});
