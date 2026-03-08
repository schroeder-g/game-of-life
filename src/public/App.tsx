import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useControls, button, Leva, folder } from "leva";
import * as THREE from "three";
import chroma from "chroma-js";
import { ShapeType, SHAPES, generateShape, supportsHollow } from "./shapes";

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
  gridSize: 20,
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
      <instancedMesh ref={meshRef} args={[undefined, undefined, 50000]}>
        <boxGeometry args={[cellSize, cellSize, cellSize]} />
        <shaderMaterial
          vertexShader={cellShaderMaterial.vertexShader}
          fragmentShader={cellShaderMaterial.fragmentShader}
          transparent
          vertexColors
        />
      </instancedMesh>
      <instancedMesh ref={edgesRef} args={[undefined, undefined, 50000]}>
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

// Shape preview component
function ShapePreview({
  selectorPos,
  gridSize,
  selectedShape,
  shapeSize,
  isHollow,
}: {
  selectorPos: [number, number, number];
  gridSize: number;
  selectedShape: ShapeType;
  shapeSize: number;
  isHollow: boolean;
}) {
  const offset = gridSize / 2;

  // Generate preview cells
  const previewCells = useMemo(() => {
    if (selectedShape === "None") return [];

    const offsets = generateShape(selectedShape, shapeSize, isHollow);
    return offsets
      .map(([dx, dy, dz]) => [
        selectorPos[0] + dx,
        selectorPos[1] + dy,
        selectorPos[2] + dz,
      ] as [number, number, number])
      .filter(
        ([x, y, z]) =>
          x >= 0 && x < gridSize &&
          y >= 0 && y < gridSize &&
          z >= 0 && z < gridSize
      );
  }, [selectorPos, selectedShape, shapeSize, isHollow, gridSize]);

  if (previewCells.length === 0) return null;

  return (
    <group>
      {previewCells.map((cell, i) => (
        <mesh
          key={i}
          position={[cell[0] - offset, cell[1] - offset, cell[2] - offset]}
        >
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.35} />
        </mesh>
      ))}
      {previewCells.map((cell, i) => (
        <lineSegments
          key={`edge-${i}`}
          position={[cell[0] - offset, cell[1] - offset, cell[2] - offset]}
        >
          <edgesGeometry args={[new THREE.BoxGeometry(0.92, 0.92, 0.92)]} />
          <lineBasicMaterial color="#ffaa00" />
        </lineSegments>
      ))}
    </group>
  );
}

// Keyboard-based selector for cell editing
function KeyboardSelector({
  gridSize,
  grid,
  controlsRef,
  selectedShape,
  shapeSize,
  isHollow,
  onToggle,
  onSetCells,
  onClearShape,
  onSizeChange,
  onCommunityChange,
  onSelectorChange,
}: {
  gridSize: number;
  grid: Grid3D;
  controlsRef: React.RefObject<any>;
  selectedShape: ShapeType;
  shapeSize: number;
  isHollow: boolean;
  onToggle: (x: number, y: number, z: number) => void;
  onSetCells: (cells: Array<[number, number, number]>) => void;
  onClearShape: () => void;
  onSizeChange: (delta: number) => void;
  onCommunityChange: (community: Array<[number, number, number]>) => void;
  onSelectorChange: (pos: [number, number, number]) => void;
}) {
  const center = Math.floor(gridSize / 2);
  const [selectorPos, setSelectorPos] = useState<[number, number, number]>([center, center, center]);
  const offset = gridSize / 2;
  const [spaceHeld, setSpaceHeld] = useState(false);
  const lastPaintedPos = useRef<string | null>(null);

  // Notify parent of selector position changes
  useEffect(() => {
    onSelectorChange(selectorPos);
  }, [selectorPos, onSelectorChange]);

  // Update community when selector moves over a live cell
  useEffect(() => {
    if (grid.get(selectorPos[0], selectorPos[1], selectorPos[2])) {
      onCommunityChange(grid.getCommunity(selectorPos[0], selectorPos[1], selectorPos[2]));
    } else {
      onCommunityChange([]);
    }
  }, [selectorPos, grid, onCommunityChange]);

  // Continuous painting: toggle cell when moving with space held
  useEffect(() => {
    if (spaceHeld && selectedShape === "None") {
      const posKey = `${selectorPos[0]},${selectorPos[1]},${selectorPos[2]}`;
      if (lastPaintedPos.current !== posKey) {
        lastPaintedPos.current = posKey;
        onToggle(selectorPos[0], selectorPos[1], selectorPos[2]);
      }
    }
  }, [selectorPos, spaceHeld, selectedShape, onToggle]);

  // Wheel event handler for shape size (capture phase)
  useEffect(() => {
    if (selectedShape === "None") return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 1 : -1;
      onSizeChange(delta);
    };

    window.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true });
  }, [selectedShape, onSizeChange]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      // Handle Escape to clear shape
      if (e.code === 'Escape' && selectedShape !== "None") {
        e.preventDefault();
        onClearShape();
        return;
      }

      // Handle Space
      if (e.code === 'Space') {
        e.preventDefault();
        if (selectedShape !== "None") {
          // Shape mode: place shape
          const offsets = generateShape(selectedShape, shapeSize, isHollow);
          const cells = offsets
            .map(([dx, dy, dz]) => [
              selectorPos[0] + dx,
              selectorPos[1] + dy,
              selectorPos[2] + dz,
            ] as [number, number, number])
            .filter(
              ([x, y, z]) =>
                x >= 0 && x < gridSize &&
                y >= 0 && y < gridSize &&
                z >= 0 && z < gridSize
            );
          onSetCells(cells);
        } else {
          // Paint mode: toggle single cell and start continuous painting
          if (!spaceHeld) {
            setSpaceHeld(true);
            lastPaintedPos.current = `${selectorPos[0]},${selectorPos[1]},${selectorPos[2]}`;
            onToggle(selectorPos[0], selectorPos[1], selectorPos[2]);
          }
        }
        return;
      }

      // Handle arrow keys for movement
      if (!e.key.startsWith('Arrow')) return;
      e.preventDefault();

      // Get camera's azimuthal angle (Y-axis rotation)
      const azimuth = controlsRef.current?.getAzimuthalAngle() ?? 0;

      // Camera right vector (XZ plane)
      const rightX = Math.cos(azimuth);
      const rightZ = Math.sin(azimuth);

      // Camera forward vector (XZ plane) - points away from camera
      const forwardX = Math.sin(azimuth);
      const forwardZ = -Math.cos(azimuth);

      // Quantize to nearest axis for grid movement
      const quantizeToAxis = (x: number, z: number): [number, number, number] => {
        if (Math.abs(x) >= Math.abs(z)) {
          return [Math.sign(x), 0, 0];
        } else {
          return [0, 0, Math.sign(z)];
        }
      };

      let dx = 0, dy = 0, dz = 0;

      if (e.shiftKey) {
        // Shift + Up/Down moves in depth (forward/back relative to camera)
        if (e.key === 'ArrowUp') {
          [dx, dy, dz] = quantizeToAxis(forwardX, forwardZ);
        } else if (e.key === 'ArrowDown') {
          [dx, dy, dz] = quantizeToAxis(-forwardX, -forwardZ);
        }
      } else {
        // Left/Right moves horizontally relative to camera
        if (e.key === 'ArrowRight') {
          [dx, dy, dz] = quantizeToAxis(rightX, rightZ);
        } else if (e.key === 'ArrowLeft') {
          [dx, dy, dz] = quantizeToAxis(-rightX, -rightZ);
        // Up/Down moves in Y direction (height)
        } else if (e.key === 'ArrowUp') {
          dy = 1;
        } else if (e.key === 'ArrowDown') {
          dy = -1;
        }
      }

      if (dx !== 0 || dy !== 0 || dz !== 0) {
        setSelectorPos((prev) => {
          const newX = Math.max(0, Math.min(gridSize - 1, prev[0] + dx));
          const newY = Math.max(0, Math.min(gridSize - 1, prev[1] + dy));
          const newZ = Math.max(0, Math.min(gridSize - 1, prev[2] + dz));
          return [newX, newY, newZ];
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
        lastPaintedPos.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectorPos, gridSize, controlsRef, onToggle, selectedShape, shapeSize, isHollow, onSetCells, onClearShape, spaceHeld]);

  return (
    <group>
      {/* Shape preview */}
      <ShapePreview
        selectorPos={selectorPos}
        gridSize={gridSize}
        selectedShape={selectedShape}
        shapeSize={shapeSize}
        isHollow={isHollow}
      />
      {/* Selector cube */}
      <mesh position={[selectorPos[0] - offset, selectorPos[1] - offset, selectorPos[2] - offset]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
      <lineSegments position={[selectorPos[0] - offset, selectorPos[1] - offset, selectorPos[2] - offset]}>
        <edgesGeometry args={[new THREE.BoxGeometry(1.02, 1.02, 1.02)]} />
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </lineSegments>
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
  renderKey,
  cellMargin,
  rotationMode,
  selectedShape,
  shapeSize,
  isHollow,
  onTick,
  onToggleCell,
  onSetCells,
  onClearShape,
  onSizeChange,
  onCommunityChange,
  onSelectorChange
}: {
  grid: Grid3D;
  running: boolean;
  speed: number;
  rules: { surviveMin: number; surviveMax: number; birthMin: number; birthMax: number };
  generation: number;
  renderKey: number;
  cellMargin: number;
  rotationMode: boolean;
  selectedShape: ShapeType;
  shapeSize: number;
  isHollow: boolean;
  onTick: () => void;
  onToggleCell: (x: number, y: number, z: number) => void;
  onSetCells: (cells: Array<[number, number, number]>) => void;
  onClearShape: () => void;
  onSizeChange: (delta: number) => void;
  onCommunityChange: (community: Array<[number, number, number]>) => void;
  onSelectorChange: (pos: [number, number, number]) => void;
}) {
  const lastTick = useRef(0);
  const controlsRef = useRef<any>(null);
  const [cells, setCells] = useState<Array<[number, number, number]>>([]);

  useEffect(() => {
    setCells(grid.getLivingCells());
  }, [generation, renderKey]);

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
      {!rotationMode && (
        <KeyboardSelector
          gridSize={grid.size}
          grid={grid}
          controlsRef={controlsRef}
          selectedShape={selectedShape}
          shapeSize={shapeSize}
          isHollow={isHollow}
          onToggle={onToggleCell}
          onSetCells={onSetCells}
          onClearShape={onClearShape}
          onSizeChange={onSizeChange}
          onCommunityChange={onCommunityChange}
          onSelectorChange={onSelectorChange}
        />
      )}
      <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.05} enabled={rotationMode} />
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
  const [gridSize, setGridSize] = useState(storedSettings.gridSize);
  const gridRef = useRef(new Grid3D(storedSettings.gridSize));
  const initialStateRef = useRef<Array<[number, number, number]>>([]);
  const [running, setRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [renderKey, setRenderKey] = useState(0); // For triggering re-renders on cell edits
  const [cellCount, setCellCount] = useState(0);
  const [rotationMode, setRotationMode] = useState(true);
  const [community, setCommunity] = useState<Array<[number, number, number]>>([]);
  const [selectorPos, setSelectorPos] = useState<[number, number, number] | null>(null);
  const hasMounted = useRef(false);

  // Shape brush state
  const [selectedShape, setSelectedShape] = useState<ShapeType>("None");
  const [shapeSize, setShapeSize] = useState<number>(3);
  const [isHollow, setIsHollow] = useState<boolean>(false);

  // Handle grid size changes
  const handleGridSizeChange = useCallback((newSize: number) => {
    setRunning(false);
    gridRef.current = new Grid3D(newSize);
    initialStateRef.current = [];
    setGridSize(newSize);
    setGeneration(0);
    setCellCount(0);
    setCommunity([]);
  }, []);

  const handleCommunityChange = useCallback((newCommunity: Array<[number, number, number]>) => {
    setCommunity(newCommunity);
  }, []);

  const handleSelectorChange = useCallback((pos: [number, number, number]) => {
    setSelectorPos(pos);
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

  // Grid size control
  useControls("Environment", {
    "Grid Size": {
      value: gridSize,
      min: 10,
      max: 40,
      step: 10,
      onChange: handleGridSizeChange,
    },
  }, [gridSize, handleGridSizeChange]);

  const rules = useControls("Rules (18 neighbors)", {
    surviveMin: { value: storedSettings.surviveMin, min: 0, max: 18, step: 1, label: "Survive Min" },
    surviveMax: { value: storedSettings.surviveMax, min: 0, max: 18, step: 1, label: "Survive Max" },
    birthMin: { value: storedSettings.birthMin, min: 0, max: 18, step: 1, label: "Birth Min" },
    birthMax: { value: storedSettings.birthMax, min: 0, max: 18, step: 1, label: "Birth Max" },
  });

  // Shape Brush panel
  useControls(
    "Shape Brush",
    {
      Shape: {
        value: selectedShape,
        options: SHAPES.reduce((acc, shape) => ({ ...acc, [shape]: shape }), {}),
        onChange: (v: ShapeType) => setSelectedShape(v),
      },
      Size: {
        value: shapeSize,
        min: 1,
        max: 10,
        step: 1,
        onChange: (v: number) => setShapeSize(v),
      },
      Hollow: {
        value: isHollow,
        onChange: (v: boolean) => setIsHollow(v),
        render: () => supportsHollow(selectedShape),
      },
    },
    [selectedShape, shapeSize, isHollow]
  );

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
      gridSize,
      surviveMin: rules.surviveMin,
      surviveMax: rules.surviveMax,
      birthMin: rules.birthMin,
      birthMax: rules.birthMax,
    };
    console.log("Saving settings:", settings);
    saveSettings(settings);
  }, [speed, density, cellMargin, gridSize, rules.surviveMin, rules.surviveMax, rules.birthMin, rules.birthMax]);

  useControls("Actions", {
    [running ? "Stop" : "Play"]: button(() => {
      if (!running && generation === 0) {
        // Save initial state when starting from generation 0
        initialStateRef.current = gridRef.current.saveState();
      }
      setRunning((r) => !r);
    }),
    "Step": button(() => {
      if (!running) {
        if (generation === 0) {
          // Save initial state before first step
          initialStateRef.current = gridRef.current.saveState();
        }
        gridRef.current.tick(rules.surviveMin, rules.surviveMax, rules.birthMin, rules.birthMax);
        setGeneration((g) => g + 1);
        setCellCount(gridRef.current.getLivingCells().length);
      }
    }),
    "Random": button(() => {
      gridRef.current.randomize(density);
      initialStateRef.current = gridRef.current.saveState();
      setGeneration(0);
      setCellCount(gridRef.current.getLivingCells().length);
    }),
    "Reset": button(() => {
      setRunning(false);
      gridRef.current.restoreState(initialStateRef.current);
      setGeneration(0);
      setCellCount(gridRef.current.getLivingCells().length);
    }),
    "Clear": button(() => {
      setRunning(false);
      gridRef.current.clear();
      initialStateRef.current = [];
      setGeneration(0);
      setCellCount(0);
    }),
  }, [running, generation]);

  const handleTick = useCallback(() => {
    gridRef.current.tick(rules.surviveMin, rules.surviveMax, rules.birthMin, rules.birthMax);
    setGeneration((g) => g + 1);
    setCellCount(gridRef.current.getLivingCells().length);
  }, [rules]);

  const handleToggleCell = useCallback((x: number, y: number, z: number) => {
    gridRef.current.toggle(x, y, z);
    setRenderKey((k) => k + 1);
    setCellCount(gridRef.current.getLivingCells().length);
  }, []);

  const handleSetCells = useCallback((cells: Array<[number, number, number]>) => {
    for (const [x, y, z] of cells) {
      gridRef.current.set(x, y, z, true);
    }
    setRenderKey((k) => k + 1);
    setCellCount(gridRef.current.getLivingCells().length);
  }, []);

  const handleClearShape = useCallback(() => {
    setSelectedShape("None");
  }, []);

  const handleSizeChange = useCallback((delta: number) => {
    setShapeSize((prev) => Math.max(1, Math.min(10, prev + delta)));
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
            renderKey={renderKey}
            cellMargin={cellMargin}
            rotationMode={rotationMode}
            selectedShape={selectedShape}
            shapeSize={shapeSize}
            isHollow={isHollow}
            onTick={handleTick}
            onToggleCell={handleToggleCell}
            onSetCells={handleSetCells}
            onClearShape={handleClearShape}
            onSizeChange={handleSizeChange}
            onCommunityChange={handleCommunityChange}
            onSelectorChange={handleSelectorChange}
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
        {!rotationMode && selectorPos && (
          <div className="selector-pos">
            Position: ({selectorPos[0]}, {selectorPos[1]}, {selectorPos[2]})
          </div>
        )}
        {!rotationMode && selectedShape !== "None" && (
          <div className="shape-info">
            Shape: {selectedShape} ({shapeSize}x{shapeSize}{supportsHollow(selectedShape) ? `x${shapeSize}` : ""})
            {isHollow && supportsHollow(selectedShape) && " (hollow)"}
          </div>
        )}
        <p className="instructions">
          {rotationMode
            ? "Drag to rotate. Scroll to zoom."
            : selectedShape !== "None"
            ? "Space: place shape. Scroll: size. Escape: cancel."
            : "Arrows: move/height. Shift+Arrows: depth. Space: toggle/paint."}
        </p>
      </div>

      <CommunitySidebar community={community} />
    </div>
  );
}
