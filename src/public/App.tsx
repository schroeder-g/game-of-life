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

function CursorPositionControl() {
  const {
    state: { gridSize, arrowKeyMappings },
    actions: { setSelectorPos },
  } = useSimulation();
  const {
    state: { selectorPos },
  } = useBrush();

  const buttonsRef = useRef<Record<string, HTMLButtonElement | null>>({
    "+X": null,
    "-X": null,
    "+Y": null,
    "-Y": null,
    "+Z": null,
    "-Z": null,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: { [key: string]: string } = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const direction = keyMap[e.key];
      if (!direction) return;

      const func = Object.keys(arrowKeyMappings).find(
        (key) => arrowKeyMappings[key] === direction,
      );

      if (func && buttonsRef.current[func]) {
        e.preventDefault();
        buttonsRef.current[func]?.click();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [arrowKeyMappings]);

  const handleCoordinateChange = (axis: number, delta: number) => {
    setSelectorPos((prev) => {
      if (!prev) return null;
      const newPos: [number, number, number] = [...prev];
      newPos[axis] = Math.max(0, Math.min(gridSize - 1, newPos[axis] + delta));
      return newPos;
    });
  };

  const arrowSymbols: { [key: string]: string } = {
    up: "↑",
    down: "↓",
    left: "←",
    right: "→",
  };

  const arrowColors: { [key: string]: string } = {
    left: "red",
    right: "blue",
    up: "yellow",
    down: "green",
  };

  const getButtonColor = (func: string) => {
    const direction = arrowKeyMappings[func];
    return arrowColors[direction] || "white";
  };

  return (
    <div className="cursor-controls">
      {(["X", "Y", "Z"] as const).map((axis, index) => (
        <div key={axis} className="axis-control">
          <span className="axis-label">{axis}:</span>
          <div className="control-group">
            <button
              ref={(el) => (buttonsRef.current[`-${axis}`] = el)}
              onClick={() => handleCoordinateChange(index, -1)}
              className="glass-button"
              title={`Decrement ${axis}`}
              style={{ color: getButtonColor(`-${axis}`) }}
            >
              ↓
            </button>
            <input
              type="number"
              value={selectorPos ? selectorPos[index] : ""}
              readOnly
              className="coord-input"
            />
            <button
              ref={(el) => (buttonsRef.current[`+${axis}`] = el)}
              onClick={() => handleCoordinateChange(index, 1)}
              className="glass-button"
              title={`Increment ${axis}`}
              style={{ color: getButtonColor(`+${axis}`) }}
            >
              ↑
            </button>
          </div>
          <div className="key-mapping">
            <span className="key-map-down">
              {arrowSymbols[arrowKeyMappings[`-${axis}`]] || ""}
            </span>
            <span className="key-map-up">
              {arrowSymbols[arrowKeyMappings[`+${axis}`]] || ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

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
    state: { rotationMode, community, running, snapMessage, arrowKeyMappings },
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
          {!rotationMode && <CursorPositionControl />}
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
