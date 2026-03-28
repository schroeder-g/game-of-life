import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState, useCallback } from "react"; // Added useCallback
import { Scene } from "../components/Grid";
import { MainMenu } from "../components/MainMenu";
import { AppHeaderPanel } from "../components/AppHeaderPanel";
import { ShortcutOverlay } from "../components/ShortcutOverlay";
import { WelcomeModal } from "../components/WelcomeModal";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { supportsHollow } from "../core/shapes";
import { useAppShortcuts } from "../hooks/useAppShortcuts";
import { BrushControls } from "../components/BrushControls"; // NEW IMPORT

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
  const [isSmallScreen, setIsSmallScreen] = useState(false); // Moved from MainMenu

  // State for draggable footer position
  const [footerPosition, setFooterPosition] = useState({ x: 10, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const footerRef = useRef<HTMLDivElement>(null);

  useAppShortcuts();

  useEffect(() => {
    if (rotationMode === false) {
      recenter();
      fitDisplay();
    }
  }, [rotationMode, recenter, fitDisplay]);

  // Effect to check screen size for small screens
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Dragging logic
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (footerRef.current) {
      const rect = footerRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setIsDragging(true);
    }
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      // Keep within canvas bounds
      const canvas = document.querySelector('.canvas-container');
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        const footerRect = footerRef.current?.getBoundingClientRect();

        const maxX = canvasRect.width - (footerRect?.width || 0);
        const maxY = canvasRect.height - (footerRect?.height || 0);

        setFooterPosition({
          x: Math.max(0, Math.min(newX - canvasRect.left, maxX)),
          y: Math.max(0, Math.min(newY - canvasRect.top, maxY)),
        });
      }
    }
  }, [isDragging]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    } else {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, onMouseMove, onMouseUp]);


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
              {supportsHollow(selectedShape) && `x${shapeSize}`}
              )
              {isHollow && supportsHollow(selectedShape) && " (hollow)"}
            </div>
          )}
          <button
            className="glass-button shortcuts-toggle"
            onClick={() => setShowShortcuts(true)}
          >
            ⌘ Shortcuts
          </button>


          <MainMenu isSmallScreen={isSmallScreen} />
        </aside>

        <main className="canvas-container">
          <Canvas>
            <Scene />
          </Canvas>
          {isSmallScreen && (
            <div
              ref={footerRef}
              style={{
                position: 'absolute',
                left: footerPosition.x,
                top: footerPosition.y,
                zIndex: 999, // Ensure it's above other canvas elements
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none', // Disable touch scrolling for dragging
              }}
            >
              <div
                style={{
                  // Grab bar styling
                  width: '100%',
                  height: '10px', // Height of the grab bar
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  cursor: 'grab',
                  position: 'absolute',
                  top: '-10px', // Position above the controls
                  left: 0,
                  borderRadius: '5px 5px 0 0',
                }}
                onMouseDown={onMouseDown}
                onTouchStart={(e) => onMouseDown(e as any)} // For touch devices
              />
              <BrushControls isSmallScreen={isSmallScreen} />
            </div>
          )}
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
