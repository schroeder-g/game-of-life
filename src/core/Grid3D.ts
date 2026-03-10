export class Grid3D {
  size: number;
  private cells: boolean[][][];

  constructor(size: number = 20) {
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
      this.cells[z][y][x] = alive;
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
    }
  }

  clear(): void {
    this.cells = this.createEmptyGrid();
  }

  // Save current state as array of living cell coordinates
  saveState(): Array<[number, number, number]> {
    return this.getLivingCells();
  }

  // Restore state from array of living cell coordinates
  restoreState(cells: Array<[number, number, number]>): void {
    this.cells = this.createEmptyGrid();
    for (const [x, y, z] of cells) {
      this.set(x, y, z, true);
    }
  }

  randomize(density: number = 0.08): void {
    for (let z = 0; z < this.size; z++) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          this.cells[z][y][x] = Math.random() < density;
        }
      }
    }
  }

  private countNeighbors(x: number, y: number, z: number): number {
    let count = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          // Exclude corner neighbors (where all 3 coordinates differ)
          if (dx !== 0 && dy !== 0 && dz !== 0) continue;
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

            // Check all 18 neighbors (face + edge, no corners)
            for (let dz = -1; dz <= 1; dz++) {
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  if (dx === 0 && dy === 0 && dz === 0) continue;
                  if (dx !== 0 && dy !== 0 && dz !== 0) continue;
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
              // Find the community of the neighboring cells that would cause birth
              let parentCommunityId: number | null = null;
              for (let dz = -1; dz <= 1; dz++) {
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    if (dx !== 0 && dy !== 0 && dz !== 0) continue;
                    const nk = key(x + dx, y + dy, z + dz);
                    if (communityMap.has(nk)) {
                      parentCommunityId = communityMap.get(nk)!;
                      break;
                    }
                  }
                  if (parentCommunityId !== null) break;
                }
                if (parentCommunityId !== null) break;
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
