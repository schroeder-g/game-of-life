import React, { useCallback, useRef, useState, useEffect } from "react";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { type CameraFace, type CameraRotation } from "../core/faceOrientationKeyMapping";
import { type ShapeType } from "../core/shapes";
import { DocumentationModal } from "./DocumentationModal";
import { IntroductionModal } from "./IntroductionModal";
import { ShortcutOverlay } from "./ShortcutOverlay";
import { useClickOutside } from "../hooks/useClickOutside";
import { useGenesisConfig } from "../contexts/GenesisConfigContext";
import { AppHeaderPanelButtons } from "./AppHeaderPanelButtons";
import { ReleaseNotesModal } from "./ReleaseNotesModal";
import { SelectedCommunityPanel } from "./SelectedCommunityPanel"; // Import the new panel

function SimulationStats() {
  const {
    meta: { gridRef },
    state: { running },
  } = useSimulation();
  const [stats, setStats] = useState({
    generation: gridRef.current.generation,
    cells: gridRef.current.getLivingCells().length,
  });

  const lastVersionRef = useRef(gridRef.current.version);

  useEffect(() => {
    const updateStats = () => {
      setStats({
        generation: gridRef.current.generation,
        cells: gridRef.current.getLivingCells().length,
      });
    };

    const unsubscribe = gridRef.current.on('tick', updateStats);
    return () => unsubscribe();
  }, [gridRef.current]); // Depend on the current Grid3D instance

  return (
    <div className="simulation-stats-display">
      Generation: {stats.generation} Cells: {stats.cells} {running ? 'Running' : 'Paused'}
    </div>
  );
}

interface AppHeaderPanelProps {
  showMainMenu: boolean;
  setShowMainMenu: (show: boolean) => void;
}

export function AppHeaderPanel({ showMainMenu, setShowMainMenu }: AppHeaderPanelProps) {
  const {
    state: { running, rotationMode, hasInitialState, hasPastHistory, cameraOrientation, userName, buildInfo, squareUp, isSquaredUp, speed, gridSize, showIntroduction, community }, // Added community
    actions: { playStop, step, stepBackward, reset, setRotationMode, fitDisplay, recenter, setSquareUp, setSpeed, setShowIntroduction },
    meta: { cameraActionsRef, eventBus }, // Added eventBus
  } = useSimulation();
  const {
    state: brushState,
    actions: { setPaintMode, setShapeSize, setIsHollow },
  } = useBrush();
  const { selectedShape, paintMode, shapeSize, isHollow } = brushState;
  const { state: { selectedConfigName } } = useGenesisConfig();

  const [showDocumentation, setShowDocumentation] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [isHelpDropdownOpen, setIsHelpDropdownOpen] = useState(false);
  const [showCommunityPanel, setShowCommunityPanel] = useState(false); // New state for Community Panel
  const helpDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(helpDropdownRef, () => setIsHelpDropdownOpen(false));

  const faceName = cameraOrientation.face !== 'unknown'
    ? cameraOrientation.face.charAt(0).toUpperCase() + cameraOrientation.face.slice(1)
    : 'Unknown';
  const rotationDegrees = cameraOrientation.rotation !== 'unknown'
    ? `${cameraOrientation.rotation}°`
    : '0°';

  const handleOpenDocumentation = useCallback(() => {
    setShowDocumentation(true);
    setIsHelpDropdownOpen(false);
  }, []);

  const handleOpenIntroduction = useCallback(() => {
    setShowIntroduction(true);
    setIsHelpDropdownOpen(false);
  }, [setShowIntroduction]);

  const handleOpenShortcuts = useCallback(() => { // New handler for shortcuts
    setShowShortcuts(true);
    setIsHelpDropdownOpen(false);
  }, []);

  const handleOpenReleaseNotes = useCallback(() => {
    setShowReleaseNotes(true);
    setIsHelpDropdownOpen(false);
  }, []);

  const toggleCommunityPanel = useCallback(() => {
    setShowCommunityPanel(prev => !prev);
  }, []);

  // Listen for 'showCommunityPanel' event from BrushControls
  useEffect(() => {
    const unsubscribe = eventBus.on('showCommunityPanel', (show) => {
      setShowCommunityPanel(show);
    });
    return () => unsubscribe();
  }, [eventBus]);

  return (
    <div className="app-header-panel">
      <div className="title-section">
        <h1>Cube of Life</h1>
        <div className="version-info">
          {userName && buildInfo.distribution !== "prod" && (
            <span className="user-welcome" style={{ marginRight: '8px' }}>Welcome, {userName}!</span>
          )}
          <a>
            Build: {buildInfo.version}
            {buildInfo.distribution !== "prod" && buildInfo.buildTime
              ? ` @ ${new Date(buildInfo.buildTime).toLocaleTimeString()}`
              : ""} ({buildInfo.distribution})
          </a>
        </div>
      </div>

      <div className="cube-status-panel">
        <div className="scene-status">
          Scene: {selectedConfigName || "Unsaved"}
        </div>
        <div className="orientation-status">
          Face: {faceName}, {rotationDegrees}
        </div>
        {!rotationMode && (
          <div className="shape-status">
            Shape: {selectedShape}
          </div>
        )}
        <SimulationStats />
      </div>

      <AppHeaderPanelButtons
        running={running}
        rotationMode={rotationMode}
        hasInitialState={hasInitialState}
        hasPastHistory={hasPastHistory}
        squareUp={squareUp}
        isSquaredUp={isSquaredUp}
        speed={speed}
        gridSize={gridSize}
        playStop={playStop}
        step={step}
        stepBackward={stepBackward}
        reset={reset}
        setRotationMode={setRotationMode}
        fitDisplay={fitDisplay}
        recenter={recenter}
        setSquareUp={setSquareUp}
        setSpeed={setSpeed}

        selectedShape={selectedShape}
        paintMode={paintMode}
        shapeSize={shapeSize}
        isHollow={isHollow}
        setPaintMode={setPaintMode}
        setShapeSize={setShapeSize}
        setIsHollow={setIsHollow}

        isHelpDropdownOpen={isHelpDropdownOpen}
        setIsHelpDropdownOpen={setIsHelpDropdownOpen}
        helpDropdownRef={helpDropdownRef}
        handleOpenDocumentation={handleOpenDocumentation}
        handleOpenIntroduction={handleOpenIntroduction}
        handleOpenShortcuts={handleOpenShortcuts}
        handleOpenReleaseNotes={handleOpenReleaseNotes}
        showMainMenu={showMainMenu}
        setShowMainMenu={setShowMainMenu}
        showCommunityPanel={showCommunityPanel} // Pass new prop
        toggleCommunityPanel={toggleCommunityPanel} // Pass new prop
      />

      <DocumentationModal
        isOpen={showDocumentation}
        onClose={() => setShowDocumentation(false)}
      />

      <IntroductionModal
        isOpen={showIntroduction}
        onClose={() => setShowIntroduction(false)}
      />

      <ShortcutOverlay
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      <ReleaseNotesModal
        isOpen={showReleaseNotes}
        onClose={() => setShowReleaseNotes(false)}
      />

      <SelectedCommunityPanel
        isVisible={showCommunityPanel && community.length > 0 && !rotationMode}
        onClose={() => setShowCommunityPanel(false)}
      />
    </div>
  );
}
