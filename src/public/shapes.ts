// Shape generation utilities for 3D Game of Life bulk editor

export type ShapeType = "None" | "Cube" | "Square" | "Circle" | "Sphere" | "Triangle" | "Pyramid";

export type Offset = [number, number, number];

// Generate cube offsets (3D)
function generateCube(size: number, hollow: boolean): Offset[] {
  const offsets: Offset[] = [];
  const half = Math.floor(size / 2);

  for (let x = -half; x <= half; x++) {
    for (let y = -half; y <= half; y++) {
      for (let z = -half; z <= half; z++) {
        if (hollow) {
          // Only surface cells
          const onSurface =
            x === -half || x === half ||
            y === -half || y === half ||
            z === -half || z === half;
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
  const half = Math.floor(size / 2);

  for (let x = -half; x <= half; x++) {
    for (let z = -half; z <= half; z++) {
      offsets.push([x, 0, z]);
    }
  }

  return offsets;
}

// Generate circle offsets (2D on XZ plane)
function generateCircle(size: number): Offset[] {
  const offsets: Offset[] = [];
  const radius = Math.floor(size / 2);
  const radiusSq = radius * radius;

  for (let x = -radius; x <= radius; x++) {
    for (let z = -radius; z <= radius; z++) {
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
  const radius = Math.floor(size / 2);
  const radiusSq = radius * radius;
  const innerRadiusSq = (radius - 1) * (radius - 1);

  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      for (let z = -radius; z <= radius; z++) {
        const distSq = x * x + y * y + z * z;
        if (distSq <= radiusSq) {
          if (hollow) {
            // Only outer shell
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
  const height = size;

  for (let row = 0; row < height; row++) {
    // Width expands as we go up rows
    const width = row + 1;
    const halfWidth = Math.floor(width / 2);

    for (let x = -halfWidth; x <= halfWidth; x++) {
      // For even width, skip the extra cell on one side
      if (width % 2 === 0 && x === halfWidth) continue;
      offsets.push([x, 0, row - Math.floor(height / 2)]);
    }
  }

  return offsets;
}

// Generate pyramid offsets (3D)
function generatePyramid(size: number, hollow: boolean): Offset[] {
  const offsets: Offset[] = [];
  const height = size;

  for (let y = 0; y < height; y++) {
    // Each layer shrinks as we go up
    const layerSize = height - y;
    const half = Math.floor(layerSize / 2);

    for (let x = -half; x <= half; x++) {
      for (let z = -half; z <= half; z++) {
        // For even layer sizes, skip the extra cells
        if (layerSize % 2 === 0) {
          if (x === half || z === half) continue;
        }

        if (hollow) {
          // Only edges of each layer
          const onEdge =
            x === -half || x === half - (layerSize % 2 === 0 ? 1 : 0) ||
            z === -half || z === half - (layerSize % 2 === 0 ? 1 : 0) ||
            y === 0 || y === height - 1;
          if (onEdge) {
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

// Main dispatcher function
export function generateShape(shape: ShapeType, size: number, hollow: boolean): Offset[] {
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
    default:
      return [];
  }
}

// Check if shape supports hollow mode
export function supportsHollow(shape: ShapeType): boolean {
  return shape === "Cube" || shape === "Sphere" || shape === "Pyramid";
}

// All available shapes for dropdown
export const SHAPES: ShapeType[] = ["None", "Cube", "Square", "Circle", "Sphere", "Triangle", "Pyramid"];
