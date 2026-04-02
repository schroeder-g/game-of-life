import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState, useCallback } from "react";
import { Scene } from "../components/Grid";
import { SettingsSidebar } from "../components/SettingsSidebar";
import { AppHeaderPanel } from "../components/AppHeaderPanel";
import { AppFooterPanel } from "../components/AppFooterPanel"; // New import
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
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false); // New state to track internal dropdown

  // State for draggable footer poTODO-055sition
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

  return (
    <div className="app" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppHeaderPanel
        showSettingsSidebar={showSettingsSidebar}
        setShowSettingsSidebar={setShowSettingsSidebar}
      />

      <div className="main-content-layout" style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
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
          {/* Always render the canvas */}
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
          </div>
        </main>
      </div>

      <AppFooterPanel
        userName={userName}
        buildInfo={buildInfo}
      /> {/* New footer panel */}

      {showIntroduction && (userName || localStorage.getItem('userName') || buildInfo.distribution === 'prod' ? null : (
        <WelcomeModal setShowIntroduction={setShowIntroduction} setUserName={setUserName} />
      ))}
    </div>
  );
}
