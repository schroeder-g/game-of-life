import { useCallback, useEffect, useState } from "react";
import * as THREE from "three"; // Added
import { useGenesisConfig } from "../contexts/GenesisConfigContext";
import { useSimulation } from "../contexts/SimulationContext";
import { useBrush } from "../contexts/BrushContext"; // Added
import { CommunitySidebar } from "./Controls";
import { DEFAULT_CONFIGS } from "../data/default-configs";
import { AutomatedTestsPanel } from "./AutomatedTestsPanel";
import { ManualTestsPanel } from "./ManualTestsPanel";
import { MANUAL_TESTS } from "../data/manual-tests";
import { AUTOMATED_TEST_IDS } from "../data/automated-tests";
import { DOCUMENTATION_CONTENT } from "../data/documentation";
import { AppHeaderPanel } from "./AppHeaderPanel"; // Import the new component
import { type CameraFace, type CameraRotation, KEY_MAP } from "../core/faceOrientationKeyMapping"; // Added
import { SHAPES, ShapeType, supportsHollow } from "../core/shapes"; // Added
import { isAnyBrushCellInside } from "../core/brushUtils"; // Added
import { CheckCircle, XCircle, Circle, ChevronDown, ChevronRight } from 'lucide-react';


interface MainMenuProps {
  isSmallScreen: boolean;
}

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
    state: { gridSize, cameraOrientation },
    meta: { eventBus, cameraActionsRef },
  } = useSimulation();
  const {
    state: brushState,
    actions: { setSelectorPos },
  } = useBrush();
  const { selectorPos } = brushState;

  const [isCollapsed, setIsCollapsed] = useState(true);

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

      setSelectorPos((currentPos: [number, number, number] | null) => {
        if (!currentPos) return null;

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

        // If the cursor successfully moved and a paint mode is active, perform the action.
        if (moved && brushState.paintMode !== 0) {
          if (brushState.paintMode === 1) {
            cameraActionsRef.current?.birthBrushCells();
          } else if (brushState.paintMode === -1) {
            cameraActionsRef.current?.clearBrushCells();
          }
        }

        // Return the final position to update the state
        return finalPos;
      });
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

function ShapeBrushSection() {
  const {
    state: { gridSize, community, cameraOrientation },
  } = useSimulation();
  const {
    state: { selectedShape, shapeSize, isHollow, brushQuaternion, showProjectionGuides },
    actions: { setSelectedShape, setShapeSize, setIsHollow, setCustomBrush, incrementBrushRotationVersion, setShowProjectionGuides },
  } = useBrush();

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Compute the initial brush quaternion so the brush appears "square"
  // with the dominant face/angle, using KEY_MAP directions.
  const initBrushOrientation = () => {
    const face = cameraOrientation.face;
    const rotation = cameraOrientation.rotation;
    if (face === 'unknown' || rotation === 'unknown') {
      brushQuaternion.current.identity();
      return;
    }
    const mapping = KEY_MAP[face as CameraFace][rotation as CameraRotation] as any;
    // d = screen-right in grid-local, w = screen-up, q = screen-depth
    const right = mapping.d as number[];
    const up = mapping.w as number[];
    const depth = mapping.q as number[];
    // Build a rotation matrix: columns = right, up, depth
    const m = new THREE.Matrix4().set(
      right[0], up[0], depth[0], 0,
      right[1], up[1], depth[1], 0,
      right[2], up[2], depth[2], 0,
      0, 0, 0, 1,
    );
    brushQuaternion.current.setFromRotationMatrix(m);
    incrementBrushRotationVersion();
  };

  return (
    <section className="menu-section">
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <span role="img" aria-label="paint-roller">ローラー</span> Shape Brush
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
      </h3>
      {!isCollapsed && (
        <>
          <label className="control-label">
            <span>Shape</span>
            <select
              className="glass-select"
              value={selectedShape}
              onChange={(e) => {
                const shape = e.target.value as ShapeType;
                if (shape === "Selected Community") {
                  setCustomBrush(community);
                } else {
                  setSelectedShape(shape);
                  // Initialize brush orientation to match current face/angle
                  initBrushOrientation();
                }
              }}
            >
              {SHAPES.map((shape) => (
                <option
                  key={shape}
                  value={shape}
                  disabled={shape === "Selected Community" && community.length === 0}
                >
                  {shape}
                </option>
              ))}
            </select>
          </label>
          {selectedShape !== "Selected Community" && selectedShape !== "Single Cell" && selectedShape !== "None" && (
            <>
              <label className="control-label">
                <span>Size: {shapeSize}</span>
                <input
                  type="range"
                  min={(selectedShape === "Cube" || selectedShape === "Square") ? 2 : 3}
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
              <label className="control-label row">
                <span>Show Guides</span>
                <input
                  type="checkbox"
                  className="glass-checkbox"
                  checked={showProjectionGuides}
                  onChange={(e) => setShowProjectionGuides(e.target.checked)}
                />
              </label>
            </>
          )}
        </>
      )}
    </section>
  );
}

function CameraControlSection() {
  const {
    state: { panSpeed, rotationSpeed, rollSpeed, invertYaw, invertPitch, invertRoll, easeIn, easeOut },
    actions: { setPanSpeed, setRotationSpeed, setRollSpeed, setInvertYaw, setInvertPitch, setInvertRoll, setEaseIn, setEaseOut },
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

interface DebugSectionProps {
  manualTests: ManualTest[];
  automatedTestIds: Set<string>;
  documentation: DocItem[];
  buildDistribution: 'dev' | 'test' | 'prod';
}

function DebugSection({ manualTests, automatedTestIds, documentation, buildDistribution }: DebugSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [debugData, setDebugData] = useState<any>(null);

  useEffect(() => {
    const updateDebugData = () => {
      if ((window as any).debugInfo) {
        setDebugData({ ...(window as any).debugInfo });
      }
      requestAnimationFrame(updateDebugData);
    };
    const handle = requestAnimationFrame(updateDebugData);
    return () => cancelAnimationFrame(handle);
  }, []);

  const formatCoord = (coord: { x: number, y: number }) => {
    if (!coord) return 'N/A';
    return `x: ${coord.x.toFixed(2)}, y: ${coord.y.toFixed(2)}`;
  };

  const formatRect = (rect: { top: number, left: number, width: number, height: number }) => {
    if (!rect) return 'N/A';
    return `t: ${rect.top.toFixed(2)}, l: ${rect.left.toFixed(2)}, w: ${rect.width.toFixed(2)}, h: ${rect.height.toFixed(2)}`;
  }

  return (
    <section className="menu-section">
      <h3
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Debug
        <span style={{ fontSize: "12px", opacity: 0.6 }}>{isCollapsed ? "▼" : "▲"}</span>
      </h3>
      {!isCollapsed && debugData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 8px', fontSize: '12px', whiteSpace: 'nowrap' }}>
          <strong>Pointer Absolute:</strong><span>{formatCoord(debugData.pointerAbsolute)}</span>
          <strong>BrushControls Absolute:</strong><span>{formatCoord(debugData.brushControlsAbsolute)}</span>
          <strong>BrushControls Canvas:</strong><span>{formatCoord(debugData.brushControlsCanvas)}</span>
          <strong>Mouse Canvas:</strong><span>{formatCoord(debugData.mouseCanvas)}</span>
          <strong>Drag Offset:</strong><span>{formatCoord(debugData.dragOffset)}</span>
          <strong>Container Rect:</strong><span>{formatRect(debugData.offsetParentRect)}</span>
        </div>
      )}
      {!isCollapsed && buildDistribution !== "prod" && (
        <>
          <ManualTestsPanel
            manualTests={manualTests}
            automatedTestIds={automatedTestIds}
            documentation={documentation}
          />
          <AutomatedTestsPanel
            manualTests={manualTests}
            automatedTestIds={automatedTestIds}
            documentation={documentation}
          />
        </>
      )}
    </section>
  );
}

export function MainMenu() {
  const {
    state: { running, rotationMode, community, buildInfo },
    actions: {
      playStop,
      step,
      stepBackward,
      reset,
      randomize,
      clear,
      setRotationMode, applyCells, setSpeed, setDensity, setSurviveMin, setSurviveMax,
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

  const [isSmallScreen, setIsSmallScreen] = useState(false);

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
      handleSelectConfig(configOptions[0]);
    }
  }, [selectedConfigName, configOptions, handleSelectConfig]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Add this new useEffect block:
  useEffect(() => {
    if (rotationMode) {
      document.body.classList.add("view-mode");
      document.body.classList.remove("edit-mode");
    } else {
      document.body.classList.add("edit-mode");
      document.body.classList.remove("view-mode");
    }
  }, [rotationMode]);

  // Collapse Configuration panel when a community is selected
  useEffect(() => {
    if (community.length > 0) {
      setCollapsed(true);
    }
  }, [community]);

  return (
    <>
      <aside
        className={`main-menu glass-panel ${collapsed ? "collapsed" : ""} ${community.length > 0 && !rotationMode ? "has-sidebar" : ""}`}
      >
        <div className="tests-panel">
          <header
            className="menu-header"
            onClick={() => setCollapsed(!collapsed)}
          >
            <h3 onClick={() => setCollapsed(!collapsed)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Configuration
              {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
            </h3>
          </header>
          {!collapsed && <ActionsSection />}
        </div>
        <div className="menu-scrollable-content">
          {rotationMode && !isSmallScreen && <CameraControlSection />}
          {!rotationMode && <SceneManagementSection />}
          {!rotationMode && <ShapeBrushSection />}
          {!rotationMode && <EnvironmentSection />}
          <RulesSection />
          {!rotationMode && <SelectorPositionSection />}
          <DebugSection
            manualTests={MANUAL_TESTS}
            automatedTestIds={AUTOMATED_TEST_IDS}
            documentation={DOCUMENTATION_CONTENT}
            buildDistribution={buildInfo.distribution}
          />
        </div>
      </aside>
      {community.length > 0 && !rotationMode && <CommunitySidebar community={community} />}
    </>
  );
}

MainMenu.ActionsSection = ActionsSection;
MainMenu.EnvironmentSection = EnvironmentSection;
MainMenu.RulesSection = RulesSection;
MainMenu.ShapeBrushSection = ShapeBrushSection;
MainMenu.SceneManagementSection = SceneManagementSection;
MainMenu.CameraControlSection = CameraControlSection;
