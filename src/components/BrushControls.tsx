import React, { useCallback, useState, useRef, useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, CameraFace, CameraRotation } from "../core/faceOrientationKeyMapping";

// Icon components for directional controls
const ArrowUpIcon = () => (
  <svg width="20" height="20" viewBox="5 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 14V0M5 7l7-7 7 7" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="20" height="20" viewBox="5 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 0v14M19 7l-7 7-7-7" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="5 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 7H5M12 14l-7-7 7-7" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="20" height="20" viewBox="5 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 7h14M12 0l7 7-7 7" />
  </svg>
);

const ArrowFurtherIcon = () => (
  <svg width="20" height="20" viewBox="5 0 14 14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 14V0M5 7l7-7 7 7" />
  </svg>
);

const ArrowCloserIcon = () => (
  <svg width="20" height="20" viewBox="5 0 14 14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 0v14M19 7l-7 7-7-7" />
  </svg>
);

const AwayIcon = () => (
  <svg width="10" height="10" viewBox="5 0 7 7" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 7 L5 0 L12 7 Z" />
  </svg>
);

const CloserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M0 0 L0 20 L20 20 Z" />
  </svg>
);

interface BrushControlsProps {

}

export function BrushControls() {
  const {
    state: { cameraOrientation, rotationMode },
    meta: { eventBus },
  } = useSimulation();

  const handleMove = useCallback((key: string) => {
    const face = cameraOrientation.face;
    const rotation = cameraOrientation.rotation;

    if (face === 'unknown' || rotation === 'unknown') {
      console.warn("Cannot move selector: camera orientation unknown.");
      return;
    }

    const mapping = KEY_MAP[face as CameraFace][rotation as CameraRotation];
    let delta: [number, number, number] = [0, 0, 0];

    switch (key) {
      case 'w': // Up
        delta = mapping.w as [number, number, number];
        break;
      case 'x': // Down
        delta = mapping.x as [number, number, number];
        break;
      case 'a': // Left
        delta = mapping.a as [number, number, number];
        break;
      case 'd': // Right
        delta = mapping.d as [number, number, number];
        break;
      case 'q': // Further
        delta = mapping.q as [number, number, number];
        break;
      case 'z': // Closer
        delta = mapping.z as [number, number, number];
        break;
      default:
        return;
    }
    eventBus.emit('moveSelector', { delta });
  }, [cameraOrientation, eventBus]);

  const [position, setPosition] = useState({ x: 10, y: 10 }); // Initial position
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (activeKey) {
      intervalId = setInterval(() => {
        handleMove(activeKey);
      }, 250); // Repeat every 0.25 seconds
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeKey, handleMove]);

  // Effect to set initial position to top-right relative to its offset parent
  useEffect(() => {
    if (panelRef.current) {
      const panelRect = panelRef.current.getBoundingClientRect();
      // Calculate top-right position with a 10px margin relative to the viewport
      const initialX = window.innerWidth - panelRect.width - 10;
      const initialY = 10; // Always 10px from the top of the viewport

      // Ensure initial position is not negative and respects the 10px margin
      setPosition({ x: Math.max(10, initialX), y: Math.max(10, initialY) });
    }
  }, []); // Empty dependency array means it runs once after initial render

  // Effect to handle window resize and re-clamp position relative to its offset parent
  useEffect(() => {
    const handleResize = () => {
      if (panelRef.current) {
        const panelRect = panelRef.current.getBoundingClientRect();

        const minX = 10;
        const minY = 10;
        const maxX = window.innerWidth - panelRect.width - 10;
        const maxY = window.innerHeight - panelRect.height - 10;

        // Use functional update to get the latest position state
        setPosition(prevPosition => {
          const currentX = prevPosition.x;
          const currentY = prevPosition.y;

          const clampedX = Math.max(minX, Math.min(currentX, maxX));
          const clampedY = Math.max(minY, Math.min(currentY, maxY));

          if (clampedX !== currentX || clampedY !== currentY) {
            return { x: clampedX, y: clampedY };
          }
          return prevPosition; // No change needed
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty dependency array: listener is set up once and uses functional update for state

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (panelRef.current) {
      const panelElement = panelRef.current;
      const panelRect = panelElement.getBoundingClientRect();
      const debugInfo = {
        pointerAbsolute: { x: e.clientX, y: e.clientY },
        brushControlsAbsolute: { x: panelRect.left, y: panelRect.top },
        dragOffset: {
          x: e.clientX - panelRect.left,
          y: e.clientY - panelRect.top,
        },
      };
      (window as any).debugInfo = debugInfo;

      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - panelRef.current.getBoundingClientRect().left,
        y: e.clientY - panelRef.current.getBoundingClientRect().top,
      };
      panelRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const panelElement = panelRef.current;
    if (!panelElement) return;

    const panelRect = panelElement.getBoundingClientRect();

    // Calculate the new top-left corner of the panel in viewport coordinates
    const newPanelLeft_viewport = e.clientX - dragOffset.current.x;
    const newPanelTop_viewport = e.clientY - dragOffset.current.y;

    // Define clamping boundaries relative to the viewport
    const minX = 10;
    const minY = 10;
    const maxX = window.innerWidth - panelRect.width - 10;
    const maxY = window.innerHeight - panelRect.height - 10;

    // Clamp the position relative to the viewport
    const clampedX = Math.max(minX, Math.min(newPanelLeft_viewport, maxX));
    const clampedY = Math.max(minY, Math.min(newPanelTop_viewport, maxY));

    setPosition({
      x: clampedX,
      y: clampedY,
    });

    const debugInfo = {
      pointerAbsolute: { x: e.clientX, y: e.clientY },
      brushControlsAbsolute: { x: clampedX, y: clampedY },
      dragOffset: dragOffset.current,
    };
    (window as any).debugInfo = debugInfo;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (panelRef.current) {
      panelRef.current.style.cursor = 'grab';
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (rotationMode) {
    return null;
  }

  return (
    <div
      id="brush-controls"
      ref={panelRef}
      style={{
        position: 'fixed', // Changed from absolute
        top: position.y,
        left: position.x,
        // Removed bottom: 0 and width: '100%'
        backgroundColor: 'rgba(13, 17, 23, 0.8)', // Using a specific color with transparency
        padding: '10px',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: isDragging ? 'grabbing' : 'grab', // Add grab cursor
        touchAction: 'none', // Prevent default touch actions like scrolling
      }}
      onMouseDown={handleMouseDown}
    // onTouchStart={handleTouchStart} // Add touch handlers if needed
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridTemplateRows: 'auto auto auto auto auto auto',
        gap: '5px',
        maxWidth: '200px', // Limit width for better mobile display
      }}>


        <div style={{ gridColumn: '2 / 3', gridRow: '1 / 3', display: 'flex', justifyContent: 'center' }}>
          <button
            id="upBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('w'); setActiveKey('w'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '50px', height: '30px' }}
          ><ArrowUpIcon /></button>
        </div>

        <div style={{ gridColumn: '2 / 3', gridRow: '3 / 4', display: 'flex', justifyContent: 'center' }}>
          <button
            id="downBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('x'); setActiveKey('x'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '50px', height: '30px' }}
          ><ArrowDownIcon /></button>
        </div>

        <div style={{ gridColumn: ' 1 / 2', gridRow: '2 / 4', display: 'flex', justifyContent: 'center' }}>
          <button
            id="leftBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('a'); setActiveKey('a'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '50px', height: '30px' }}
          ><ArrowLeftIcon /></button>
        </div>

        <div style={{ gridColumn: ' 3 / 4', gridRow: '2 / 4', display: 'flex', justifyContent: 'center' }}>
          <button
            id="rightBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('d'); setActiveKey('d'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '50px', height: '30px' }}
          ><ArrowRightIcon /></button>
        </div>

        <div style={{ gridColumn: '11/ 12', gridRow: '1 / 3', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button
            id="furtherBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('q'); setActiveKey('q'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '100px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt' }}
          ><AwayIcon />&nbsp;&nbsp;Further</button>
        </div>

        <div style={{ gridColumn: '11 / 12', gridRow: '3 / 5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button
            id="closerBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('z'); setActiveKey('z'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '100px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
          ><CloserIcon />&nbsp;&nbsp; Closer </button>
        </div>


      </div>
    </div >
  );
}
