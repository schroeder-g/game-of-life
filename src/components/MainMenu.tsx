import { useCallback, useState } from "react";
import { useBrush } from "../contexts/BrushContext";
import { useGenesisConfig } from "../contexts/GenesisConfigContext";
import { useSimulation } from "../contexts/SimulationContext";
import { SHAPES, ShapeType, supportsHollow } from "../core/shapes";

function ActionsSection() {
  const {
    state: { running, rotationMode, speed, density },
    actions: { playStop, step, randomize, reset, clear, setSpeed, setDensity },
  } = useSimulation();
  return (
    <section className="menu-section actions-section">
      <h3>Actions</h3>
      {rotationMode && (
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
      )}
      <div className="button-group actions-grid">
        <button
          className="glass-button primary"
          onClick={playStop}
          disabled={!rotationMode}
          title={
            !rotationMode ? "Switch to View mode to play/stop" : undefined
          }
        >
          {running ? "Stop" : "Play"}
        </button>
        <button className="glass-button" onClick={step} disabled={running}>
          Step
        </button>
        <button
          className="glass-button"
          onClick={reset}
          disabled={running}
          title={running ? "Pause simulation to reset" : undefined}
        >
          Reset
        </button>
        <button
          className="glass-button"
          onClick={randomize}
          disabled={rotationMode}
          title={rotationMode ? "Switch to Edit mode to randomize" : undefined}
        >
          Random
        </button>
        <button
          className="glass-button danger"
          onClick={clear}
          disabled={rotationMode}
          title={rotationMode ? "Switch to Edit mode to clear" : undefined}
        >
          Clear
        </button>
      </div>
      {!rotationMode && (
        <label className="control-label">
          <span>Random Density: {density.toFixed(2)}</span>
          <input
            type="range"
            min={0.01}
            max={0.3}
            step={0.01}
            value={density}
            onChange={(e) => setDensity(Number(e.target.value))}
          />
        </label>
      )}
    </section>
  );
}

function EnvironmentSection() {
  const {
    state: { gridSize },
    actions: { setGridSize },
  } = useSimulation();
  return (
    <section className="menu-section">
      <h3>Environment</h3>
      <label className="control-label">
        <span>Grid Size: {gridSize}</span>
        <input
          type="range"
          min={10}
          max={40}
          step={1}
          value={gridSize}
          onChange={(e) => setGridSize(Number(e.target.value))}
        />
      </label>
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
      <h3>Rules (neighbors)</h3>
      <div className="neighbor-controls">
        <label className="control-label row">
          <input
            type="checkbox"
            checked={neighborFaces}
            disabled={onlyFaces}
            onChange={(e) => setNeighborFaces(e.target.checked)}
          />
          <span>Face neighbors</span>
        </label>
        <label className="control-label row">
          <input
            type="checkbox"
            checked={neighborEdges}
            disabled={onlyEdges}
            onChange={(e) => setNeighborEdges(e.target.checked)}
          />
          <span>Edge neighbors</span>
        </label>
        <label className="control-label row">
          <input
            type="checkbox"
            checked={neighborCorners}
            disabled={onlyCorners}
            onChange={(e) => setNeighborCorners(e.target.checked)}
          />
          <span>Corner neighbors</span>
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
    </section>
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

function FloatingActions() {
  const {
    state: { running },
    actions: { playStop, step, randomize, reset, clear },
  } = useSimulation();

  return (
    <div className="floating-actions">
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
        onClick={randomize}
        data-tooltip-bottom="Random"
      >
        ?
      </button>
      <button
        className="glass-button"
        onClick={reset}
        data-tooltip-bottom="Reset"
      >
        ↺
      </button>
      <button
        className="glass-button danger"
        onClick={clear}
        data-tooltip-bottom="Clear"
      >
        ✕
      </button>
    </div>
  );
}

export function MainMenu() {
  const {
    state: { running, rotationMode },
    actions: { setRotationMode },
  } = useSimulation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside
        className={`main-menu glass-panel ${collapsed ? "collapsed" : ""} ${!running ? "has-sidebar" : ""}`}
      >
        <div className="mode-indicator above-menu">
          <button
            className="mode-toggle-button glass-button"
            onClick={() => setRotationMode((prev) => !prev)}
            aria-label="Toggle mode"
          >
            Mode:
          </button>{" "}
          <span className="mode-label">
            {rotationMode ? "View" : "Edit"}
          </span>
        </div>
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

      {collapsed && <FloatingActions />}
    </>
  );
}

MainMenu.ActionsSection = ActionsSection;
MainMenu.EnvironmentSection = EnvironmentSection;
MainMenu.SimulationSection = SimulationSection;
MainMenu.RulesSection = RulesSection;
MainMenu.ShapeBrushSection = ShapeBrushSection;
MainMenu.GenesisConfigSection = GenesisConfigSection;
MainMenu.FloatingActions = FloatingActions;
