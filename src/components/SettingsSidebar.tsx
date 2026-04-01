import { useCallback, useEffect, useState } from "react";
import { usePersistentState } from "../hooks/usePersistentState";

import { useGenesisConfig } from "../contexts/GenesisConfigContext";
import { useSimulation } from "../contexts/SimulationContext";
import { useBrush } from "../contexts/BrushContext"; // Added

import { DEFAULT_CONFIGS } from "../data/default-configs";
import { AutomatedTestsPanel } from "./AutomatedTestsPanel";
import { ManualTestsPanel } from "./ManualTestsPanel";
import { MANUAL_TESTS } from "../data/manual-tests";
import { AUTOMATED_TEST_IDS } from "../data/automated-tests";
import { DOCUMENTATION_CONTENT } from "../data/documentation/_Documentation";
import { type CameraFace, type CameraRotation, KEY_MAP } from "../core/faceOrientationKeyMapping"; // Added

import { isAnyBrushCellInside } from "../core/brushUtils"; // Added


interface SettingsSidebarProps {
  isSmallScreen: boolean;
}

function ActionsSection() {
  const {
    state: { savedConfigs, selectedConfigName },
    actions: { setSelectedConfigName },
  } = useGenesisConfig();

  const {
    state: { viewMode, speed, running },
    actions: {
      setSpeed, applyCells, setDensity, setSurviveMin, setSurviveMax,
      setBirthMin, setBirthMax, setBirthMargin, setCellMargin,
      setNeighborFaces, setNeighborEdges, setNeighborCorners,
      fitDisplay
    },
  } = useSimulation();

  const configOptions = Object.keys(savedConfigs);

  const handleSelectConfig = useCallback((name: string) => {
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
  }, [
    setSelectedConfigName, savedConfigs, applyCells, setSpeed, setDensity,
    setSurviveMin, setSurviveMax, setBirthMin, setBirthMax, setBirthMargin,
    setCellMargin, setNeighborFaces, setNeighborEdges, setNeighborCorners,
    fitDisplay
  ]);


  return;
}

function EnvironmentSection() {
  const {
    state: { gridSize, running, viewMode, density, cellMargin },
    actions: { setGridSize, reset, clear, randomize, setDensity, setCellMargin },
    meta: { gridRef },
  } = useSimulation();

  const [isCollapsed, setIsCollapsed] = usePersistentState("gol_collapse_env", true);
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
                disabled={viewMode || !hasLiveCells}
                title={viewMode ? "Switch to Edit mode to clear" : !hasLiveCells ? "No live cells to clear" : undefined}
              >
                Clear
              </button>
            </div>

            {!viewMode && (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  className="glass-button"
                  onClick={randomize}
                  disabled={viewMode || hasLiveCells}
                  title={viewMode ? "Switch to Edit mode to randomize" : hasLiveCells ? "Clear board to randomize" : undefined}
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
  const [isCollapsed, setIsCollapsed] = usePersistentState("gol_collapse_rules", true);
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


function TestsSection({ isProd }: { isProd: boolean }) {
  const [isCollapsed, setIsCollapsed] = usePersistentState("gol_collapse_tests", true);

  return null;

  return (
    <section className="menu-section">
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Tests
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
      </h3>
      {!isCollapsed && (
        <>
          <ManualTestsPanel
            manualTests={MANUAL_TESTS}
            automatedTestIds={AUTOMATED_TEST_IDS}
            documentation={DOCUMENTATION_CONTENT}
          />
          <AutomatedTestsPanel
            manualTests={MANUAL_TESTS}
            automatedTestIds={AUTOMATED_TEST_IDS}
            documentation={DOCUMENTATION_CONTENT}
          />
        </>
      )}
    </section>
  );
}


function SelectorPositionSection() {
  const {
    state: { gridSize, cameraOrientation },
    meta: { eventBus, cameraActionsRef },
  } = useSimulation();
  const {
    state: brushState,
    actions: { setSelectorPos },
  } = useBrush();
  const { selectorPos } = brushState;

  const [isCollapsed, setIsCollapsed] = usePersistentState("gol_collapse_cursor", true);

  const deriveKeyMap = useCallback(() => {
    if (cameraOrientation.face === 'unknown' || cameraOrientation.rotation === 'unknown') {
      return {
        X: { inc: "D", dec: "A" },
        Y: { inc: "W", dec: "X" },
        Z: { inc: "Z", dec: "Q" },
      };
    }

    const face = cameraOrientation.face as CameraFace;
    const rotation = cameraOrientation.rotation as CameraRotation;
    const mapping = KEY_MAP[face][rotation];

    const keys: Record<string, string> = {};
    for (const key in mapping) {
      const delta = (mapping as any)[key] as [number, number, number];
      if (delta[0] === 1) keys["X_inc"] = key.toUpperCase();
      if (delta[0] === -1) keys["X_dec"] = key.toUpperCase();
      if (delta[1] === 1) keys["Y_inc"] = key.toUpperCase();
      if (delta[1] === -1) keys["Y_dec"] = key.toUpperCase();
      if (delta[2] === 1) keys["Z_inc"] = key.toUpperCase();
      if (delta[2] === -1) keys["Z_dec"] = key.toUpperCase();
    }

    return {
      X: { inc: keys["X_inc"] || "?", dec: keys["X_dec"] || "?" },
      Y: { inc: keys["Y_inc"] || "?", dec: keys["Y_dec"] || "?" },
      Z: { inc: keys["Z_inc"] || "?", dec: keys["Z_dec"] || "?" },
    };
  }, [cameraOrientation]);

  const keyMap = deriveKeyMap();

  const getTopFace = (face: 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right', rotation: 0 | 90 | 180 | 270): string => {
    switch (face) {
      case 'front':
      case 'back':
        if (rotation === 0) return 'Top';
        if (rotation === 90) return 'Left';
        if (rotation === 180) return 'Bottom';
        if (rotation === 270) return 'Right';
        break;
      case 'right':
        if (rotation === 0) return 'Top';
        if (rotation === 90) return 'Back';
        if (rotation === 180) return 'Bottom';
        if (rotation === 270) return 'Front';
        break;
      case 'left':
        if (rotation === 0) return 'Top';
        if (rotation === 90) return 'Front';
        if (rotation === 180) return 'Bottom';
        if (rotation === 270) return 'Back';
        break;
      case 'top':
        if (rotation === 0) return 'Back';
        if (rotation === 90) return 'Left';
        if (rotation === 180) return 'Front';
        if (rotation === 270) return 'Right';
        break;
      case 'bottom':
        if (rotation === 0) return 'Front';
        if (rotation === 90) return 'Left';
        if (rotation === 180) return 'Back';
        if (rotation === 270) return 'Right';
        break;
    }
    return '';
  };

  const handleCoordinateChange = useCallback((axis: "X" | "Y" | "Z", value: string) => {
    if (!selectorPos) return;
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue >= gridSize) {
      return;
    }

    const newPos: [number, number, number] = [...selectorPos];
    const axisIndex = { X: 0, Y: 1, Z: 2 }[axis];
    newPos[axisIndex] = numValue;
    setSelectorPos(newPos);
  }, [selectorPos, gridSize, setSelectorPos]);

  const increment = useCallback((axis: "X" | "Y" | "Z") => {
    if (!selectorPos) return;
    const axisIndex = { X: 0, Y: 1, Z: 2 }[axis];
    const currentValue = selectorPos[axisIndex];
    if (currentValue < gridSize - 1) {
      handleCoordinateChange(axis, String(currentValue + 1));
    }
  }, [selectorPos, gridSize, handleCoordinateChange]);

  const decrement = useCallback((axis: "X" | "Y" | "Z") => {
    if (!selectorPos) return;
    const axisIndex = { X: 0, Y: 1, Z: 2 }[axis];
    const currentValue = selectorPos[axisIndex];
    if (currentValue > 0) {
      handleCoordinateChange(axis, String(currentValue - 1));
    }
  }, [selectorPos, gridSize, handleCoordinateChange]);

  useEffect(() => {
    const unsubscribe = eventBus.on('moveSelector', (payload) => {
      const { delta } = payload as { delta: [number, number, number] };

      // Get current selector position from brushState
      const currentPos = brushState.selectorPos;
      if (!currentPos) return; // Should not happen if selectorPos is initialized

      const nextPos: [number, number, number] = [
        currentPos[0] + delta[0],
        currentPos[1] + delta[1],
        currentPos[2] + delta[2],
      ];

      const { selectedShape, shapeSize, isHollow, brushQuaternion, customOffsets } = brushState;

      let finalPos: [number, number, number];
      let moved = false;

      // Determine the final, allowed position for the cursor
      if (isAnyBrushCellInside(nextPos, selectedShape, shapeSize, isHollow, brushQuaternion.current, gridSize, customOffsets)) {
        finalPos = nextPos;
        moved = true;
      } else {
        finalPos = currentPos;
      }

      // Update the selector position state
      setSelectorPos(finalPos);

      // If the cursor successfully moved and a paint mode is active, perform the action.
      // This is now a direct side effect of the event, not part of the state updater function.
      if (moved && brushState.paintMode !== 0) {
        if (brushState.paintMode === 1) {
          cameraActionsRef.current?.birthBrushCells();
        } else if (brushState.paintMode === -1) {
          cameraActionsRef.current?.clearBrushCells();
        }
      }
    });

    return () => unsubscribe();
  }, [eventBus, setSelectorPos, gridSize, brushState, cameraActionsRef]);

  return (
    <section className="menu-section">
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span>
          Cursor Position
          {cameraOrientation.face !== 'unknown' && cameraOrientation.rotation !== 'unknown' && (
            <span style={{ color: '#aaa', marginLeft: '8px', fontSize: '0.8em', fontWeight: 'normal' }}>
              ({cameraOrientation.face.charAt(0).toUpperCase() + cameraOrientation.face.slice(1)}, {cameraOrientation.rotation}°)
            </span>
          )}
        </span>
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
      </h3>
      {!isCollapsed && (
        <div className="selector-position-section">
          {(["X", "Y", "Z"] as const).map((axis) => (
            <div key={axis} className="coordinate-input-container">
              <label>{axis}</label>
              <div className="coordinate-input-group">
                <input
                  type="number"
                  className="coordinate-input"
                  value={selectorPos ? selectorPos[{ X: 0, Y: 1, Z: 2 }[axis]] : ''}
                  onChange={(e) => handleCoordinateChange(axis, e.target.value)}
                  min={0}
                  max={gridSize - 1}
                />
                <div className="coord-buttons">
                  <button
                    onClick={() => increment(axis)}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => decrement(axis)}
                  >
                    ▼
                  </button>
                </div>
              </div>
              <div className="coord-hints">
                <kbd>{keyMap[axis].inc}</kbd>
                <kbd>{keyMap[axis].dec}</kbd>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


function CameraControlSection() {
  const {
    state: { panSpeed, rotationSpeed, rollSpeed, invertYaw, invertPitch, invertRoll, easeIn, easeOut },
    actions: { setPanSpeed, setRotationSpeed, setRollSpeed, setInvertYaw, setInvertPitch, setInvertRoll, setEaseIn, setEaseOut },
  } = useSimulation();

  const [isCollapsed, setIsCollapsed] = usePersistentState("gol_collapse_camera", true);

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
              max={100}
              step={1}
              value={panSpeed}
              onChange={(e) => setPanSpeed(Number(e.target.value))}
            />
          </label>
          <label className="control-label">
            <span>Yaw (Swivel) Speed: {rotationSpeed}</span>
            <input
              type="range"
              min={50}
              max={200}
              step={1}
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(Number(e.target.value))}
            />
          </label>
          <label className="control-label">
            <span>Roll Speed: {rollSpeed}</span>
            <input
              type="range"
              min={25}
              max={100}
              step={1}
              value={rollSpeed}
              onChange={(e) => setRollSpeed(Number(e.target.value))}
            />
          </label>
          <label className="control-label row">
            <span>Invert Yaw (Swivel)</span>
            <input
              type="checkbox"
              className="glass-checkbox"
              checked={invertYaw}
              onChange={(e) => setInvertYaw(e.target.checked)}
            />
          </label>
          <label className="control-label row">
            <span>Invert Roll</span>
            <input
              type="checkbox"
              className="glass-checkbox"
              checked={invertRoll}
              onChange={(e) => setInvertRoll(e.target.checked)}
            />
          </label>
          <label className="control-label row">
            <span>Invert Vertical (Pitch)</span>
            <input
              type="checkbox"
              className="glass-checkbox"
              checked={invertPitch}
              onChange={(e) => setInvertPitch(e.target.checked)}
            />
          </label>
          <label className="control-label">
            <span>Ease In (accel): {easeIn.toFixed(1)}s</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={easeIn}
              onChange={(e) => setEaseIn(Number(e.target.value))}
            />
          </label>
          <label className="control-label">
            <span>Ease Out (decel): {easeOut.toFixed(1)}s</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={easeOut}
              onChange={(e) => setEaseOut(Number(e.target.value))}
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
      fitDisplay,
    },
    meta: { gridRef, initialStateRef },
  } = useSimulation();

  const [isCollapsed, setIsCollapsed] = usePersistentState("gol_collapse_scenes", true);
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

export function SettingsSidebar({ isSmallScreen }: SettingsSidebarProps) {
  const {
    state: { running, viewMode, community, buildInfo },
    actions: {
      playStop,
      step,
      stepBackward,
      reset,
      randomize,
      clear,
      setviewMode, applyCells, setSpeed, setDensity, setSurviveMin, setSurviveMax,
      setBirthMin, setBirthMax, setBirthMargin, setCellMargin,
      setNeighborFaces, setNeighborEdges, setNeighborCorners,
      fitDisplay
    },
  } = useSimulation();
  const {
    state: { savedConfigs, selectedConfigName },
    actions: { setSelectedConfigName },
  } = useGenesisConfig();
  const [collapsed, setCollapsed] = useState(() => {
    // Default to collapsed if starting on small screen
    if (typeof window !== "undefined") {
      return window.innerWidth <= 768;
    }
    return false;
  });


  // Ensure savedConfigs is an object before calling Object.keys
  const configOptions = savedConfigs ? Object.keys(savedConfigs) : [];

  const handleSelectConfig = useCallback((name: string) => {
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
  }, [
    setSelectedConfigName, savedConfigs, applyCells, setSpeed, setDensity,
    setSurviveMin, setSurviveMax, setBirthMin, setBirthMax, setBirthMargin,
    setCellMargin, setNeighborFaces, setNeighborEdges, setNeighborCorners,
    fitDisplay
  ]);

  useEffect(() => {
    if (!selectedConfigName && configOptions.length > 0) {
      // Set the second preinstalled scene as default (index 1)
      handleSelectConfig(configOptions[1]);
    }
  }, [selectedConfigName, configOptions, handleSelectConfig]);


  // Add this new useEffect block:
  useEffect(() => {
    if (viewMode) {
      document.body.classList.add("view-mode");
      document.body.classList.remove("edit-mode");
    } else {
      document.body.classList.add("edit-mode");
      document.body.classList.remove("view-mode");
    }
  }, [viewMode]);



  return (
    <>
      <aside
        className={`main-menu glass-panel  ${community.length > 0 && !viewMode ? "has-sidebar" : ""}`}
        style={{ border: "none" }}
      >
        <div className="tests-panel">
          <header
            className="menu-header"
          >
            <h3>
              Settings

            </h3>
          </header>
          <div className="menu-scrollable-content">
            {viewMode && <CameraControlSection />}
            {!viewMode && <SceneManagementSection />}
            {!viewMode && <EnvironmentSection />}
            {!viewMode && <SelectorPositionSection />}
            <RulesSection />
            <TestsSection isProd={buildInfo.distribution === "prod"} />
            {buildInfo.distribution !== "prod" && (
              <>

              </>
            )}
          </div>
        </div>

      </aside>
    </>
  );
}

// These were incorrectly exported as static properties of MainMenu.
// They are either internal functions or separate components.
// ActionsSection is an internal function and does not need to be exported.
// EnvironmentSection, RulesSection, TestsSection, SelectorPositionSection, CameraControlSection, SceneManagementSection are internal components of MainMenu.
// AppHeaderPanel is a separate component and should be imported directly.
