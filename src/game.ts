export class Grid3D {
  readonly size: number;
  private cells: boolean[][][];

  // 3D rules: survive with 3-4 neighbors, born with 5 neighbors
  private surviveMin = 3;
  private surviveMax = 4;
  private birthCount = 5;

  constructor(size: number = 20) {
    this.size = size;
    this.cells = this.createEmptyGrid();
  }

  private createEmptyGrid(): boolean[][][] {
    return Array.from({ length: this.size }, () =>
      Array.from({ length: this.size }, () =>
        Array.from({ length: this.size }, () => false)
      )
    );
  }

  get(x: number, y: number, z: number): boolean {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
      return false;
    }
    return this.cells[z][y][x];
  }

  set(x: number, y: number, z: number, alive: boolean): void {
    if (x >= 0 && x < this.size && y >= 0 && y < this.size && z >= 0 && z < this.size) {
      this.cells[z][y][x] = alive;
    }
  }

  toggle(x: number, y: number, z: number): void {
    if (x >= 0 && x < this.size && y >= 0 && y < this.size && z >= 0 && z < this.size) {
      this.cells[z][y][x] = !this.cells[z][y][x];
    }
  }

  clear(): void {
    this.cells = this.createEmptyGrid();
  }

  randomize(density: number = 0.1): void {
    for (let z = 0; z < this.size; z++) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          this.cells[z][y][x] = Math.random() < density;
        }
      }
    }
  }

  // Count neighbors in 3D (18 neighbors - faces and edges, no corners)
  private countNeighbors(x: number, y: number, z: number): number {
    let count = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          // Exclude corner neighbors (where all 3 coordinates differ)
          if (dx !== 0 && dy !== 0 && dz !== 0) continue;
          if (this.get(x + dx, y + dy, z + dz)) {
            count++;
          }
        }
      }
    }
    return count;
  }

  tick(): void {
    const newCells = this.createEmptyGrid();

    for (let z = 0; z < this.size; z++) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          const neighbors = this.countNeighbors(x, y, z);
          const alive = this.cells[z][y][x];

          if (alive) {
            // Survive with 4-5 neighbors
            newCells[z][y][x] = neighbors >= this.surviveMin && neighbors <= this.surviveMax;
          } else {
            // Born with exactly 5 neighbors
            newCells[z][y][x] = neighbors === this.birthCount;
          }
        }
      }
    }

    this.cells = newCells;
  }

  // Get all living cells as coordinate array for rendering
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

  setRules(surviveMin: number, surviveMax: number, birthCount: number): void {
    this.surviveMin = surviveMin;
    this.surviveMax = surviveMax;
    this.birthCount = birthCount;
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
