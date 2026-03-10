import { Canvas } from "@react-three/fiber";
import { button, Leva, useControls } from "leva";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CommunitySidebar } from "../components/Controls";
import { Scene } from "../components/Grid";
import { Grid3D } from "../core/Grid3D";
import { SHAPES, ShapeType, supportsHollow } from "../core/shapes";
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
  surviveMin: 3,
  surviveMax: 4,
  birthMin: 5,
  birthMax: 5,
  birthMargin: 0,
  cellMargin: 0.2,
  gridSize: 20,
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

  // Leva controls with localStorage persistence
  const { speed, density, cellMargin } = useControls("Simulation", {
    speed: {
      value: storedSettings.speed,
      min: 1,
      max: 30,
      step: 1,
      label: "Speed (fps)",
    },
    density: {
      value: storedSettings.density,
      min: 0.01,
      max: 0.3,
      step: 0.01,
      label: "Random Density",
    },
    cellMargin: {
      value: storedSettings.cellMargin,
      min: 0,
      max: 0.45,
      step: 0.05,
      label: "Cell Margin",
    },
  });

  // Grid size control
  useControls(
    "Environment",
    {
      "Grid Size": {
        value: gridSize,
        min: 10,
        max: 40,
        step: 10,
        onChange: handleGridSizeChange,
      },
    },
    [gridSize, handleGridSizeChange],
  );

  const rules = useControls("Rules (18 neighbors)", {
    surviveMin: {
      value: storedSettings.surviveMin,
      min: 0,
      max: 18,
      step: 1,
      label: "Survive Min",
    },
    surviveMax: {
      value: storedSettings.surviveMax,
      min: 0,
      max: 18,
      step: 1,
      label: "Survive Max",
    },
    birthMin: {
      value: storedSettings.birthMin,
      min: 0,
      max: 18,
      step: 1,
      label: "Birth Min",
    },
    birthMax: {
      value: storedSettings.birthMax,
      min: 0,
      max: 18,
      step: 1,
      label: "Birth Max",
    },
    birthMargin: {
      value: storedSettings.birthMargin,
      min: 0,
      max: 10,
      step: 1,
      label: "Birth Margin",
    },
  });

  // Shape Brush panel
  useControls(
    "Shape Brush",
    {
      Shape: {
        value: selectedShape,
        options: SHAPES.reduce(
          (acc, shape) => ({ ...acc, [shape]: shape }),
          {},
        ),
        onChange: (v: ShapeType) => setSelectedShape(v),
      },
      Size: {
        value: shapeSize,
        min: 1,
        max: gridSize,
        step: 1,
        onChange: (v: number) => setShapeSize(v),
      },
      Hollow: {
        value: isHollow,
        onChange: (v: boolean) => setIsHollow(v),
        render: () => supportsHollow(selectedShape),
      },
    },
    [selectedShape, shapeSize, isHollow, gridSize],
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
      birthMargin: rules.birthMargin,
    };
    console.log("Saving settings:", settings);
    saveSettings(settings);
  }, [
    speed,
    density,
    cellMargin,
    gridSize,
    rules.surviveMin,
    rules.surviveMax,
    rules.birthMin,
    rules.birthMax,
    rules.birthMargin,
  ]);

  useControls(
    "Actions",
    {
      [running ? "Stop" : "Play"]: button(() => {
        if (!running && gridRef.current.generation === 0) {
          // Save initial state when starting from generation 0
          initialStateRef.current = gridRef.current.saveState();
        }
        setRunning((r) => !r);
      }),
      Step: button(() => {
        if (!running) {
          if (gridRef.current.generation === 0) {
            // Save initial state before first step
            initialStateRef.current = gridRef.current.saveState();
          }
          gridRef.current.tick(
            rules.surviveMin,
            rules.surviveMax,
            rules.birthMin,
            rules.birthMax,
            rules.birthMargin,
          );
        }
      }),
      Random: button(() => {
        gridRef.current.randomize(density);
        initialStateRef.current = gridRef.current.saveState();
      }),
      Reset: button(() => {
        setRunning(false);
        gridRef.current.restoreState(initialStateRef.current);
      }),
      Clear: button(() => {
        setRunning(false);
        gridRef.current.clear();
        initialStateRef.current = [];
      }),
    },
    [running, density, rules],
  );

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
          surviveMin: rules.surviveMin,
          surviveMax: rules.surviveMax,
          birthMin: rules.birthMin,
          birthMax: rules.birthMax,
          birthMargin: rules.birthMargin,
          cellMargin,
          gridSize,
        },
        createdAt: new Date().toISOString(),
      };
    },
    [speed, density, rules, cellMargin, gridSize],
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

  // Genesis Config panel
  const configOptions = React.useMemo(() => {
    const options: Record<string, string> = { "": "Select a config..." };
    Object.keys(savedConfigs).forEach((name) => {
      options[name] = name;
    });
    return options;
  }, [savedConfigs]);

  useControls(
    "Genesis Config",
    {
      "Load Config": {
        value: selectedConfigName,
        options: configOptions,
        onChange: (name: string) => {
          setSelectedConfigName(name);
          if (name && savedConfigs[name]) {
            applyGenesisConfig(savedConfigs[name]);
          }
        },
      },
      "Config Name": {
        value: newConfigName,
        onChange: (v: string) => setNewConfigName(v),
      },
      "Save Current": button(() => {
        const name = newConfigName.trim() || `Config ${Date.now()}`;
        const config = createCurrentGenesisConfig(name);
        const newConfigs = { ...savedConfigs, [name]: config };
        setSavedConfigs(newConfigs);
        saveGenesisConfigs(newConfigs);
        setSelectedConfigName(name);
        setNewConfigName("");
      }),
      Export: button(() => {
        const name = selectedConfigName || newConfigName.trim() || "export";
        const config =
          selectedConfigName && savedConfigs[selectedConfigName]
            ? savedConfigs[selectedConfigName]
            : createCurrentGenesisConfig(name);
        exportGenesisConfig(config);
      }),
      Import: button(async () => {
        const config = await importGenesisConfig();
        if (config) {
          const newConfigs = { ...savedConfigs, [config.name]: config };
          setSavedConfigs(newConfigs);
          saveGenesisConfigs(newConfigs);
          setSelectedConfigName(config.name);
          applyGenesisConfig(config);
        }
      }),
      "Delete Selected": button(() => {
        if (selectedConfigName && savedConfigs[selectedConfigName]) {
          const newConfigs = { ...savedConfigs };
          delete newConfigs[selectedConfigName];
          setSavedConfigs(newConfigs);
          saveGenesisConfigs(newConfigs);
          setSelectedConfigName("");
        }
      }),
    },
    [
      savedConfigs,
      selectedConfigName,
      newConfigName,
      createCurrentGenesisConfig,
      applyGenesisConfig,
      configOptions,
    ],
  );

  const handleTick = useCallback(() => {
    gridRef.current.tick(
      rules.surviveMin,
      rules.surviveMax,
      rules.birthMin,
      rules.birthMax,
      rules.birthMargin,
    );
  }, [rules]);

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
      <Leva collapsed={false} />
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

      {!running && <CommunitySidebar community={community} />}
    </div>
  );
}
