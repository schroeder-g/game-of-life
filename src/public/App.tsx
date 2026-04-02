import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState, useCallback } from "react";
import { Scene } from "../components/Grid";
import { SettingsSidebar } from "../components/SettingsSidebar";
import { AppHeaderPanel } from "../components/AppHeaderPanel";
import { WelcomeModal } from "../components/WelcomeModal";
import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";
import { supportsHollow } from "../core/shapes";
import { useAppShortcuts } from "../hooks/useAppShortcuts";

export default function App() {
  const {
    state: { viewMode, running, squareUp, userName, buildInfo, showIntroduction },
    actions: { setviewMode, recenter, fitDisplay, setSquareUp, setShowIntroduction, setUserName },
  } = useSimulation();
  const {
    state: { selectorPos, selectedShape, shapeSize, isHollow },
  } = useBrush();
  const [isSmallScreen, setIsSmallScreen] = useState(false); // Moved from SettingsSidebar
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(true); // New state, defaults to true

  // State for draggable footer poTODO-055sition
  const [footerPosition, setFooterPosition] = useState({ x: 10, y: 10 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const footerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null); // Ref for the canvas container
  const [canvasSize, setCanvasSize] = useState(0); // State for the square canvas size

  useAppShortcuts();

  useEffect(() => {
    console.log("App: viewMode changed to", viewMode);
    if (viewMode === false) {
      console.log("App: Calling recenter and fitDisplay in Edit mode.");
      recenter();
      fitDisplay();
    }
  }, [viewMode, recenter, fitDisplay]);

  // Effect to set and update canvas size to be square using ResizeObserver
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvasContainerRef.current) {
          const { width, height } = entry.contentRect;
          const newSize = Math.min(width, height);
          console.log(`App: Canvas container resized. Width: ${width}, Height: ${height}, Calculated canvasSize: ${newSize}`);
          setCanvasSize(newSize);
        }
      }
    });

    resizeObserver.observe(canvasContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Effect for logging canvas render conditions
  useEffect(() => {
    console.log(`App: Canvas render conditions - canvasSize: ${canvasSize}, userName: ${userName}, distribution: ${buildInfo.distribution}, showIntroduction: ${showIntroduction}`);
    if (!(canvasSize > 0 && (userName || buildInfo.distribution === 'prod') && !showIntroduction)) {
      console.log("App: Canvas not rendered due to conditions.");
    }
  }, [canvasSize, userName, buildInfo.distribution, showIntroduction]);

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
      <AppHeaderPanel
        showSettingsSidebar={showSettingsSidebar}
        setShowSettingsSidebar={setShowSettingsSidebar}
      />

      <div className="main-content-layout">
        {showSettingsSidebar && (
          <div className="ui-overlay">
            <SettingsSidebar isSmallScreen={isSmallScreen} />
          </div>
        )}

        <main
          ref={canvasContainerRef}
          className="canvas-container"
          style={{
            flex: 1,
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          {canvasSize > 0 && !showIntroduction ? ( // Simplified condition
            <div
              style={{
                width: canvasSize,
                height: canvasSize,
                position: 'relative',
              }}
            >
              <Canvas style={{ width: '100%', height: '100%', touchAction: 'none' }}>
                <Scene />
              </Canvas>
              {!viewMode && (
                <div
                  ref={footerRef}
                  style={{
                    position: 'absolute',
                    left: footerPosition.x,
                    top: footerPosition.y,
                    zIndex: 999,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    touchAction: 'none',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '10px',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      cursor: 'grab',
                      position: 'absolute',
                      top: '-10px',
                      left: 0,
                      borderRadius: '5px 5px 0 0',
                    }}
                    onMouseDown={onMouseDown}
                    onTouchStart={(e) => onMouseDown(e as any)}
                  />
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>

      {showIntroduction && <WelcomeModal setShowIntroduction={setShowIntroduction} setUserName={setUserName} />}
    </div>
  );
}
