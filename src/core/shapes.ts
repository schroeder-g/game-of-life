// Shape generation utilities for Cube of Life bulk editor

export type ShapeType = "None" | "Single Cell" | "Cube" | "Square" | "Circle" | "Sphere" | "Triangle" | "Pyramid" | "Selected Community";

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
    return [-half + 0.5, half - 0.5]; // even, e.g. size=6 -> [-2.5, 2.5]
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
  const radius = size / 2 - 0.1; // -0.1 significantly improves rasterization symmetry (e.g. Size 3 becomes a true cross)
  const radiusSq = radius * radius;
  const [lo, hi] = symmetricRange(size);

  for (let x = lo; x <= hi; x++) {
    for (let z = lo; z <= hi; z++) {
      // Distance from center (0 for odd, 0.5 offset for even)
      if (x * x + z * z <= radiusSq) {
        offsets.push([x, 0, z]);
      }
    }
  }

  return offsets;
}

// Generate sphere offsets (3D)
function generateSphere(size: number, hollow: boolean): Offset[] {
  const offsets: Offset[] = [];
  const radius = size / 2 - 0.1;
  const radiusSq = radius * radius;
  const innerRadius = Math.max(0, radius - 1);
  const innerRadiusSq = innerRadius * innerRadius;
  const [lo, hi] = symmetricRange(size);

  for (let x = lo; x <= hi; x++) {
    for (let y = lo; y <= hi; y++) {
      for (let z = lo; z <= hi; z++) {
        const distSq = x * x + y * y + z * z;
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
  const baseSize = Math.max(size, 3); // minimum size of a triangle is three
  
  const layers: number[] = [];
  let w = baseSize;
  while (w >= 1) {
    layers.push(w);
    w -= 2;
    if (baseSize % 2 === 0 && w < 2) break;
  }

  const numLayers = layers.length;
  const halfZ = Math.floor((numLayers - 1) / 2);

  for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
    const layerWidth = layers[layerIdx];
    const [xLo, xHi] = symmetricRange(layerWidth);
    const z = halfZ - layerIdx; // Point goes towards -Z (UP)
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
    case "None":
      return [];
    case "Single Cell":
      return [[0, 0, 0]];
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
export const SHAPES: ShapeType[] = ["Selected Community", "Single Cell", "Cube", "Square", "Circle", "Sphere", "Triangle", "Pyramid"];
