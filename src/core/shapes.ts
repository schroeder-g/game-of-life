// Shape generation utilities for Cube of Life bulk editor

export type ShapeType = "None" | "Cube" | "Square" | "Circle" | "Sphere" | "Triangle" | "Pyramid" | "Selected Community";

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
  const half = (size - 1) / 2;

  for (let z = 0; z < size; z++) {
    // Width expands as we go from top to bottom
    const width = z + 1;
    const halfWidth = (width - 1) / 2;
    for (let x = 0; x < width; x++) {
      offsets.push([
        Math.round(x - halfWidth),
        0,
        Math.round(z - half)
      ]);
    }
  }

  return offsets;
}

// Generate pyramid offsets (3D)
function generatePyramid(size: number, hollow: boolean): Offset[] {
  const offsets: Offset[] = [];
  const half = (size - 1) / 2;

  for (let y = 0; y < size; y++) {
    // Each layer shrinks as we go up (bottom is y=0, top is y=size-1)
    const layerSize = size - y;
    const halfLayer = (layerSize - 1) / 2;

    for (let x = 0; x < layerSize; x++) {
      for (let z = 0; z < layerSize; z++) {
        const dx = Math.round(x - halfLayer);
        const dz = Math.round(z - halfLayer);
        const dy = Math.round(y - half);

        if (hollow) {
          // Surface of pyramid: base layer OR perimeter of other layers
          const isBase = y === 0;
          const isPerimeter = x === 0 || x === layerSize - 1 || z === 0 || z === layerSize - 1;
          if (isBase || isPerimeter) {
            offsets.push([dx, dy, dz]);
          }
        } else {
          offsets.push([dx, dy, dz]);
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
