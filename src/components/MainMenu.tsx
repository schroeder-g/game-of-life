import { useCallback, useEffect, useState } from "react";
import { useBrush } from "../contexts/BrushContext";
import { useGenesisConfig } from "../contexts/GenesisConfigContext";
import { useSimulation } from "../contexts/SimulationContext";
import { SHAPES, ShapeType, supportsHollow } from "../core/shapes";

function ActionsSection() {
  const {
    state: { rotationMode, speed },
    actions: { setSpeed },
  } = useSimulation();

  if (!rotationMode) return null;

  return (
    <section className="menu-section actions-section">
      <label className="control-label">
        <span>Speed (fps): {speed}</span>
        <input
          type="range"
          min={1}
          max={30}
          step={1}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      </label>
    </section>
  );
}

function EnvironmentSection() {
  const {
    state: { gridSize, running, rotationMode, density },
    actions: { setGridSize, reset, clear, randomize, setDensity },
    meta: { gridRef },
  } = useSimulation();

  const [hasLiveCells, setHasLiveCells] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setHasLiveCells(gridRef.current.getLivingCells().length > 0);
    }, 200);
    return () => clearInterval(interval);
  }, [gridRef]);

  return (
    <section className="menu-section">
      <h3>Environment</h3>
      <label className="control-label">
        <span>Grid Size: {gridSize}</span>
        <input
          type="range"
          min={10}
          max={60}
          step={1}
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
        />
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="glass-button"
            style={{ flex: 1 }}
            onClick={reset}
            disabled={running}
            title={running ? "Pause simulation to reset" : undefined}
          >
            Reset
          </button>
          <button
            className="glass-button danger"
            style={{ flex: 1 }}
            onClick={clear}
            disabled={rotationMode || !hasLiveCells}
            title={rotationMode ? "Switch to Edit mode to clear" : !hasLiveCells ? "No live cells to clear" : undefined}
          >
            Clear
          </button>
        </div>

        {!rotationMode && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="glass-button"
              onClick={randomize}
              disabled={rotationMode || hasLiveCells}
              title={rotationMode ? "Switch to Edit mode to randomize" : hasLiveCells ? "Clear board to randomize" : undefined}
              style={{ flexShrink: 0 }}
            >
              Random
            </button>
            <label className="control-label" style={{ margin: 0, flex: 1 }}>
              <span style={{ fontSize: "12px" }}>Density: {density.toFixed(2)}</span>
              <input
                type="range"
                min={0.01}
                max={0.3}
                step={0.01}
                value={density}
                onChange={(e) => setDensity(Number(e.target.value))}
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}

function SimulationSection() {
  const {
    state: { cellMargin, rotationMode },
    actions: { setCellMargin },
  } = useSimulation();
  return (
    <section className="menu-section">
      <h3>Simulation</h3>
      <label className="control-label">
        <span>Cell Margin: {cellMargin.toFixed(2)}</span>
        <input
          type="range"
          min={0}
          max={0.45}
          step={0.05}
          value={cellMargin}
          onChange={(e) => setCellMargin(Number(e.target.value))}
        />
      </label>
    </section>
  );
}

function RulesSection() {
  const {
    state: { surviveMin, surviveMax, birthMin, birthMax, birthMargin,
      neighborFaces, neighborEdges, neighborCorners },
    actions: {
      setSurviveMin,
      setSurviveMax,
      setBirthMin,
      setBirthMax,
      setBirthMargin,
      setNeighborFaces,
      setNeighborEdges,
      setNeighborCorners,
    },
  } = useSimulation();

  // calculate disable flags for checkboxes
  const onlyFaces = neighborFaces && !neighborEdges && !neighborCorners;
  const onlyEdges = neighborEdges && !neighborFaces && !neighborCorners;
  const onlyCorners = neighborCorners && !neighborFaces && !neighborEdges;

  return (
    <section className="menu-section">
      <h3>Rules</h3>
      <div className="neighbor-controls" style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#8b949e", flexWrap: "wrap", marginBottom: "8px" }}>
        <span>Neighbors:</span>
        <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", flexDirection: "row" }}>
          <input
            type="checkbox"
            className="glass-checkbox"
            checked={neighborFaces}
            disabled={onlyFaces}
            onChange={(e) => setNeighborFaces(e.target.checked)}
          />
          Faces
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", flexDirection: "row" }}>
          <input
            type="checkbox"
            className="glass-checkbox"
            checked={neighborEdges}
            disabled={onlyEdges}
            onChange={(e) => setNeighborEdges(e.target.checked)}
          />
          Edges
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", flexDirection: "row" }}>
          <input
            type="checkbox"
            className="glass-checkbox"
            checked={neighborCorners}
            disabled={onlyCorners}
            onChange={(e) => setNeighborCorners(e.target.checked)}
          />
          Corners
        </label>
      </div>
      <div className="rules-grid">
        <label className="control-label mini">
          <span>Survive Min: {surviveMin}</span>
          <input
            type="range"
            min={0}
            max={18}
            step={1}
            value={surviveMin}
            onChange={(e) => setSurviveMin(Number(e.target.value))}
          />
        </label>
        <label className="control-label mini">
          <span>Survive Max: {surviveMax}</span>
          <input
            type="range"
            min={0}
            max={18}
            step={1}
            value={surviveMax}
            onChange={(e) => setSurviveMax(Number(e.target.value))}
          />
        </label>
        <label className="control-label mini">
          <span>Birth Min: {birthMin}</span>
          <input
            type="range"
            min={0}
            max={18}
            step={1}
            value={birthMin}
            onChange={(e) => setBirthMin(Number(e.target.value))}
          />
        </label>
        <label className="control-label mini">
          <span>Birth Max: {birthMax}</span>
          <input
            type="range"
            min={0}
            max={18}
            step={1}
            value={birthMax}
            onChange={(e) => setBirthMax(Number(e.target.value))}
          />
        </label>
        <label className="control-label mini">
          <span>Birth Margin: {birthMargin}</span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={birthMargin}
            onChange={(e) => setBirthMargin(Number(e.target.value))}
          />
        </label>
      </div>
    </section >
  );
}

function ShapeBrushSection() {
  const {
    state: { gridSize },
  } = useSimulation();
  const {
    state: { selectedShape, shapeSize, isHollow },
    actions: { setSelectedShape, setShapeSize, setIsHollow },
  } = useBrush();

  return (
    <section className="menu-section">
      <h3>Shape Brush</h3>
      <label className="control-label">
        <span>Shape</span>
        <select
          className="glass-select"
          value={selectedShape}
          onChange={(e) => setSelectedShape(e.target.value as ShapeType)}
        >
          {SHAPES.map((shape) => (
            <option key={shape} value={shape}>
              {shape}
            </option>
          ))}
        </select>
      </label>
      <label className="control-label">
        <span>Size: {shapeSize}</span>
        <input
          type="range"
          min={1}
          max={gridSize}
          step={1}
          value={shapeSize}
          onChange={(e) => setShapeSize(Number(e.target.value))}
        />
      </label>
      <label className="control-label row">
        <span>Hollow</span>
        <input
          type="checkbox"
          className="glass-checkbox"
          checked={isHollow}
          disabled={!supportsHollow(selectedShape)}
          onChange={(e) => setIsHollow(e.target.checked)}
        />
      </label>
    </section>
  );
}

function GenesisConfigSection() {
  const {
    state: { savedConfigs, selectedConfigName, newConfigName },
    actions: {
      setSelectedConfigName,
      setNewConfigName,
      saveConfig,
      exportConfig,
      importConfig,
      deleteConfig,
    },
  } = useGenesisConfig();

  const {
    state: {
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
    actions: {
      applyCells,
      setSpeed,
      setDensity,
      setSurviveMin,
      setSurviveMax,
      setBirthMin,
      setBirthMax,
      setBirthMargin,
      setCellMargin,
      setNeighborFaces,
      setNeighborEdges,
      setNeighborCorners,
    },
    meta: { gridRef, initialStateRef },
  } = useSimulation();

  const configOptions = Object.keys(savedConfigs);

  // Helper to create current genesis config from current simulation state
  const createCurrentGenesisConfig = useCallback(
    (name: string) => {
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
      initialStateRef,
      gridRef,
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

  const handleSaveConfig = () => {
    const name = newConfigName.trim() || `Config ${Date.now()}`;
    const config = createCurrentGenesisConfig(name);
    saveConfig(name, config);
  };

  const handleExportConfig = () => {
    const name = selectedConfigName || newConfigName.trim() || "export";
    const config =
      selectedConfigName && savedConfigs[selectedConfigName]
        ? savedConfigs[selectedConfigName]
        : createCurrentGenesisConfig(name);
    exportConfig(config);
  };

  const handleImportConfig = () => {
    importConfig((config) => {
      applyCells(config.cells, config.settings.gridSize);
      // also apply saved settings
      setSpeed(config.settings.speed);
      setDensity(config.settings.density);
      setSurviveMin(config.settings.surviveMin);
      setSurviveMax(config.settings.surviveMax);
      setBirthMin(config.settings.birthMin);
      setBirthMax(config.settings.birthMax);
      setBirthMargin(config.settings.birthMargin);
      setCellMargin(config.settings.cellMargin);
      if (config.settings.neighborFaces !== undefined) {
        setNeighborFaces(config.settings.neighborFaces);
      }
      if (config.settings.neighborEdges !== undefined) {
        setNeighborEdges(config.settings.neighborEdges);
      }
      if (config.settings.neighborCorners !== undefined) {
        setNeighborCorners(config.settings.neighborCorners);
      }
    });
  };

  const handleSelectConfig = (name: string) => {
    setSelectedConfigName(name);
    if (name && savedConfigs[name]) {
      const config = savedConfigs[name];
      applyCells(config.cells, config.settings.gridSize);
      // apply saved settings as well
      setSpeed(config.settings.speed);
      setDensity(config.settings.density);
      setSurviveMin(config.settings.surviveMin);
      setSurviveMax(config.settings.surviveMax);
      setBirthMin(config.settings.birthMin);
      setBirthMax(config.settings.birthMax);
      setBirthMargin(config.settings.birthMargin);
      setCellMargin(config.settings.cellMargin);
      if (config.settings.neighborFaces !== undefined) {
        setNeighborFaces(config.settings.neighborFaces);
      }
      if (config.settings.neighborEdges !== undefined) {
        setNeighborEdges(config.settings.neighborEdges);
      }
      if (config.settings.neighborCorners !== undefined) {
        setNeighborCorners(config.settings.neighborCorners);
      }
    }
  };

  return (
    <section className="menu-section">
      <h3>Genesis Config</h3>
      <label className="control-label">
        <span>Load Config</span>
        <select
          className="glass-select"
          value={selectedConfigName}
          onChange={(e) => handleSelectConfig(e.target.value)}
        >
          <option value="">Select a config...</option>
          {configOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="control-label">
        <span>Config Name</span>
        <input
          type="text"
          className="glass-input"
          value={newConfigName}
          onChange={(e) => setNewConfigName(e.target.value)}
          placeholder="New config name..."
        />
      </label>
      <div className="button-group actions-grid config-actions">
        <button className="glass-button" onClick={handleSaveConfig}>
          Save Current
        </button>
        <button className="glass-button" onClick={handleExportConfig}>
          Export
        </button>
        <button className="glass-button" onClick={handleImportConfig}>
          Import
        </button>
        <button
          className="glass-button danger"
          onClick={() => deleteConfig(selectedConfigName)}
          disabled={!selectedConfigName}
        >
          Delete Selected
        </button>
      </div>
    </section>
  );
}

export function AppHeaderPanel() {
  const {
    state: { running, rotationMode },
    actions: { playStop, step, reset, setRotationMode },
  } = useSimulation();

  return (
    <div className="app-header-panel">
      <div className="title-section">
        <h1>Cube of Life</h1>
      </div>
      <div className="button-group panel-actions">
        <button
          className="glass-button mode-toggle-button"
          onClick={() => setRotationMode((prev) => !prev)}
          aria-label="Toggle mode"
          data-tooltip-bottom="Switch Mode"
        >
          {rotationMode ? "Viewing" : "Editing"}
        </button>
        <button
          className="glass-button primary"
          onClick={playStop}
          data-tooltip-bottom={running ? "Pause" : "Play"}
        >
          {running ? "⏸" : "▶"}
        </button>
        <button
          className="glass-button"
          onClick={step}
          disabled={running}
          data-tooltip-bottom="Step"
        >
          ⏭
        </button>
        <button
          className="glass-button"
          onClick={reset}
          data-tooltip-bottom="Reset"
        >
          ↺
        </button>
      </div>
    </div>
  );
}

export function MainMenu() {
  const {
    state: { running, rotationMode },
    actions: { setRotationMode },
  } = useSimulation();
  const [collapsed, setCollapsed] = useState(() => {
    // Default to collapsed if starting on small screen
    if (typeof window !== "undefined") {
      return window.innerWidth <= 768;
    }
    return false;
  });

  return (
    <>
      <aside
        className={`main-menu glass-panel ${collapsed ? "collapsed" : ""} ${!running ? "has-sidebar" : ""}`}
      >
        <div className="menu-sticky-container">
          <header
            className="menu-header"
            onClick={() => setCollapsed(!collapsed)}
          >
            <h2>Configuration</h2>
            <button
              className="collapse-toggle"
              tabIndex={-1}
              aria-label="Toggle menu"
            >
              {collapsed ? "▼" : "▲"}
            </button>
          </header>
          {!collapsed && <ActionsSection />}
        </div>

        <div className="menu-scrollable-content">
          {!rotationMode && <EnvironmentSection />}
          <SimulationSection />
          <RulesSection />
          {!rotationMode && <ShapeBrushSection />}
          {!rotationMode && <GenesisConfigSection />}
        </div>
      </aside>
    </>
  );
}

MainMenu.ActionsSection = ActionsSection;
MainMenu.EnvironmentSection = EnvironmentSection;
MainMenu.SimulationSection = SimulationSection;
MainMenu.RulesSection = RulesSection;
MainMenu.ShapeBrushSection = ShapeBrushSection;
MainMenu.GenesisConfigSection = GenesisConfigSection;
MainMenu.AppHeaderPanel = AppHeaderPanel;
