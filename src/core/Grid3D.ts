import { Emitter } from "./events"; // Import Emitter

export class Grid3D extends Emitter<{ tick: undefined }> { // Extend Emitter
  size: number;
  private cells: boolean[][][];
  public generation: number = 0;
  public version: number = 0;
  private pastHistory: Array<boolean[][][]> = [];
  private futureHistory: Array<boolean[][][]> = [];
  private readonly historyLimit = 100;

  constructor(size: number = 20) {
    super(); // Call super constructor
    this.size = size;
    this.cells = this.createEmptyGrid();
  }

  private createEmptyGrid(): boolean[][][] {
    return Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () =>
        Array.from({ length: this.size }, () => false),
      ),
    );
  }

  private cloneCells(): boolean[][][] {
    // We only need to clone up to 2 levels since the 3rd is primitive booleans
    return this.cells.map(layer => layer.map(row => [...row]));
  }

  get(x: number, y: number, z: number): boolean {
    if (
      x < 0 ||
      x >= this.size ||
      y < 0 ||
      y >= this.size ||
      z < 0 ||
      z >= this.size
    ) {
      return false;
    }
    return this.cells[z][y][x];
  }

  set(x: number, y: number, z: number, alive: boolean): void {
    if (
      x >= 0 &&
      x < this.size &&
      y >= 0 &&
      y < this.size &&
      z >= 0 &&
      z < this.size
    ) {
      if (this.cells[z][y][x] !== alive) {
        this.cells[z][y][x] = alive;
        this.version++;
        this.emit('tick', undefined); // Emit tick event
      }
    }
  }

  toggle(x: number, y: number, z: number): void {
    if (
      x >= 0 &&
      x < this.size &&
      y >= 0 &&
      y < this.size &&
      z >= 0 &&
      z < this.size
    ) {
      this.cells[z][y][x] = !this.cells[z][y][x];
      this.version++;
      this.emit('tick', undefined); // Emit tick event
    }
  }

  clear(): void {
    this.cells = this.createEmptyGrid();
    this.generation = 0;
    this.version++;
    this.pastHistory = [];
    this.futureHistory = [];
    this.emit('tick', undefined); // Emit tick event
  }

  // Save current state as array of living cell coordinates
  saveState(): Array<[number, number, number]> {
    return this.getLivingCells();
  }

  // Restore state from array of living cell coordinates
  restoreState(cells: Array<[number, number, number]>): void {
    this.cells = this.createEmptyGrid();
    for (const [x, y, z] of cells) {
      if (
        x >= 0 &&
        x < this.size &&
        y >= 0 &&
        y < this.size &&
        z >= 0 &&
        z < this.size
      ) {
        this.cells[z][y][x] = true;
      }
    }
    this.generation = 0;
    this.version++;
    this.pastHistory = [];
    this.futureHistory = [];
    this.emit('tick', undefined); // Emit tick event
  }

  randomize(density: number = 0.08): void {
    let changed = false;
    for (let z = 0; z < this.size; z++) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          const alive = Math.random() < density;
          if (this.cells[z][y][x] !== alive) {
            this.cells[z][y][x] = alive;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      this.generation = 0;
      this.version++;
      this.pastHistory = [];
      this.futureHistory = [];
      this.emit('tick', undefined); // Emit tick event
    }
  }

  public get canStepBackward(): boolean {
    return this.pastHistory.length > 0;
  }

  stepBackward(): boolean {
    if (this.pastHistory.length > 0) {
      this.futureHistory.push(this.cells);
      this.cells = this.pastHistory.pop()!;
      this.generation--;
      this.version++;
      this.emit('tick', undefined); // Emit tick event
      return true;
    }
    return false;
  }

  // Captures current state in history before a manual action
  public recordAction(): void {
    // Clear future history as we are branching from the current state
    this.futureHistory = [];

    // Save current cells to past history
    this.pastHistory.push(this.cells);
    if (this.pastHistory.length > this.historyLimit) {
      this.pastHistory.shift();
    }

    // Replace current cells with a new cloned copy to allow mutation without 
    // affecting the historical record.
    this.cells = this.cloneCells();
    this.generation++;
    this.version++;
    this.emit('tick', undefined);
  }

  // neighbor inclusion flags (set externally by SimulationContext)
  neighborFaces: boolean = true;
  neighborEdges: boolean = true;
  neighborCorners: boolean = false;

  private countNeighbors(x: number, y: number, z: number): number {
    let count = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          // determine type by Manhattan distance
          const sum = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
          if (sum === 1 && !this.neighborFaces) continue;
          if (sum === 2 && !this.neighborEdges) continue;
          if (sum === 3 && !this.neighborCorners) continue;
          if (this.get(x + dx, y + dy, z + dz)) count++;
        }
      }
    }
    return count;
  }

  // Get all communities as a map from cell key to community ID
  getAllCommunities(): Map<string, number> {
    const communityMap = new Map<string, number>();
    const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
    let communityId = 0;

    for (let z = 0; z < this.size; z++) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          if (!this.cells[z][y][x]) continue;
          if (communityMap.has(key(x, y, z))) continue;

          // Flood fill to find all cells in this community
          const queue: Array<[number, number, number]> = [[x, y, z]];
          while (queue.length > 0) {
            const [cx, cy, cz] = queue.shift()!;
            const k = key(cx, cy, cz);
            if (communityMap.has(k)) continue;
            if (!this.get(cx, cy, cz)) continue;

            communityMap.set(k, communityId);

            // Check neighbors respecting configuration
            for (let dz = -1; dz <= 1; dz++) {
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0 && dz === 0) continue;
                  const sum = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                  if (sum === 1 && !this.neighborFaces) continue;
                  if (sum === 2 && !this.neighborEdges) continue;
                  if (sum === 3 && !this.neighborCorners) continue;
                  const nx = cx + dx,
                    ny = cy + dy,
                    nz = cz + dz;
                  if (!communityMap.has(key(nx, ny, nz))) {
                    queue.push([nx, ny, nz]);
                  }
                }
              }
            }
          }
          communityId++;
        }
      }
    }
    return communityMap;
  }

  tick(
    surviveMin: number,
    surviveMax: number,
    birthMin: number,
    birthMax: number,
    birthMargin: number = 0,
  ): void {
    // When we tick forward, we clear any "future" states from rewinding
    this.futureHistory = [];

    // Store current state in history before advancing
    this.pastHistory.push(this.cells);
    if (this.pastHistory.length > this.historyLimit) {
      this.pastHistory.shift();
    }

    const newCells = this.createEmptyGrid();

    // Pre-compute community map if birth margin is active
    const communityMap = birthMargin > 0 ? this.getAllCommunities() : null;
    const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

    for (let z = 0; z < this.size; z++) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          const neighbors = this.countNeighbors(x, y, z);
          const alive = this.cells[z][y][x];
          if (alive) {
            newCells[z][y][x] =
              neighbors >= surviveMin && neighbors <= surviveMax;
          } else {
            // Check birth conditions
            const wouldBeBorn = neighbors >= birthMin && neighbors <= birthMax;

            if (wouldBeBorn && birthMargin > 0 && communityMap) {
              // Find the community of a neighboring cell that would cause birth.
              // We must use the same neighbour rules (faces/edges/corners) as the rest
              // of the simulation; previously we only looked at faces, which meant
              // corner‑only births left parentCommunityId null and the margin logic
              // killed the birth.
              let parentCommunityId: number | null = null;
              neighbour_search: for (let dz = -1; dz <= 1; dz++) {
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    // determine type by Manhattan distance
                    const sum = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
                    if (sum === 1 && !this.neighborFaces) continue;
                    if (sum === 2 && !this.neighborEdges) continue;
                    if (sum === 3 && !this.neighborCorners) continue;

                    const nk = key(x + dx, y + dy, z + dz);
                    if (communityMap.has(nk)) {
                      parentCommunityId = communityMap.get(nk)!;
                      break neighbour_search;
                    }
                  }
                }
              }

              // Check if any cell from a different community is within birthMargin distance
              let tooCloseToOtherCommunity = false;
              const margin = birthMargin;
              const marginSq = margin * margin;

              // Search within bounding box of birth margin
              for (
                let cz = Math.max(0, Math.floor(z - margin));
                cz <= Math.min(this.size - 1, Math.ceil(z + margin));
                cz++
              ) {
                for (
                  let cy = Math.max(0, Math.floor(y - margin));
                  cy <= Math.min(this.size - 1, Math.ceil(y + margin));
                  cy++
                ) {
                  for (
                    let cx = Math.max(0, Math.floor(x - margin));
                    cx <= Math.min(this.size - 1, Math.ceil(x + margin));
                    cx++
                  ) {
                    const ck = key(cx, cy, cz);
                    if (!communityMap.has(ck)) continue;

                    const cellCommunityId = communityMap.get(ck)!;
                    if (cellCommunityId === parentCommunityId) continue;

                    // Calculate euclidean distance
                    const dx = cx - x;
                    const dy = cy - y;
                    const dz = cz - z;
                    const distSq = dx * dx + dy * dy + dz * dz;

                    if (distSq <= marginSq) {
                      tooCloseToOtherCommunity = true;
                      break;
                    }
                  }
                  if (tooCloseToOtherCommunity) break;
                }
                if (tooCloseToOtherCommunity) break;
              }

              newCells[z][y][x] = !tooCloseToOtherCommunity;
            } else {
              newCells[z][y][x] = wouldBeBorn;
            }
          }
        }
      }
    }
    this.cells = newCells;
    this.generation++;
    this.version++;
    this.emit('tick', undefined); // Emit tick event
  }

  getLivingCells(): Array<[number, number, number]> {
    const living: Array<[number, number, number]> = [];
    for (let z = 0; z < this.size; z++) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          if (this.cells[z][y][x]) {
            living.push([x, y, z]);
          }
        }
      }
    }
    return living;
  }

  // Find connected community containing the given cell using flood fill
  getCommunity(
    startX: number,
    startY: number,
    startZ: number,
  ): Array<[number, number, number]> {
    if (!this.get(startX, startY, startZ)) {
      return [];
    }

    const community: Array<[number, number, number]> = [];
    const visited = new Set<string>();
    const queue: Array<[number, number, number]> = [[startX, startY, startZ]];
    const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

    while (queue.length > 0) {
      const [x, y, z] = queue.shift()!;
      const k = key(x, y, z);

      if (visited.has(k)) continue;
      if (!this.get(x, y, z)) continue;

      visited.add(k);
      community.push([x, y, z]);

      // Check all 18 neighbors (face + edge, no corners - matching our rules)
      for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            if (dx !== 0 && dy !== 0 && dz !== 0) continue; // Skip corners
            const nx = x + dx,
              ny = y + dy,
              nz = z + dz;
            if (!visited.has(key(nx, ny, nz))) {
              queue.push([nx, ny, nz]);
            }
          }
        }
      }
    }

    return community;
  }
}

// 3D Patterns
export const patterns3D = {
  // Small stable cluster
  cluster: [
    [1, 1, 1],
    [1, 2, 1],
    [2, 1, 1],
    [1, 1, 2],
  ] as Array<[number, number, number]>,

  // 3D cross
  cross: [
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0],
    [1, 1, 1],
    [1, 1, 2],
    [1, 2, 1],
    [2, 1, 1],
  ] as Array<[number, number, number]>,

  // Cube shell
  cubeShell: (() => {
    const cells: Array<[number, number, number]> = [];
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
          // Only edges and corners, not center
          const edgeCount = [x === 1, y === 1, z === 1].filter(Boolean).length;
          if (edgeCount < 2) {
            cells.push([x, y, z]);
          }
        }
      }
    }
    return cells;
  })(),

  // Diamond shape
  diamond: [
    [2, 2, 1],
    [2, 2, 3],
    [2, 1, 2],
    [2, 3, 2],
    [1, 2, 2],
    [3, 2, 2],
    [2, 2, 2],
  ] as Array<[number, number, number]>,
};
