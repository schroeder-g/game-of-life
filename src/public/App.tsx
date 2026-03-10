import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommunitySidebar } from "../components/Controls";
import { Scene } from "../components/Grid";
import { MainMenu } from "../components/MainMenu";
import { Grid3D } from "../core/Grid3D";
import { ShapeType, supportsHollow } from "../core/shapes";
import {
  exportGenesisConfig,
  GenesisConfig,
  importGenesisConfig,
  loadGenesisConfigs,
  saveGenesisConfigs,
} from "../hooks/useGenesisConfigs";
import { loadSettings, saveSettings } from "../hooks/useSettings";

// Load settings once at startup
const initialSettings = loadSettings();
console.log("Loaded from localStorage:", initialSettings);

const defaults = {
  speed: 5,
  density: 0.08,
  surviveMin: 2,
  surviveMax: 2,
  birthMin: 3,
  birthMax: 3,
  birthMargin: 0,
  cellMargin: 0.2,
  gridSize: 24,
};

// Merge with defaults
const storedSettings = { ...defaults, ...initialSettings };
console.log("Using settings:", storedSettings);

function SimulationStats({
  grid,
  running,
}: {
  grid: Grid3D;
  running: boolean;
}) {
  const [stats, setStats] = useState({
    generation: grid.generation,
    cells: grid.getLivingCells().length,
  });

  const lastVersionRef = useRef(grid.version);

  useEffect(() => {
    const interval = setInterval(() => {
      if (grid.version !== lastVersionRef.current) {
        lastVersionRef.current = grid.version;
        setStats({
          generation: grid.generation,
          cells: grid.getLivingCells().length,
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [grid]);

  return (
    <div className="stats">
      <span>Generation: {stats.generation}</span>
      <span>Cells: {stats.cells}</span>
      <span>{running ? "Running" : "Paused"}</span>
    </div>
  );
}

export default function App() {
  const [gridSize, setGridSize] = useState(storedSettings.gridSize);
  const gridRef = useRef(new Grid3D(storedSettings.gridSize));
  const initialStateRef = useRef<Array<[number, number, number]>>([]);
  const isFirstLoadRef = useRef(true);

  if (isFirstLoadRef.current) {
    isFirstLoadRef.current = false;
    if (Object.keys(initialSettings).length === 0) {
      const mid = Math.floor(storedSettings.gridSize / 2);
      for (let x = mid - 1; x <= mid; x++) {
        for (let y = mid - 1; y <= mid; y++) {
          for (let z = mid - 1; z <= mid; z++) {
            gridRef.current.set(x, y, z, true);
            initialStateRef.current.push([x, y, z]);
          }
        }
      }
    }
  }

  const [running, setRunning] = useState(false);
  const [rotationMode, setRotationMode] = useState(true);
  const [community, setCommunity] = useState<Array<[number, number, number]>>(
    [],
  );
  const [selectorPos, setSelectorPos] = useState<
    [number, number, number] | null
  >(null);
  const hasMounted = useRef(false);

  // Shape brush state
  const [selectedShape, setSelectedShape] = useState<ShapeType>("None");
  const [shapeSize, setShapeSize] = useState<number>(3);
  const [isHollow, setIsHollow] = useState<boolean>(false);

  // Genesis config state
  const [savedConfigs, setSavedConfigs] = useState<
    Record<string, GenesisConfig>
  >(() => loadGenesisConfigs());
  const [selectedConfigName, setSelectedConfigName] = useState<string>("");
  const [newConfigName, setNewConfigName] = useState<string>("");

  // Simulation parameters previously in Leva
  const [speed, setSpeed] = useState(storedSettings.speed);
  const [density, setDensity] = useState(storedSettings.density);
  const [cellMargin, setCellMargin] = useState(storedSettings.cellMargin);
  const [surviveMin, setSurviveMin] = useState(storedSettings.surviveMin);
  const [surviveMax, setSurviveMax] = useState(storedSettings.surviveMax);
  const [birthMin, setBirthMin] = useState(storedSettings.birthMin);
  const [birthMax, setBirthMax] = useState(storedSettings.birthMax);
  const [birthMargin, setBirthMargin] = useState(storedSettings.birthMargin);

  // Handle grid size changes
  const handleGridSizeChange = useCallback((newSize: number) => {
    setRunning(false);
    gridRef.current = new Grid3D(newSize);
    initialStateRef.current = [];
    setGridSize(newSize);
    setCommunity([]);
  }, []);

  const handleCommunityChange = useCallback(
    (newCommunity: Array<[number, number, number]>) => {
      setCommunity(newCommunity);
    },
    [],
  );

  const handleSelectorChange = useCallback((pos: [number, number, number]) => {
    setSelectorPos(pos);
  }, []);

  // Toggle rotation mode with 'r' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        // Don't toggle if typing in an input
        if ((e.target as HTMLElement).tagName === "INPUT") return;
        setRotationMode((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      surviveMin,
      surviveMax,
      birthMin,
      birthMax,
      birthMargin,
    };
    console.log("Saving settings:", settings);
    saveSettings(settings);
  }, [
    speed,
    density,
    cellMargin,
    gridSize,
    surviveMin,
    surviveMax,
    birthMin,
    birthMax,
    birthMargin,
  ]);

  const handlePlayStop = () => {
    if (!running && gridRef.current.generation === 0) {
      // Save initial state when starting from generation 0
      initialStateRef.current = gridRef.current.saveState();
    }
    setRunning((r) => !r);
  };

  const handleStep = () => {
    if (!running) {
      if (gridRef.current.generation === 0) {
        // Save initial state before first step
        initialStateRef.current = gridRef.current.saveState();
      }
      gridRef.current.tick(
        surviveMin,
        surviveMax,
        birthMin,
        birthMax,
        birthMargin,
      );
    }
  };

  const handleRandom = () => {
    gridRef.current.randomize(density);
    initialStateRef.current = gridRef.current.saveState();
  };

  const handleReset = () => {
    setRunning(false);
    gridRef.current.restoreState(initialStateRef.current);
  };

  const handleClear = () => {
    setRunning(false);
    gridRef.current.clear();
    initialStateRef.current = [];
  };

  // Create current genesis config from current state
  const createCurrentGenesisConfig = useCallback(
    (name: string): GenesisConfig => {
      return {
        name,
        cells:
          initialStateRef.current.length > 0
            ? initialStateRef.current
            : gridRef.current.getLivingCells(),
        settings: {
          speed,
          density,
          surviveMin,
          surviveMax,
          birthMin,
          birthMax,
          birthMargin,
          cellMargin,
          gridSize,
        },
        createdAt: new Date().toISOString(),
      };
    },
    [
      speed,
      density,
      surviveMin,
      surviveMax,
      birthMin,
      birthMax,
      birthMargin,
      cellMargin,
      gridSize,
    ],
  );

  // Apply a genesis config
  const applyGenesisConfig = useCallback(
    (config: GenesisConfig) => {
      setRunning(false);

      // Update grid size if different
      if (config.settings.gridSize !== gridSize) {
        gridRef.current = new Grid3D(config.settings.gridSize);
        setGridSize(config.settings.gridSize);
      } else {
        gridRef.current.clear();
      }

      // Restore cells
      gridRef.current.restoreState(config.cells);
      initialStateRef.current = config.cells;

      setCommunity([]);
    },
    [gridSize],
  );

  const handleSaveConfig = useCallback(() => {
    const name = newConfigName.trim() || `Config ${Date.now()}`;
    const config = createCurrentGenesisConfig(name);
    const newConfigs = { ...savedConfigs, [name]: config };
    setSavedConfigs(newConfigs);
    saveGenesisConfigs(newConfigs);
    setSelectedConfigName(name);
    setNewConfigName("");
  }, [newConfigName, createCurrentGenesisConfig, savedConfigs]);

  const handleExportConfig = useCallback(() => {
    const name = selectedConfigName || newConfigName.trim() || "export";
    const config =
      selectedConfigName && savedConfigs[selectedConfigName]
        ? savedConfigs[selectedConfigName]
        : createCurrentGenesisConfig(name);
    exportGenesisConfig(config);
  }, [
    selectedConfigName,
    newConfigName,
    savedConfigs,
    createCurrentGenesisConfig,
  ]);

  const handleImportConfig = useCallback(async () => {
    const config = await importGenesisConfig();
    if (config) {
      const newConfigs = { ...savedConfigs, [config.name]: config };
      setSavedConfigs(newConfigs);
      saveGenesisConfigs(newConfigs);
      setSelectedConfigName(config.name);
      applyGenesisConfig(config);
    }
  }, [savedConfigs, applyGenesisConfig]);

  const handleDeleteConfig = useCallback(() => {
    if (selectedConfigName && savedConfigs[selectedConfigName]) {
      const newConfigs = { ...savedConfigs };
      delete newConfigs[selectedConfigName];
      setSavedConfigs(newConfigs);
      saveGenesisConfigs(newConfigs);
      setSelectedConfigName("");
    }
  }, [selectedConfigName, savedConfigs]);

  const handleTick = useCallback(() => {
    gridRef.current.tick(
      surviveMin,
      surviveMax,
      birthMin,
      birthMax,
      birthMargin,
    );
  }, [surviveMin, surviveMax, birthMin, birthMax, birthMargin]);

  const handleToggleCell = useCallback((x: number, y: number, z: number) => {
    gridRef.current.toggle(x, y, z);
  }, []);

  const handleSetCells = useCallback(
    (cells: Array<[number, number, number]>) => {
      for (const [x, y, z] of cells) {
        gridRef.current.set(x, y, z, true);
      }
    },
    [],
  );

  const handleDeleteCells = useCallback(
    (cells: Array<[number, number, number]>) => {
      for (const [x, y, z] of cells) {
        gridRef.current.set(x, y, z, false);
      }
    },
    [],
  );

  const handleClearShape = useCallback(() => {
    setSelectedShape("None");
  }, []);

  const handleSizeChange = useCallback(
    (delta: number) => {
      setShapeSize((prev) => Math.max(1, Math.min(gridSize, prev + delta)));
    },
    [gridSize],
  );

  return (
    <div className="app">
      <div className="canvas-container">
        <Canvas>
          <Scene
            grid={gridRef.current}
            running={running}
            speed={speed}
            cellMargin={cellMargin}
            rotationMode={rotationMode}
            selectedShape={selectedShape}
            shapeSize={shapeSize}
            isHollow={isHollow}
            onTick={handleTick}
            onToggleCell={handleToggleCell}
            onSetCells={handleSetCells}
            onDeleteCells={handleDeleteCells}
            onClearShape={handleClearShape}
            onSizeChange={handleSizeChange}
            onCommunityChange={handleCommunityChange}
            onSelectorChange={handleSelectorChange}
          />
        </Canvas>
      </div>

      <div className="ui-overlay">
        <h1>3D Game of Life</h1>
        <p className="explainer">
          Explore a 3D adaptation of{" "}
          <a
            href="https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life"
            target="_blank"
            rel="noopener noreferrer"
          >
            Conway's Game of Life
          </a>{" "}
          by placing cells in the grid and watching them evolve.
        </p>
        <SimulationStats grid={gridRef.current} running={running} />
        <div className="mode-indicator">
          Mode: {rotationMode ? "Rotate" : "Edit"}{" "}
          <span className="hint">(press R to toggle)</span>
        </div>
        {!rotationMode && selectorPos && (
          <div className="selector-pos">
            Position: ({selectorPos[0]}, {selectorPos[1]}, {selectorPos[2]})
          </div>
        )}
        {!rotationMode && selectedShape !== "None" && (
          <div className="shape-info">
            Shape: {selectedShape} ({shapeSize}x{shapeSize}
            {supportsHollow(selectedShape) ? `x${shapeSize}` : ""})
            {isHollow && supportsHollow(selectedShape) && " (hollow)"}
          </div>
        )}
        <p className="instructions">
          {rotationMode
            ? "Drag to rotate. Scroll to zoom."
            : selectedShape !== "None"
              ? "Space: place. Backspace: delete. Scroll: size. Esc: cancel."
              : "Arrows: move. Space: toggle. Backspace: delete."}
        </p>
      </div>

      <MainMenu
        running={running}
        onPlayStop={handlePlayStop}
        onStep={handleStep}
        onRandom={handleRandom}
        onReset={handleReset}
        onClear={handleClear}
        gridSize={gridSize}
        onGridSizeChange={handleGridSizeChange}
        speed={speed}
        onSpeedChange={setSpeed}
        density={density}
        onDensityChange={setDensity}
        cellMargin={cellMargin}
        onCellMarginChange={setCellMargin}
        surviveMin={surviveMin}
        onSurviveMinChange={setSurviveMin}
        surviveMax={surviveMax}
        onSurviveMaxChange={setSurviveMax}
        birthMin={birthMin}
        onBirthMinChange={setBirthMin}
        birthMax={birthMax}
        onBirthMaxChange={setBirthMax}
        birthMargin={birthMargin}
        onBirthMarginChange={setBirthMargin}
        selectedShape={selectedShape}
        onShapeChange={setSelectedShape}
        shapeSize={shapeSize}
        onShapeSizeChange={setShapeSize}
        isHollow={isHollow}
        onHollowChange={setIsHollow}
        savedConfigs={savedConfigs}
        selectedConfigName={selectedConfigName}
        onSelectConfig={(name) => {
          setSelectedConfigName(name);
          if (name && savedConfigs[name])
            applyGenesisConfig(savedConfigs[name]);
        }}
        newConfigName={newConfigName}
        onNewConfigNameChange={setNewConfigName}
        onSaveConfig={handleSaveConfig}
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
        onDeleteConfig={handleDeleteConfig}
      />

      {!running && <CommunitySidebar community={community} />}
    </div>
  );
}
