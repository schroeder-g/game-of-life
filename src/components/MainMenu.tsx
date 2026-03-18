import { useCallback, useEffect, useState } from "react";
import { useBrush } from "../contexts/BrushContext";
import { useGenesisConfig } from "../contexts/GenesisConfigContext";
import { useSimulation } from "../contexts/SimulationContext";
import { CommunitySidebar } from "./Controls";
import { SHAPES, ShapeType, supportsHollow } from "../core/shapes";
import { DEFAULT_CONFIGS } from "../data/default-configs";

const FitIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" strokeOpacity="0.3" />
    <path d="M12 8v8M8 12h8" />
    <path d="M12 8l-2 2M12 8l2 2M12 16l-2-2M12 16l2-2" />
    <path d="M8 12l2-2M8 12l2 2M16 12l-2-2M16 12l2 2" />
    <path d="M2 2l4 4M22 22l-4-4M2 22l4-4M22 2l-4 4" />
  </svg>
);

const RecenterIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const SquareUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M12 16V8h4" />
    <path d="M13 11a2 2 0 0 1 2 2" />
  </svg>
);

function ActionsSection() {
  const {
    state: { savedConfigs, selectedConfigName },
    actions: { setSelectedConfigName },
  } = useGenesisConfig();

  const {
    state: { rotationMode, speed, running },
    actions: {
      setSpeed, applyCells, setDensity, setSurviveMin, setSurviveMax,
      setBirthMin, setBirthMax, setBirthMargin, setCellMargin,
      setNeighborFaces, setNeighborEdges, setNeighborCorners,
      fitDisplay
    },
  } = useSimulation();

  const configOptions = Object.keys(savedConfigs);

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
      fitDisplay();
    }
  };

  return (
    <section className="menu-section actions-section">
      <label className="control-label">
        <span>Load Scene</span>
        <select
          className="glass-select"
          value={selectedConfigName}
          onChange={(e) => handleSelectConfig(e.target.value)}
          disabled={running}
        >
          <option value="">Select a scene...</option>
          {configOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
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
    </section>
  );
}

function EnvironmentSection() {
  const {
    state: { gridSize, running, rotationMode, density, cellMargin },
    actions: { setGridSize, reset, clear, randomize, setDensity, setCellMargin },
    meta: { gridRef },
  } = useSimulation();

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [hasLiveCells, setHasLiveCells] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setHasLiveCells(gridRef.current.getLivingCells().length > 0);
    }, 200);
    return () => clearInterval(interval);
  }, [gridRef]);

  return (
    <section className="menu-section">
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Environment
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
      </h3>
      {!isCollapsed && (
        <>
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
        </>
      )}
    </section>
  );
}


function RulesSection() {
  const [isCollapsed, setIsCollapsed] = useState(true);
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
      fitDisplay,
    },
  } = useSimulation();

  // calculate disable flags for checkboxes
  const onlyFaces = neighborFaces && !neighborEdges && !neighborCorners;
  const onlyEdges = neighborEdges && !neighborFaces && !neighborCorners;
  const onlyCorners = neighborCorners && !neighborFaces && !neighborEdges;

  return (
    <section className="menu-section">
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Rules
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
      </h3>
      {!isCollapsed && (
        <>
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
        </>
      )}
    </section>
  );
}

function SelectorPositionSection() {
  const {
    state: { gridSize },
  } = useSimulation();
  const {
    state: { selectorPos },
    actions: { setSelectorPos },
  } = useBrush();

  if (!selectorPos) {
    return null;
  }

  const handleCoordinateChange = (axis: "x" | "y" | "z", value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue >= gridSize) {
      // Invalid input is not updated
      return;
    }

    const newPos: [number, number, number] = [...selectorPos];
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    newPos[axisIndex] = numValue;
    setSelectorPos(newPos);
  };

  const increment = (axis: "x" | "y" | "z") => {
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    const currentValue = selectorPos[axisIndex];
    if (currentValue < gridSize - 1) {
      handleCoordinateChange(axis, String(currentValue + 1));
    }
  };

  const decrement = (axis: "x" | "y" | "z") => {
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    const currentValue = selectorPos[axisIndex];
    if (currentValue > 0) {
      handleCoordinateChange(axis, String(currentValue - 1));
    }
  };

  return (
    <section className="menu-section">
      <h3 style={{ cursor: "default" }}>Cursor Position</h3>
      <div className="selector-position-section">
        {(["x", "y", "z"] as const).map((axis) => (
          <div key={axis} className="coordinate-input-container">
            <label>{axis.toUpperCase()}</label>
            <div className="coordinate-input-group">
              <input
                type="number"
                className="coordinate-input"
                value={selectorPos[{ x: 0, y: 1, z: 2 }[axis]]}
                onChange={(e) => handleCoordinateChange(axis, e.target.value)}
                min={0}
                max={gridSize - 1}
              />
              <div className="coord-buttons">
                <button onClick={() => increment(axis)}>▲</button>
                <button onClick={() => decrement(axis)}>▼</button>
              </div>
            </div>
          </div>
        ))}
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

  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <section className="menu-section">
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Shape Brush
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
      </h3>
      {!isCollapsed && (
        <>
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
        </>
      )}
    </section>
  );
}

function CameraControlSection() {
  const {
    state: { panSpeed, rotationSpeed },
    actions: { setPanSpeed, setRotationSpeed },
  } = useSimulation();

  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <section className="menu-section">
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        Camera Controls
        <span style={{ fontSize: "12px", opacity: 0.6 }}>
          {isCollapsed ? "▼" : "▲"}
        </span>
      </h3>
      {!isCollapsed && (
        <>
          <label className="control-label">
            <span>Pan/Dolly Speed: {panSpeed}</span>
            <input
              type="range"
              min={1}
              max={60}
              step={1}
              value={panSpeed}
              onChange={(e) => setPanSpeed(Number(e.target.value))}
            />
          </label>
          <label className="control-label">
            <span>Rotation Speed: {rotationSpeed}</span>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(Number(e.target.value))}
            />
          </label>
        </>
      )}
    </section>
  );
}

function SceneManagementSection() {
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

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null);

  const isBuiltIn = sceneToDelete ? !!DEFAULT_CONFIGS[sceneToDelete] : false;

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
      fitDisplay();
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
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Scene Management
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
      </h3>
      {!isCollapsed && (
        <>
          <label className="control-label">
            <span>Scene Name</span>
            <input
              type="text"
              className="glass-input"
              value={newConfigName}
              onChange={(e) => setNewConfigName(e.target.value)}
              placeholder="New scene name..."
            />
          </label>
          <div className="button-group actions-grid config-actions">
            <button
              className="glass-button"
              onClick={handleSaveConfig}
              disabled={!newConfigName.trim()}
              title={!newConfigName.trim() ? "Enter a Scene Name to save" : ""}
            >
              Save Current
            </button>
            <button
              className="glass-button"
              onClick={handleExportConfig}
              disabled={!newConfigName.trim() && !selectedConfigName}
              title={!newConfigName.trim() && !selectedConfigName ? "Enter a Scene Name or select a scene to export" : ""}
            >
              Export
            </button>
            <button className="glass-button" onClick={handleImportConfig}>
              Import
            </button>
            <button
              className="glass-button danger"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete a Scene...
            </button>
          </div>

          {showDeleteModal && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>Delete a Scene</h3>
                <p>Select a scene to remove from your saved collections:</p>

                <div className="scene-delete-list">
                  {configOptions.map((name) => (
                    <div
                      key={name}
                      className={`scene-delete-item ${sceneToDelete === name ? "selected" : ""}`}
                      onClick={() => setSceneToDelete(name)}
                    >
                      {name}
                      {!!DEFAULT_CONFIGS[name] && <span style={{ fontSize: "10px", opacity: 0.5 }}>(Built-in)</span>}
                    </div>
                  ))}
                </div>

                {isBuiltIn && (
                  <div className="warning-text">
                    You have selected a pre-installed scene. It will reappear the next time you refresh this app.
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    className="glass-button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSceneToDelete(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="glass-button danger"
                    disabled={!sceneToDelete}
                    onClick={() => {
                      if (sceneToDelete) {
                        deleteConfig(sceneToDelete);
                        setShowDeleteModal(false);
                        setSceneToDelete(null);
                      }
                    }}
                  >
                    Delete Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function AppHeaderPanel() {
  const {
    state: { running, rotationMode, hasInitialState, hasPastHistory },
    actions: { playStop, step, stepBackward, reset, setRotationMode, fitDisplay, recenter, squareUp },
  } = useSimulation();

  return (
    <div className="app-header-panel">
      <div className="title-section">
        <h1>Cube of Life</h1>
        <div className="version-info">
          <a>{typeof document !== "undefined" ? document.getElementById("version-data")?.textContent : ""}</a>
        </div>
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
          className="glass-button"
          onClick={fitDisplay}
          aria-label="Fit"
          data-tooltip-bottom="Fit"
        >
          <FitIcon />
        </button>
        <button
          className="glass-button"
          onClick={recenter}
          aria-label="Recenter"
          data-tooltip-bottom="Recenter"
        >
          <RecenterIcon />
        </button>
        <button
          className="glass-button"
          onClick={squareUp}
          aria-label="Square Up"
          data-tooltip-bottom="Square Up"
        >
          <SquareUpIcon />
        </button>

        <button
          className="glass-button primary"
          onClick={playStop}
          disabled={!rotationMode}
          data-tooltip-bottom={!rotationMode ? "Playback disabled in Edit mode" : running ? "Pause" : "Play"}
        >
          {running ? "⏸" : "▶"}
        </button>
        <button
          className="glass-button"
          onClick={stepBackward}
          disabled={running || !hasPastHistory}
          data-tooltip-bottom={!hasPastHistory ? "No history to step back to" : "Step Backward"}
        >
          ⏮
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
          disabled={!hasInitialState}
          data-tooltip-bottom={!hasInitialState ? "No initial state to reset to" : "Reset"}
        >
          ↺
        </button>
      </div>
    </div>
  );
}

export function MainMenu() {
  const {
    state: { running, rotationMode, community },
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
          {rotationMode && <CameraControlSection />}
          {!rotationMode && <SceneManagementSection />}
          {!rotationMode && <EnvironmentSection />}
          <RulesSection />
          {!rotationMode && <SelectorPositionSection />}
          {!rotationMode && <ShapeBrushSection />}
        </div>
      </aside>
    </>
  );
}

MainMenu.ActionsSection = ActionsSection;
MainMenu.EnvironmentSection = EnvironmentSection;
MainMenu.RulesSection = RulesSection;
MainMenu.ShapeBrushSection = ShapeBrushSection;
MainMenu.SceneManagementSection = SceneManagementSection;
MainMenu.CameraControlSection = CameraControlSection;
MainMenu.AppHeaderPanel = AppHeaderPanel;
