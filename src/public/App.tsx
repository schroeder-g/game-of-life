import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useControls, button, Leva } from "leva";
import * as THREE from "three";
import chroma from "chroma-js";

// LocalStorage helpers
const STORAGE_KEY = "game-of-life-settings";

function loadSettings(): Record<string, number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
  return {};
}

function saveSettings(settings: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

// Load settings once at startup
const initialSettings = loadSettings();
console.log("Loaded from localStorage:", initialSettings);

const defaults = {
  speed: 5,
  density: 0.08,
  surviveMin: 3,
  surviveMax: 4,
  birthMin: 5,
  birthMax: 5,
  cellMargin: 0.2,
};

// Merge with defaults
const storedSettings = { ...defaults, ...initialSettings };
console.log("Using settings:", storedSettings);

// 3D Grid class
class Grid3D {
  size: number;
  private cells: boolean[][][];

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

  tick(surviveMin: number, surviveMax: number, birthMin: number, birthMax: number): void {
    const newCells = this.createEmptyGrid();
    for (let z = 0; z < this.size; z++) {
      for (let y = 0; y < this.size; y++) {
        for (let x = 0; x < this.size; x++) {
          const neighbors = this.countNeighbors(x, y, z);
          const alive = this.cells[z][y][x];
          if (alive) {
            newCells[z][y][x] = neighbors >= surviveMin && neighbors <= surviveMax;
          } else {
            newCells[z][y][x] = neighbors >= birthMin && neighbors <= birthMax;
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
  getCommunity(startX: number, startY: number, startZ: number): Array<[number, number, number]> {
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
            const nx = x + dx, ny = y + dy, nz = z + dz;
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

// Custom shader material for per-instance color and opacity
const cellShaderMaterial = {
  vertexShader: `
    attribute float instanceOpacity;
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      vColor = instanceColor;
      vOpacity = instanceOpacity;
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      gl_FragColor = vec4(vColor, vOpacity);
    }
  `,
};

// Instanced mesh for efficient rendering of many cubes
function Cells({ cells, gridSize, margin }: { cells: Array<[number, number, number]>; gridSize: number; margin: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = new THREE.Object3D();
  const tempColor = new THREE.Color();
  const offset = gridSize / 2;
  const center = gridSize / 2;

  // Create color scale from blue to red
  const colorScale = useMemo(() => chroma.scale(['blue', 'cyan', 'green', 'yellow', 'red']).domain([0, gridSize]), [gridSize]);

  useEffect(() => {
    if (!meshRef.current || !edgesRef.current) return;

    const colors = new Float32Array(cells.length * 3);
    const opacities = new Float32Array(cells.length);
    const edgeColors = new Float32Array(cells.length * 3);

    cells.forEach((cell, i) => {
      const [x, y, z] = cell;

      // Position
      tempObject.position.set(x - offset, y - offset, z - offset);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      edgesRef.current!.setMatrixAt(i, tempObject.matrix);

      // Hue based on X position (blue to red)
      // Saturation based on Z position
      const hue = (x / gridSize) * 300; // 240 (blue) to 0 (red)
      const saturation = 0.4 + (z / gridSize) * 0.6; // 0.4 to 1.0
      const color = chroma.hsl(240 - hue, saturation, 0.55);
      const [r, g, b] = color.gl();

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Edge colors slightly brighter
      const edgeColor = color.brighten(0.5);
      const [er, eg, eb] = edgeColor.gl();
      edgeColors[i * 3] = er;
      edgeColors[i * 3 + 1] = eg;
      edgeColors[i * 3 + 2] = eb;

      // Opacity based on distance from center (closer = more opaque)
      const dx = x - center;
      const dy = y - center;
      const dz = z - center;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const maxDist = Math.sqrt(3) * center;
      opacities[i] = 0.1 + 0.9 * (1 - distFromCenter / maxDist);
    });

    // Set instance colors
    meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    meshRef.current.geometry.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(opacities, 1));

    edgesRef.current.instanceColor = new THREE.InstancedBufferAttribute(edgeColors, 3);

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.count = cells.length;
    edgesRef.current.instanceMatrix.needsUpdate = true;
    edgesRef.current.count = cells.length;
  }, [cells, offset, center, gridSize, colorScale]);

  const cellSize = 1 - margin;
  const edgeSize = cellSize + 0.05;

  return (
    <group key={`cells-${margin}`}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, 8000]}>
        <boxGeometry args={[cellSize, cellSize, cellSize]} />
        <shaderMaterial
          vertexShader={cellShaderMaterial.vertexShader}
          fragmentShader={cellShaderMaterial.fragmentShader}
          transparent
          vertexColors
        />
      </instancedMesh>
      <instancedMesh ref={edgesRef} args={[undefined, undefined, 8000]}>
        <boxGeometry args={[edgeSize, edgeSize, edgeSize]} />
        <meshBasicMaterial wireframe vertexColors />
      </instancedMesh>
    </group>
  );
}

// Bounding box wireframe
function BoundingBox({ size }: { size: number }) {
  return (
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
      <lineBasicMaterial color="#333366" />
    </lineSegments>
  );
}

// Interactive grid for cell selection
function InteractiveGrid({
  gridSize,
  grid,
  onToggle,
  onSetCell,
  onCommunityChange,
}: {
  gridSize: number;
  grid: Grid3D;
  onToggle: (x: number, y: number, z: number) => void;
  onSetCell: (x: number, y: number, z: number, alive: boolean) => void;
  onCommunityChange: (community: Array<[number, number, number]>) => void;
}) {
  const [hovered, setHovered] = useState<[number, number, number] | null>(null);
  const [depthOffset, setDepthOffset] = useState(0);
  const rayInfoRef = useRef<{ point: THREE.Vector3; direction: THREE.Vector3 } | null>(null);
  const isDragging = useRef(false);
  const dragMode = useRef<'place' | 'remove' | null>(null);
  const affectedCells = useRef<Set<string>>(new Set());
  const offset = gridSize / 2;

  // Calculate cell position from ray and depth
  const calculateCell = useCallback((point: THREE.Vector3, direction: THREE.Vector3, depth: number) => {
    const adjustedPoint = point.clone().add(direction.clone().multiplyScalar(depth));
    const x = Math.floor(adjustedPoint.x + offset);
    const y = Math.floor(adjustedPoint.y + offset);
    const z = Math.floor(adjustedPoint.z + offset);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && z >= 0 && z < gridSize) {
      return [x, y, z] as [number, number, number];
    }
    return null;
  }, [gridSize, offset]);

  const cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    isDragging.current = true;
    affectedCells.current.clear();

    if (hovered) {
      const key = cellKey(hovered[0], hovered[1], hovered[2]);
      // Determine mode based on shift key: shift = remove, normal = place
      dragMode.current = e.shiftKey ? 'remove' : 'place';
      affectedCells.current.add(key);
      onSetCell(hovered[0], hovered[1], hovered[2], dragMode.current === 'place');
    }
  }, [hovered, onSetCell]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    dragMode.current = null;
    affectedCells.current.clear();
  }, []);

  const handlePointerMove = useCallback((e: any) => {
    e.stopPropagation();
    const point = e.point.clone();
    const direction = e.ray.direction.clone().normalize();
    rayInfoRef.current = { point, direction };

    const cell = calculateCell(point, direction, depthOffset);
    setHovered(cell);

    // Get community if hovering over a live cell
    if (cell && grid.get(cell[0], cell[1], cell[2])) {
      onCommunityChange(grid.getCommunity(cell[0], cell[1], cell[2]));
    } else {
      onCommunityChange([]);
    }

    // If dragging, place/remove cells
    if (isDragging.current && cell && dragMode.current) {
      const key = cellKey(cell[0], cell[1], cell[2]);
      if (!affectedCells.current.has(key)) {
        affectedCells.current.add(key);
        onSetCell(cell[0], cell[1], cell[2], dragMode.current === 'place');
      }
    }
  }, [calculateCell, depthOffset, onSetCell, grid, onCommunityChange]);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    // Only toggle on click if we weren't dragging
    if (hovered && affectedCells.current.size <= 1) {
      onToggle(hovered[0], hovered[1], hovered[2]);
    }
  }, [hovered, onToggle]);

  const handlePointerLeave = useCallback(() => {
    setHovered(null);
    onCommunityChange([]);
    rayInfoRef.current = null;
    setDepthOffset(0);
    isDragging.current = false;
    dragMode.current = null;
    affectedCells.current.clear();
  }, [onCommunityChange]);

  // Handle scroll for depth adjustment
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!rayInfoRef.current) return;

      // Check if we're over the canvas
      const target = e.target as HTMLElement;
      if (!target.closest('canvas')) return;

      // Shift + scroll = decrease depth, scroll = increase depth
      const delta = e.shiftKey ? -1 : 1;
      const scrollDirection = e.deltaY > 0 ? 1 : -1;
      const change = delta * scrollDirection;

      setDepthOffset((prev) => {
        const newDepth = prev + change;
        // Clamp to reasonable bounds
        return Math.max(-gridSize, Math.min(gridSize, newDepth));
      });

      e.preventDefault();
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [gridSize]);

  // Global pointer up listener
  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerUp]);

  // Update hovered cell when depth changes
  useEffect(() => {
    if (rayInfoRef.current) {
      const cell = calculateCell(rayInfoRef.current.point, rayInfoRef.current.direction, depthOffset);
      setHovered(cell);
    }
  }, [depthOffset, calculateCell]);

  return (
    <group>
      {/* Invisible box for raycasting */}
      <mesh
        visible={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        onPointerLeave={handlePointerLeave}
      >
        <boxGeometry args={[gridSize, gridSize, gridSize]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Highlight cube for hovered cell */}
      {hovered && (
        <mesh position={[hovered[0] - offset + 0.5, hovered[1] - offset + 0.5, hovered[2] - offset + 0.5]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} wireframe={false} />
        </mesh>
      )}
      {hovered && (
        <lineSegments position={[hovered[0] - offset + 0.5, hovered[1] - offset + 0.5, hovered[2] - offset + 0.5]}>
          <edgesGeometry args={[new THREE.BoxGeometry(1.02, 1.02, 1.02)]} />
          <lineBasicMaterial color="#ffffff" linewidth={2} />
        </lineSegments>
      )}
    </group>
  );
}

// Main scene with game loop
function Scene({
  grid,
  running,
  speed,
  rules,
  generation,
  cellMargin,
  rotationMode,
  onTick,
  onToggleCell,
  onSetCell,
  onCommunityChange
}: {
  grid: Grid3D;
  running: boolean;
  speed: number;
  rules: { surviveMin: number; surviveMax: number; birthMin: number; birthMax: number };
  generation: number;
  cellMargin: number;
  rotationMode: boolean;
  onTick: () => void;
  onToggleCell: (x: number, y: number, z: number) => void;
  onSetCell: (x: number, y: number, z: number, alive: boolean) => void;
  onCommunityChange: (community: Array<[number, number, number]>) => void;
}) {
  const lastTick = useRef(0);
  const [cells, setCells] = useState<Array<[number, number, number]>>([]);

  useEffect(() => {
    setCells(grid.getLivingCells());
  }, [generation]);

  useFrame((state) => {
    if (running) {
      const elapsed = state.clock.getElapsedTime();
      if (elapsed - lastTick.current > 1 / speed) {
        lastTick.current = elapsed;
        onTick();
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[30, 30, 30]} intensity={1} />
      <pointLight position={[-30, -30, -30]} intensity={0.5} />
      <Cells cells={cells} gridSize={grid.size} margin={cellMargin} />
      <BoundingBox size={grid.size} />
      {!rotationMode && <InteractiveGrid gridSize={grid.size} grid={grid} onToggle={onToggleCell} onSetCell={onSetCell} onCommunityChange={onCommunityChange} />}
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} enabled={rotationMode} />
      <PerspectiveCamera makeDefault position={[30, 25, 30]} />
    </>
  );
}

// Rotating community 3D preview
function CommunityPreview({ community }: { community: Array<[number, number, number]> }) {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate center offset to center the community
  const { cells, maxDim } = useMemo(() => {
    if (community.length === 0) return { cells: [], maxDim: 1 };

    const minX = Math.min(...community.map(c => c[0]));
    const maxX = Math.max(...community.map(c => c[0]));
    const minY = Math.min(...community.map(c => c[1]));
    const maxY = Math.max(...community.map(c => c[1]));
    const minZ = Math.min(...community.map(c => c[2]));
    const maxZ = Math.max(...community.map(c => c[2]));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const maxDim = Math.max(maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1);

    return {
      cells: community.map(([x, y, z]) => [x - centerX, y - centerY, z - centerZ] as [number, number, number]),
      maxDim
    };
  }, [community]);

  // Auto-rotate
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
    }
  });

  const scale = 4 / Math.max(maxDim, 1);

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {cells.map((cell, i) => (
        <mesh key={i} position={[cell[0], cell[1], cell[2]]}>
          <boxGeometry args={[0.85, 0.85, 0.85]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {cells.map((cell, i) => (
        <lineSegments key={`edge-${i}`} position={[cell[0], cell[1], cell[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.9, 0.9, 0.9)]} />
          <lineBasicMaterial color="#00ffaa" />
        </lineSegments>
      ))}
    </group>
  );
}

// Community sidebar visualization
function CommunitySidebar({ community }: { community: Array<[number, number, number]> }) {
  if (community.length === 0) {
    return (
      <div className="community-sidebar">
        <h3>Community</h3>
        <p className="no-community">Hover over a cell in Edit mode</p>
      </div>
    );
  }

  // Calculate bounding box
  const minX = Math.min(...community.map(c => c[0]));
  const maxX = Math.max(...community.map(c => c[0]));
  const minY = Math.min(...community.map(c => c[1]));
  const maxY = Math.max(...community.map(c => c[1]));
  const minZ = Math.min(...community.map(c => c[2]));
  const maxZ = Math.max(...community.map(c => c[2]));

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const depth = maxZ - minZ + 1;

  return (
    <div className="community-sidebar">
      <h3>Community</h3>
      <div className="community-stats">
        <span>Cells: {community.length}</span>
        <span>Size: {width}×{height}×{depth}</span>
      </div>
      <div className="community-3d">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <CommunityPreview community={community} />
        </Canvas>
      </div>
    </div>
  );
}

export default function App() {
  const gridRef = useRef(new Grid3D(20));
  const [running, setRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [cellCount, setCellCount] = useState(0);
  const [rotationMode, setRotationMode] = useState(true);
  const [community, setCommunity] = useState<Array<[number, number, number]>>([]);
  const hasMounted = useRef(false);

  const handleCommunityChange = useCallback((newCommunity: Array<[number, number, number]>) => {
    setCommunity(newCommunity);
  }, []);

  // Toggle rotation mode with 'r' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        // Don't toggle if typing in an input
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        setRotationMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Leva controls with localStorage persistence
  const { speed, density, cellMargin } = useControls("Simulation", {
    speed: { value: storedSettings.speed, min: 1, max: 30, step: 1, label: "Speed (fps)" },
    density: { value: storedSettings.density, min: 0.01, max: 0.3, step: 0.01, label: "Random Density" },
    cellMargin: { value: storedSettings.cellMargin, min: 0, max: 0.45, step: 0.05, label: "Cell Margin" },
  });

  const rules = useControls("Rules (18 neighbors)", {
    surviveMin: { value: storedSettings.surviveMin, min: 0, max: 18, step: 1, label: "Survive Min" },
    surviveMax: { value: storedSettings.surviveMax, min: 0, max: 18, step: 1, label: "Survive Max" },
    birthMin: { value: storedSettings.birthMin, min: 0, max: 18, step: 1, label: "Birth Min" },
    birthMax: { value: storedSettings.birthMax, min: 0, max: 18, step: 1, label: "Birth Max" },
  });

  // Persist settings to localStorage (skip initial render)
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const settings = {
      speed,
      density,
      cellMargin,
      surviveMin: rules.surviveMin,
      surviveMax: rules.surviveMax,
      birthMin: rules.birthMin,
      birthMax: rules.birthMax,
    };
    console.log("Saving settings:", settings);
    saveSettings(settings);
  }, [speed, density, cellMargin, rules.surviveMin, rules.surviveMax, rules.birthMin, rules.birthMax]);

  useControls("Actions", {
    "Start / Pause": button(() => setRunning((r) => !r)),
    "Step": button(() => {
      if (!running) {
        gridRef.current.tick(rules.surviveMin, rules.surviveMax, rules.birthMin, rules.birthMax);
        setGeneration((g) => g + 1);
        setCellCount(gridRef.current.getLivingCells().length);
      }
    }),
    "Random": button(() => {
      gridRef.current.randomize(density);
      setGeneration((g) => g + 1);
      setCellCount(gridRef.current.getLivingCells().length);
    }),
    "Reset": button(() => {
      setRunning(false);
      gridRef.current.clear();
      setGeneration(0);
      setCellCount(0);
    }),
  });

  const handleTick = useCallback(() => {
    gridRef.current.tick(rules.surviveMin, rules.surviveMax, rules.birthMin, rules.birthMax);
    setGeneration((g) => g + 1);
    setCellCount(gridRef.current.getLivingCells().length);
  }, [rules]);

  const handleToggleCell = useCallback((x: number, y: number, z: number) => {
    gridRef.current.toggle(x, y, z);
    setGeneration((g) => g + 1);
    setCellCount(gridRef.current.getLivingCells().length);
  }, []);

  const handleSetCell = useCallback((x: number, y: number, z: number, alive: boolean) => {
    gridRef.current.set(x, y, z, alive);
    setGeneration((g) => g + 1);
    setCellCount(gridRef.current.getLivingCells().length);
  }, []);

  return (
    <div className="app">
      <Leva collapsed={false} />
      <div className="canvas-container">
        <Canvas>
          <Scene
            grid={gridRef.current}
            running={running}
            speed={speed}
            rules={rules}
            generation={generation}
            cellMargin={cellMargin}
            rotationMode={rotationMode}
            onTick={handleTick}
            onToggleCell={handleToggleCell}
            onSetCell={handleSetCell}
            onCommunityChange={handleCommunityChange}
          />
        </Canvas>
      </div>

      <div className="ui-overlay">
        <h1>3D Game of Life</h1>
        <div className="stats">
          <span>Generation: {generation}</span>
          <span>Cells: {cellCount}</span>
          <span>{running ? "Running" : "Paused"}</span>
        </div>
        <div className="mode-indicator">
          Mode: {rotationMode ? "Rotate" : "Edit"} <span className="hint">(press R to toggle)</span>
        </div>
        <p className="instructions">
          {rotationMode
            ? "Drag to rotate. Scroll to zoom."
            : "Click to place/remove. Drag to paint. Scroll for depth."}
        </p>
      </div>

      <CommunitySidebar community={community} />
    </div>
  );
}
