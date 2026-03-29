import React, { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useBrush } from "../contexts/BrushContext";
import { useGenesisConfig } from "../contexts/GenesisConfigContext";
import { useSimulation } from "../contexts/SimulationContext";
import { type CameraFace, type CameraRotation, KEY_MAP } from "../core/faceOrientationKeyMapping";
import { SHAPES, ShapeType, supportsHollow } from "../core/shapes";
import { useClickOutside } from "../hooks/useClickOutside";
import { BrushControls } from "./BrushControls";

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

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
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);

const SquareUpOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l7 4v8l-7 4-7-4V6l7-4z" />
    <path d="M12 12l7-4M12 12v10M12 12l-7-4" />
  </svg>
);

const SquareUpOnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="5" width="14" height="14" />
    <rect x="8" y="8" width="8" height="8" strokeOpacity="0.4" />
    <path d="M5 5l3 3m8 0l3-3m0 14l-3-3m-8 0l-3 3" />
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

const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const MinusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const PaintBrushIcon = () => (
  <svg width="20" height="20" viewBox="0 0 220 220" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* Handle */}
    <rect x="70" y="0" width="80" height="56" fill="currentColor" stroke="none" />
    {/* Ferrule */}
    <rect x="66" y="56" width="88" height="48" fill="none" stroke="currentColor" />
    <line x1="66" y1="56" x2="154" y2="104" stroke="currentColor" />
    <line x1="154" y1="56" x2="66" y2="104" stroke="currentColor" />
    {/* Bristles */}
    <path d="M66,104 C66,115 86,130 86,150 C86,190 94,220 110,220 C126,220 134,190 134,150 C134,130 154,115 154,104 Z" fill="none" stroke="currentColor" />
  </svg>
);

function SceneSelectorDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const {
    state: { savedConfigs, selectedConfigName },
    actions: { setSelectedConfigName },
  } = useGenesisConfig();

  const {
    state: { running },
    actions: {
      playStop, applyCells, setSpeed, setDensity, setSurviveMin, setSurviveMax,
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
      if (config.settings.neighborFaces !== undefined) setNeighborFaces(config.settings.neighborFaces);
      if (config.settings.neighborEdges !== undefined) setNeighborEdges(config.settings.neighborEdges);
      if (config.settings.neighborCorners !== undefined) setNeighborCorners(config.settings.neighborCorners);
      fitDisplay();
    }
    setIsOpen(false); // Close dropdown on selection
  }, [
    setSelectedConfigName, savedConfigs, applyCells, setSpeed, setDensity,
    setSurviveMin, setSurviveMax, setBirthMin, setBirthMax, setBirthMargin,
    setCellMargin, setNeighborFaces, setNeighborEdges, setNeighborCorners,
    fitDisplay
  ]);

  // Effect to close dropdown on outside click
  useClickOutside(dropdownRef, () => setIsOpen(false));

  const handleButtonClick = () => {
    if (running) {
      playStop();
    }
    setIsOpen(prev => !prev);
  };

  return (
    <div className="scene-selector-dropdown" ref={dropdownRef}>
      <button
        className="glass-button"
        onClick={handleButtonClick}
        data-tooltip-bottom="Select Scene"
      >
        <ImageIcon />
      </button>
      {isOpen && (
        <div className="dropdown-menu" onMouseLeave={() => setHoveredName(null)}>
          {configOptions.map((name) => {
            const isSelected = name === selectedConfigName;
            const isHovered = name === hoveredName;

            // An item is highlighted if it's the one being hovered,
            // or if nothing is hovered and it's the currently selected one.
            const isActive = isHovered || (hoveredName === null && isSelected);

            return (
              <button
                key={name}
                className={`dropdown-item ${isActive ? 'selected' : ''}`}
                onClick={() => handleSelectConfig(name)}
                onMouseEnter={() => setHoveredName(name)}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BrushSelectorDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const {
    state: { selectedShape, brushQuaternion },
    actions: { setSelectedShape, setCustomBrush, incrementBrushRotationVersion },
  } = useBrush();

  const { state: { community, cameraOrientation } } = useSimulation();

  const initBrushOrientation = useCallback(() => {
    const face = cameraOrientation.face;
    const rotation = cameraOrientation.rotation;
    if (face === 'unknown' || rotation === 'unknown') {
      brushQuaternion.current.identity();
      return;
    }
    const mapping = KEY_MAP[face as CameraFace][rotation as CameraRotation] as any;
    const right = mapping.d as number[];
    const up = mapping.w as number[];
    const depth = mapping.q as number[];
    const m = new THREE.Matrix4().set(
      right[0], up[0], depth[0], 0,
      right[1], up[1], depth[1], 0,
      right[2], up[2], depth[2], 0,
      0, 0, 0, 1,
    );
    brushQuaternion.current.setFromRotationMatrix(m);
    incrementBrushRotationVersion();
  }, [cameraOrientation, brushQuaternion, incrementBrushRotationVersion]);

  const handleSelectShape = useCallback((shape: ShapeType) => {
    if (shape === "Selected Community") {
      setCustomBrush(community);
    } else {
      setSelectedShape(shape);
      initBrushOrientation();
    }
    setIsOpen(false);
  }, [setCustomBrush, community, setSelectedShape, initBrushOrientation]);

  // Effect to close dropdown on outside click
  useClickOutside(dropdownRef, () => setIsOpen(false));

  const handleButtonClick = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div id="brush-selector-dropdown" className="scene-selector-dropdown" ref={dropdownRef}>
      <button
        className="glass-button"
        onClick={handleButtonClick}
        data-tooltip-bottom="Select Brush Shape"
      >
        <PaintBrushIcon />
      </button>
      {isOpen && (
        <div className="dropdown-menu" onMouseLeave={() => setHoveredName(null)}>
          {SHAPES.map((name) => {
            const isSelected = name === selectedShape;
            const isHovered = name === hoveredName;
            const isDisabled = name === "Selected Community" && community.length === 0;

            const isActive = isHovered || (hoveredName === null && isSelected);

            return (
              <button
                key={name}
                className={`dropdown-item ${isActive ? 'selected' : ''}`}
                onClick={() => handleSelectShape(name)}
                onMouseEnter={() => setHoveredName(name)}
                disabled={isDisabled}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface AppHeaderPanelButtonsProps {
  running: boolean;
  rotationMode: boolean;
  hasInitialState: boolean;
  hasPastHistory: boolean;
  squareUp: boolean;
  isSquaredUp: boolean;
  speed: number;
  gridSize: number;
  playStop: () => void;
  step: () => void;
  stepBackward: () => void;
  reset: () => void;
  setRotationMode: React.Dispatch<React.SetStateAction<boolean>>;
  fitDisplay: () => void;
  recenter: () => void;
  setSquareUp: (value: boolean) => void;
  setSpeed: (speed: number) => void;

  // Brush state and actions
  selectedShape: ShapeType;
  paintMode: number;
  shapeSize: number;
  isHollow: boolean;
  setPaintMode: React.Dispatch<React.SetStateAction<number>>;
  setShapeSize: (size: number) => void;
  setIsHollow: (isHollow: boolean) => void;

  // Help dropdown state and handlers
  isHelpDropdownOpen: boolean;
  setIsHelpDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  helpDropdownRef: React.RefObject<HTMLDivElement>;
  handleOpenDocumentation: () => void;
  handleOpenIntroduction: () => void;
  handleOpenShortcuts: () => void;
  showMainMenu: boolean; // New prop
  setShowMainMenu: (show: boolean) => void; // New prop
}

export function AppHeaderPanelButtons({
  running,
  rotationMode,
  hasInitialState,
  hasPastHistory,
  squareUp,
  isSquaredUp,
  speed,
  gridSize,
  playStop,
  step,
  stepBackward,
  reset,
  setRotationMode,
  fitDisplay,
  recenter,
  setSquareUp,
  setSpeed,

  selectedShape,
  paintMode,
  shapeSize,
  isHollow,
  setPaintMode,
  setShapeSize,
  setIsHollow,

  isHelpDropdownOpen,
  setIsHelpDropdownOpen,
  helpDropdownRef,
  handleOpenDocumentation,
  handleOpenIntroduction,
  handleOpenShortcuts,
  showMainMenu, // Destructure new prop
  setShowMainMenu, // Destructure new prop
}: AppHeaderPanelButtonsProps) {

  const handleBrushSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShapeSize(Number(e.target.value));
  }, [setShapeSize]);

  return (
    <div className="button-group panel-actions">

      <SceneSelectorDropdown />
      <button
        className="glass-button mode-toggle-button"
        onClick={() => setRotationMode((p) => !p)}
        title={rotationMode ? "Switch to Edit Mode" : "Switch to View Mode"}
      >
        {rotationMode ? <PencilIcon /> : <ProjectorIcon />}
      </button>
      {!rotationMode && (
        <>
          <BrushSelectorDropdown />
          {selectedShape !== "Selected Community" && selectedShape !== "Single Cell" && selectedShape !== "None" && (
            <>
              <div className="brush-size-control" style={{ width: '100px' }}>
                <span>Size: {shapeSize}</span>
                <input
                  type="range"
                  min={(selectedShape === "Cube" || selectedShape === "Square") ? 2 : 3}
                  max={gridSize}
                  step={1}
                  value={shapeSize}
                  onChange={handleBrushSizeChange}
                />
              </div>
              <label className="control-label row" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#8b949e' }}>
                <input
                  type="checkbox"
                  className="glass-checkbox"
                  checked={isHollow}
                  disabled={!supportsHollow(selectedShape)}
                  onChange={(e) => setIsHollow(e.target.checked)}
                />
                Hollow
              </label>
            </>
          )}
          <button
            className={`glass-button edit-action-button alive-button success ${paintMode === 1 ? 'active' : ''}`}
            onClick={() => setPaintMode(prev => (prev === 1 ? 0 : 1))}
            title="Activate (Paint) (Space)"
          >
            <PlusIcon />
          </button>
          <button
            className={`glass-button edit-action-button clear-button danger ${paintMode === -1 ? 'active' : ''}`}
            onClick={() => setPaintMode(prev => (prev === -1 ? 0 : -1))}
            title="Clear (Delete)"
          >
            <MinusIcon />
          </button>
          <BrushControls />
        </>
      )}
      <button
        className="glass-button primary"
        onClick={playStop}
        style={{ display: !rotationMode ? "none" : "block" }}
        data-tooltip-bottom={!rotationMode ? "Playback disabled in Edit mode" : running ? "Pause (Space)" : "Play (Space)"}
      >
        {running ? "⏸" : "▶"}
      </button>
      {rotationMode && (
        <div className="speed-control">
          <span>Speed: {speed}</span>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px' }}> {/* New container div */}
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
      </div> {/* End of new container div */}
      <div style={{ display: 'flex', gap: '10px' }}> {/* New container div for Fit, Recenter, Square Up */}
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
          className={`glass-button square-up-toggle ${squareUp ? (isSquaredUp ? 'active success' : 'active primary') : ''}`}
          onClick={() => setSquareUp(!squareUp)}
          title={`Square Up View (${squareUp ? (isSquaredUp ? 'SQUARED' : 'ALIGNING') : 'OFF'})`}
        >
          {squareUp ? <SquareUpOnIcon /> : <SquareUpOffIcon />}
        </button>
      </div> {/* End of new container div */}
      {/* Removed Auto-Square button */}

      <div className="dropdown-container" ref={helpDropdownRef}>
        <button
          className="glass-button"
          onClick={() => setIsHelpDropdownOpen(prev => !prev)}
          title="Help (?)"
          aria-label="Help (?)"
        >
          <strong>?</strong>
        </button>
        {isHelpDropdownOpen && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={handleOpenIntroduction}>
              Introduction
            </button>
            <button className="dropdown-item" onClick={handleOpenDocumentation}>
              Documentation
            </button>
            <button className="dropdown-item" onClick={handleOpenShortcuts}> {/* New Shortcuts button */}
              Shortcuts
            </button>
          </div>
        )}
      </div>
      <button
        className={`glass-button primary ${showMainMenu ? 'active' : ''}`}
        onClick={() => setShowMainMenu(!showMainMenu)}
        title="Toggle Main Menu"
        aria-label="Toggle Main Menu"
      >
        <GearIcon />
      </button>
      <div className="dropdown-container" ref={helpDropdownRef}>
        <button
          className="glass-button"
          onClick={() => setIsHelpDropdownOpen(prev => !prev)}
          title="Help (?)"
          aria-label="Help (?)"
        >
          ?
        </button>
        {isHelpDropdownOpen && (
          <div className="dropdown-menu">
            <button className="dropdown-item" onClick={handleOpenIntroduction}>
              Introduction
            </button>
            <button className="dropdown-item" onClick={handleOpenDocumentation}>
              Documentation
            </button>
            <button className="dropdown-item" onClick={handleOpenShortcuts}>
              Shortcuts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
