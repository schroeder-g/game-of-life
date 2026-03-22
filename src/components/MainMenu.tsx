import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useBrush } from "../contexts/BrushContext";
import { useGenesisConfig } from "../contexts/GenesisConfigContext";
import { isAnyBrushCellInside } from "../core/brushUtils";
import { useSimulation } from "../contexts/SimulationContext";
import { CommunitySidebar } from "./Controls";
import { type CameraOrientation } from "../core/cameraUtils";
import { type CameraFace, type CameraRotation, KEY_MAP, rotationLookup } from "../core/faceOrientationKeyMapping";
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
    <rect x="6" y="9" width="10" height="10" />
    <path d="M6 9 l4 -4 h10 l-4 4" />
    <path d="M16 9 v10 l4 -4 v-10" />
  </svg>
);

const PencilIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const ProjectorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Reels */}
    <circle cx="7" cy="6" r="3" />
    <circle cx="15" cy="6" r="3" />
    {/* Body */}
    <rect x="5" y="10" width="12" height="8" rx="1" />
    {/* Lens/Light Wedge */}
    <path d="M17 12l5-3v6l-5-3" fill="currentColor" fillOpacity="0.2" stroke="none" />
    <path d="M17 12l5-3M17 12l5 3" />
    <line x1="17" y1="11" x2="17" y2="17" />
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
    state: { gridSize, cameraOrientation },
    meta: { eventBus },
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

        // Conditional clamping:
        // If brush is active, allow outside as long as it overlaps the grid.
        // If no brush, clamp strictly to grid bounds.
        const { selectedShape, shapeSize, isHollow, brushQuaternion, customOffsets } = brushState;

        if (selectedShape !== "None") {
          if (isAnyBrushCellInside(nextPos, selectedShape, shapeSize, isHollow, brushQuaternion.current, gridSize, customOffsets)) {
            return nextPos;
          } else {
            // If the move would pull it completely out, block it (return current)
            return currentPos;
          }
        } else {
          // Strict clamping for single cell
          const clampedX = Math.max(0, Math.min(gridSize - 1, nextPos[0]));
          const clampedY = Math.max(0, Math.min(gridSize - 1, nextPos[1]));
          const clampedZ = Math.max(0, Math.min(gridSize - 1, nextPos[2]));
          return [clampedX, clampedY, clampedZ];
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [eventBus, setSelectorPos, gridSize, brushState]);

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
    state: { selectedShape, shapeSize, isHollow, brushQuaternion },
    actions: { setSelectedShape, setShapeSize, setIsHollow, setCustomBrush, incrementBrushRotationVersion },
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
              onChange={(e) => {
                const shape = e.target.value as ShapeType;
                if (shape === "Selected Community") {
                  setCustomBrush(community);
                } else {
                  setSelectedShape(shape);
                  if (shape !== "None") {
                    // Initialize brush orientation to match current face/angle
                    initBrushOrientation();
                  }
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
          {selectedShape !== "Selected Community" && (
            <>
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
              min={1}
              max={100}
              step={1}
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(Number(e.target.value))}
            />
          </label>
          <label className="control-label">
            <span>Roll Speed: {rollSpeed}</span>
            <input
              type="range"
              min={100}
              max={500}
              step={10}
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

export function AppHeaderPanel() {
  const {
    state: { running, rotationMode, hasInitialState, hasPastHistory, cameraOrientation },
    actions: { playStop, step, stepBackward, reset, setRotationMode, fitDisplay, recenter, squareUp, setCell },
    meta: { cameraActionsRef },
  } = useSimulation();
  const {
    state: { selectedShape, selectorPos },
    actions: { setSelectedShape },
  } = useBrush();

  const faceName = cameraOrientation.face !== 'unknown'
    ? cameraOrientation.face.charAt(0).toUpperCase() + cameraOrientation.face.slice(1)
    : 'Unknown';
  const rotationDegrees = cameraOrientation.rotation !== 'unknown'
    ? `${cameraOrientation.rotation}°`
    : '0°';

  return (
    <div className="app-header-panel">
      <div className="title-section">
        <h1>Cube of Life</h1>
        <div className="version-info">
          <a>{typeof document !== "undefined" ? document.getElementById("version-data")?.textContent : ""}</a>
        </div>
      </div>

      <div className="cube-status-panel">
        <div className="orientation-status">
          Face: {faceName}, {rotationDegrees}
        </div>
        {!rotationMode && selectedShape !== "None" && (
          <div className="shape-status">
            Shape: {selectedShape}{" "}
            <span className="hint">
              (Esc to{" "}
              <a
                href="#"
                className="cancel-link"
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedShape("None");
                }}
              >
                Cancel
              </a>
              )
            </span>
          </div>
        )}
      </div>

      <div className="button-group panel-actions">
        {!rotationMode && (
          <>
            <button
              className="glass-button edit-action-button alive-button primary"
              onClick={() => {
                if (selectedShape !== "None") {
                  cameraActionsRef.current?.birthBrushCells();
                } else if (selectorPos) {
                  setCell(selectorPos[0], selectorPos[1], selectorPos[2], true);
                }
              }}
              title="Birth Cells (Space)"
            >
              Alive
            </button>
            <button
              className="glass-button edit-action-button clear-button danger"
              onClick={() => {
                if (selectedShape !== "None") {
                  cameraActionsRef.current?.clearBrushCells();
                } else if (selectorPos) {
                  setCell(selectorPos[0], selectorPos[1], selectorPos[2], false);
                }
              }}
              title="Clear Cells (Delete)"
            >
              Clear
            </button>
          </>
        )}
        <button
          className="glass-button mode-toggle-button"
          onClick={() => setRotationMode((p) => !p)}
          title={rotationMode ? "Switch to Edit Mode" : "Switch to View Mode"}
        >
          {rotationMode ? <PencilIcon /> : <ProjectorIcon />}
        </button>

        <button
          className="glass-button"
          onClick={fitDisplay}
          aria-label="Fit"
          data-tooltip-bottom="Fit (F)"
        >
          <FitIcon />
        </button>
        <button
          className="glass-button"
          onClick={recenter}
          aria-label="Recenter"
          data-tooltip-bottom="Recenter (S)"
        >
          <RecenterIcon />
        </button>
        <button
          className="glass-button"
          onClick={squareUp}
          aria-label="Square Up"
          data-tooltip-bottom="Square Up (L)"
        >
          <SquareUpIcon />
        </button>

        <button
          className="glass-button primary"
          onClick={playStop}
          disabled={!rotationMode}
          data-tooltip-bottom={!rotationMode ? "Playback disabled in Edit mode" : running ? "Pause (Space)" : "Play (Space)"}
        >
          {running ? "⏸" : "▶"}
        </button>
        <button
          className="glass-button"
          onClick={() => {
            if (running) {
              playStop();
            }
            stepBackward();
          }}
          disabled={running || !hasPastHistory}
          data-tooltip-bottom={
            running
              ? "Pause simulation to step"
              : !hasPastHistory
                ? "No history to step back to"
                : "Step Backward (←)"
          }
        >
          ⏮
        </button>
        <button
          className="glass-button"
          onClick={() => {
            if (running) {
              playStop();
            }
            step();
          }}
          disabled={running}
          data-tooltip-bottom={
            running ? "Pause simulation to step" : "Step Forward (→)"
          }
        >
          ⏭
        </button>
        <button
          className="glass-button"
          onClick={reset}
          disabled={!hasInitialState}
          data-tooltip-bottom={!hasInitialState ? "No initial state to reset to" : "Reset (R)"}
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

  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

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
          {rotationMode && !isSmallScreen && <CameraControlSection />}
          {!rotationMode && <SceneManagementSection />}
          {!rotationMode && <ShapeBrushSection />}
          {!rotationMode && <EnvironmentSection />}
          <RulesSection />
          {!rotationMode && <SelectorPositionSection />}
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
