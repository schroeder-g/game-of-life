import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState, useCallback } from "react";
import { Scene } from "../components/Grid";
import { MainMenu } from "../components/MainMenu";
import { AppHeaderPanel } from "../components/AppHeaderPanel";
import { ShortcutOverlay } from "../components/ShortcutOverlay";
import { WelcomeModal } from "../components/WelcomeModal";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { supportsHollow } from "../core/shapes";
import { useAppShortcuts } from "../hooks/useAppShortcuts";
import { BrushControls } from "../components/BrushControls";
import { brushControlsDocumentation } from "../data/brushControlsDocumentation"; // NEW IMPORT

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
  const canvasContainerRef = useRef<HTMLDivElement>(null); // Ref for the canvas container
  const [canvasSize, setCanvasSize] = useState(0); // State for the square canvas size

  useAppShortcuts();

  useEffect(() => {
    if (rotationMode === false) {
      recenter();
      fitDisplay();
    }
  }, [rotationMode, recenter, fitDisplay]);

  // Effect to set and update canvas size to be square
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        const { offsetWidth, offsetHeight } = canvasContainerRef.current;
        setCanvasSize(Math.min(offsetWidth, offsetHeight));
      }
    };

    updateCanvasSize(); // Set initial size
    window.addEventListener('resize', updateCanvasSize); // Update on resize

    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

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

          <MainMenu isSmallScreen={isSmallScreen} />
        </aside>

        <main
          ref={canvasContainerRef}
          className="canvas-container"
          style={{
            width: canvasSize > 0 ? canvasSize : '100%', // Apply calculated square size
            height: canvasSize > 0 ? canvasSize : '100%', // Apply calculated square size
            aspectRatio: '1 / 1', // Enforce a square aspect ratio
            display: 'flex', // Ensure Canvas fills the container
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {canvasSize > 0 && ( // Only render Canvas once size is determined
            <Canvas style={{ width: '100%', height: '100%' }}>
              <Scene />
            </Canvas>
          )}
          {!rotationMode && (
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
              <BrushControls />
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
