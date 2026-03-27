import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Scene } from "../components/Grid";
import { AppHeaderPanel, MainMenu } from "../components/MainMenu";
import { ShortcutOverlay } from "../components/ShortcutOverlay";
import { WelcomeModal } from "../components/WelcomeModal";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { supportsHollow } from "../core/shapes";
import { useAppShortcuts } from "../hooks/useAppShortcuts";

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
    const interval = setInterval(() => {
      if (gridRef.current.version !== lastVersionRef.current) {
        lastVersionRef.current = gridRef.current.version;
        setStats({
          generation: gridRef.current.generation,
          cells: gridRef.current.getLivingCells().length,
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gridRef]);

  return (
    <div className="stats">
      <span>Generation: {stats.generation}</span>
      <span>Cells: {stats.cells}</span>
      <span>{running ? "Running" : "Paused"}</span>
    </div>
  );
}

export default function App() {
  const {
    state: { rotationMode, running, squareUp },
    actions: { setRotationMode, recenter, fitDisplay, setSquareUp },
  } = useSimulation();
  const {
    state: { selectorPos, selectedShape, shapeSize, isHollow },
  } = useBrush();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useAppShortcuts();

  useEffect(() => {
    if (rotationMode === false) {
      recenter();
      fitDisplay();
    }
  }, [rotationMode, recenter, fitDisplay]);



  return (
    <div className="app">
      <AppHeaderPanel />

      <div className="main-content-layout">
        <aside className="ui-overlay">
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
          <SimulationStats />
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
          <button
            className="glass-button shortcuts-toggle"
            onClick={() => setShowShortcuts(true)}
          >
            ⌘ Shortcuts
          </button>


          <MainMenu />
        </aside>

        <main className="canvas-container">
          <Canvas>
            <Scene />
          </Canvas>
        </main>
      </div>

      <WelcomeModal />
      <ShortcutOverlay
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
