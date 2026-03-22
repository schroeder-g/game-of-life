// Shape generation utilities for Cube of Life bulk editor

export type ShapeType = "None" | "Cube" | "Square" | "Circle" | "Sphere" | "Triangle" | "Pyramid" | "Selected Community";

export type Offset = [number, number, number];

/**
 * Compute symmetric range bounds for a given size.
 * - Odd size N: range [-floor(N/2) .. floor(N/2)]  → N cells, centered on 0
 * - Even size N: range [-N/2 .. N/2-1]              → N cells, centered between -1 and 0
 * This ensures the shape is always exactly `size` cells wide and symmetric.
 */
function symmetricRange(size: number): [number, number] {
  const half = Math.floor(size / 2);
  if (size % 2 === 0) {
    return [-half, half - 1]; // even: e.g. size=6 → [-3, 2] → 6 cells
  } else {
    return [-half, half];     // odd:  e.g. size=5 → [-2, 2] → 5 cells
  }
}

// Generate cube offsets (3D)
function generateCube(size: number, hollow: boolean): Offset[] {
  const offsets: Offset[] = [];
  const [lo, hi] = symmetricRange(size);

  for (let x = lo; x <= hi; x++) {
    for (let y = lo; y <= hi; y++) {
      for (let z = lo; z <= hi; z++) {
        if (hollow) {
          const onSurface =
            x === lo || x === hi ||
            y === lo || y === hi ||
            z === lo || z === hi;
          if (onSurface) {
            offsets.push([x, y, z]);
          }
        } else {
          offsets.push([x, y, z]);
        }
      }
    }
  }

  return offsets;
}

// Generate square offsets (2D on XZ plane)
function generateSquare(size: number): Offset[] {
  const offsets: Offset[] = [];
  const [lo, hi] = symmetricRange(size);

  for (let x = lo; x <= hi; x++) {
    for (let z = lo; z <= hi; z++) {
      offsets.push([x, 0, z]);
    }
  }

  return offsets;
}

// Generate circle offsets (2D on XZ plane)
function generateCircle(size: number): Offset[] {
  const offsets: Offset[] = [];
  const radius = size / 2;
  const radiusSq = radius * radius;
  const [lo, hi] = symmetricRange(size);

  for (let x = lo; x <= hi; x++) {
    for (let z = lo; z <= hi; z++) {
      // Distance from center (0 for odd, 0.5 offset for even)
      const cx = size % 2 === 0 ? x + 0.5 : x;
      const cz = size % 2 === 0 ? z + 0.5 : z;
      if (cx * cx + cz * cz <= radiusSq) {
        offsets.push([x, 0, z]);
      }
    }
  }

  return offsets;
}

// Generate sphere offsets (3D)
function generateSphere(size: number, hollow: boolean): Offset[] {
  const offsets: Offset[] = [];
  const radius = size / 2;
  const radiusSq = radius * radius;
  const innerRadius = radius - 1;
  const innerRadiusSq = innerRadius * innerRadius;
  const [lo, hi] = symmetricRange(size);

  for (let x = lo; x <= hi; x++) {
    for (let y = lo; y <= hi; y++) {
      for (let z = lo; z <= hi; z++) {
        const cx = size % 2 === 0 ? x + 0.5 : x;
        const cy = size % 2 === 0 ? y + 0.5 : y;
        const cz = size % 2 === 0 ? z + 0.5 : z;
        const distSq = cx * cx + cy * cy + cz * cz;
        if (distSq <= radiusSq) {
          if (hollow) {
            if (distSq > innerRadiusSq) {
              offsets.push([x, y, z]);
            }
          } else {
            offsets.push([x, y, z]);
          }
        }
      }
    }
  }

  return offsets;
}

// Generate triangle offsets (2D on XZ plane)
function generateTriangle(size: number): Offset[] {
  const offsets: Offset[] = [];
  const halfZ = Math.floor((size - 1) / 2);

  for (let row = 0; row < size; row++) {
    const width = row + 1;
    const [xLo, xHi] = symmetricRange(width);
    const z = row - halfZ;
    for (let x = xLo; x <= xHi; x++) {
      offsets.push([x, 0, z]);
    }
  }

  return offsets;
}

// Generate pyramid offsets (3D)
// Min base size 5. Each layer width = previous - 2.
// Odd base → top layer = 1 cell. Even base → top layer = 2x2.
function generatePyramid(size: number, hollow: boolean): Offset[] {
  const offsets: Offset[] = [];
  const baseSize = Math.max(size, 5); // enforce minimum
  // Build layers from bottom (widest) to top (narrowest)
  const layers: number[] = [];
  let w = baseSize;
  while (w >= 1) {
    layers.push(w);
    w -= 2;
    // For even base, stop at 2 (can't center a 0-width layer)
    if (baseSize % 2 === 0 && w < 2) break;
  }

  const numLayers = layers.length;
  const halfHeight = Math.floor((numLayers - 1) / 2);

  for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
    const layerWidth = layers[layerIdx];
    const [lo, hi] = symmetricRange(layerWidth);
    const dy = layerIdx - halfHeight;

    for (let x = lo; x <= hi; x++) {
      for (let z = lo; z <= hi; z++) {
        if (hollow) {
          const isBase = layerIdx === 0;
          const isTop = layerIdx === numLayers - 1;
          const isPerimeter = x === lo || x === hi || z === lo || z === hi;
          if (isBase || isTop || isPerimeter) {
            offsets.push([x, dy, z]);
          }
        } else {
          offsets.push([x, dy, z]);
        }
      }
    }
  }

  return offsets;
}

// Main dispatcher function
export function generateShape(shape: ShapeType, size: number, hollow: boolean, customOffsets?: Offset[]): Offset[] {
  switch (shape) {
    case "Cube":
      return generateCube(size, hollow);
    case "Square":
      return generateSquare(size);
    case "Circle":
      return generateCircle(size);
    case "Sphere":
      return generateSphere(size, hollow);
    case "Triangle":
      return generateTriangle(size);
    case "Pyramid":
      return generatePyramid(size, hollow);
    case "Selected Community":
      return customOffsets || [];
    default:
      return [];
  }
}

// Check if shape supports hollow mode
export function supportsHollow(shape: ShapeType): boolean {
  return shape === "Cube" || shape === "Sphere" || shape === "Pyramid";
}

// All available shapes for dropdown
export const SHAPES: ShapeType[] = ["Selected Community", "None", "Cube", "Square", "Circle", "Sphere", "Triangle", "Pyramid"];
