import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Scene } from "../components/Grid";
import { AppHeaderPanel, MainMenu } from "../components/MainMenu";
import { CommunitySidebar } from "../components/Controls";
import { ShortcutOverlay } from "../components/ShortcutOverlay";
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
    state: { rotationMode, community, running, snapMessage },
    actions: { setRotationMode, recenter, squareUp, fitDisplay, setSnapMessage },
  } = useSimulation();
  const {
    state: { selectorPos, selectedShape, shapeSize, isHollow },
  } = useBrush();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useAppShortcuts();

  useEffect(() => {
    if (rotationMode === false) {
      recenter();
      squareUp();
      fitDisplay();
    }
  }, [rotationMode, recenter, squareUp, fitDisplay]);

  useEffect(() => {
    console.log("APP STATE - community length:", community.length);
  }, [community]);

  useEffect(() => {
    if (snapMessage) {
      const timer = setTimeout(() => {
        setSnapMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [snapMessage, setSnapMessage]);

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
          {snapMessage && <div className="snap-message">{snapMessage}</div>}
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
          <CommunitySidebar community={community} />
        </aside>

        <main className="canvas-container">
          <Canvas>
            <Scene />
          </Canvas>
        </main>
      </div>

      <ShortcutOverlay
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
