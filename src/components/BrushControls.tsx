import React, { useCallback, useState, useRef, useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { KEY_MAP, CameraFace, CameraRotation } from "../core/faceOrientationKeyMapping";
import { SHAPES, ShapeType, supportsHollow } from "../core/shapes";
import { useBrush } from "../contexts/BrushContext";
import * as THREE from "three";
import { useClickOutside } from "../hooks/useClickOutside";
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


// Icon components for directional controls
const ArrowUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-label="ArrowUpIcon">
    <path d="M10 4.75 L4.75 15.25 L15.25 15.25 Z" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-label="ArrowDownIcon">
    <path d="M10 15.25 L4.75 4.75 L15.25 4.75 Z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-label="ArrowLeftIcon">
    <path d="M4.75 10 L15.25 4.75 L15.25 15.25 Z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-label="ArrowRightIcon">
    <path d="M15.25 10 L4.75 4.75 L4.75 15.25 Z" />
  </svg>
);

const ArrowFartherIcon = () => (
  <svg width="20" height="20" viewBox="5 -2 14 14" fill="currentColor" aria-label="ArrowFartherIcon">
    <path d="M12 0 L5 14 L19 14 Z" />
  </svg>
);

const ArrowCloserIcon = () => (
  <svg width="20" height="20" viewBox="5 -2 14 14" fill="currentColor" aria-label="ArrowCloserIcon">
    <path d="M12 14 L5 0 L19 0 Z" />
  </svg>
);

const AwayIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-label="AwayIcon">
    <rect x="1.5" y="1.5" width="7" height="7" />
  </svg>
);

const CloserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-label="CloserIcon">
    <rect x="0" y="0" width="20" height="20" />
  </svg>
);

function BrushSelectorDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const {
    state: { selectedShape, brushQuaternion },
    actions: { setSelectedShape, incrementBrushRotationVersion },
  } = useBrush();

  const { state: { cameraOrientation } } = useSimulation();

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
    setSelectedShape(shape);
    initBrushOrientation();
    setIsOpen(false);
  }, [setSelectedShape, initBrushOrientation]);

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
          {SHAPES.filter(name => name !== "Selected Community").map((name) => { // Filter out "Selected Community"
            const isSelected = name === selectedShape;
            const isHovered = name === hoveredName;

            const isActive = isHovered || (hoveredName === null && isSelected);

            return (
              <button
                key={name}
                className={`dropdown-item ${isActive ? 'selected' : ''}`}
                onClick={() => handleSelectShape(name)}
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


export function BrushControls() {
  const {
    state: { selectedShape, shapeSize, isHollow, paintMode },
    actions: { setShapeSize, setIsHollow, setPaintMode, setSelectedShape, setCustomBrush },
  } = useBrush();

  const handleBrushSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setShapeSize(Number(e.target.value));
  }, [setShapeSize]);

  const {
    state: { cameraOrientation, rotationMode, gridSize }, // Removed community from here
    meta: { eventBus, gridRef },
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
      case 'q': // Farther
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
      const margin = 10; // 10px margin from edges

      // Calculate initial position to be bottom-right with a margin
      const initialX = window.innerWidth - panelRect.width - margin;
      const initialY = window.innerHeight - panelRect.height - margin;

      setPosition({ x: initialX, y: initialY });
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
    // Prevent dragging if the event originated from the size slider
    if ((e.target as HTMLElement).type === 'range') {
      return;
    }

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

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (panelRef.current) {
      e.preventDefault(); // Prevent scrolling or zooming
      const panelElement = panelRef.current;
      const panelRect = panelElement.getBoundingClientRect();
      dragOffset.current = {
        x: e.touches[0].clientX - panelRect.left,
        y: e.touches[0].clientY - panelRect.top,
      };
      setIsDragging(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling during drag

    const panelElement = panelRef.current;
    if (!panelElement) return;

    const panelRect = panelElement.getBoundingClientRect();

    const newPanelLeft_viewport = e.touches[0].clientX - dragOffset.current.x;
    const newPanelTop_viewport = e.touches[0].clientY - dragOffset.current.y;

    const minX = 10;
    const minY = 10;
    const maxX = window.innerWidth - panelRect.width - 10;
    const maxY = window.innerHeight - panelRect.height - 10;

    const clampedX = Math.max(minX, Math.min(newPanelLeft_viewport, maxX));
    const clampedY = Math.max(minY, Math.min(newPanelTop_viewport, maxY));

    setPosition({
      x: clampedX,
      y: clampedY,
    });
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove, { passive: false }); // Specify passive: false here too
      window.removeEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove, { passive: false }); // Specify passive: false here too
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    const handleCellClick = (payload: { x: number; y: number; z: number }) => {
      const { x, y, z } = payload;

      // Only respond to clicks in edit mode
      if (rotationMode) {
        return;
      }

      const grid = gridRef.current;
      if (!grid) {
        console.warn("Grid not available for cell click.");
        return;
      }

      // Check if the clicked cell is alive
      if (grid.cells[z][y][x]) {
        const communityMap = grid.getAllCommunities();
        const clickedCellKey = `${x},${y},${z}`;
        const clickedCommunityId = communityMap.get(clickedCellKey);

        if (clickedCommunityId !== undefined) {
          const selectedCommunityCells: Array<[number, number, number]> = [];
          for (const [key, id] of communityMap.entries()) {
            if (id === clickedCommunityId) {
              const parts = key.split(',').map(Number);
              selectedCommunityCells.push([parts[0], parts[1], parts[2]]);
            }
          }

          setCustomBrush(selectedCommunityCells);
          setSelectedShape("Selected Community"); // Keep this for internal state, but it won't be in dropdown
          setPaintMode(1); // Set to Activate mode
          eventBus.emit('showCommunityPanel', true); // Emit event to show the new panel
        }
      }
    };

    const unsubscribe = eventBus.on('cellClick', handleCellClick);
    const unsubscribeShowCommunityPanel = eventBus.on('showCommunityPanel', (show) => {
      // This listener is just to prevent errors if the event is emitted before AppHeaderPanel is ready
      // The actual state management for showing the panel will be in AppHeaderPanel
    });

    return () => {
      unsubscribe();
      unsubscribeShowCommunityPanel();
    };
  }, [rotationMode, gridRef, eventBus, setCustomBrush, setSelectedShape, setPaintMode]);

  return (
    <div
      id="brush-controls"
      ref={panelRef}
      style={{
        position: 'fixed', // Changed from absolute
        top: position.y,
        left: position.x,
        width: 'fit-content',
        minWidth: '220px',
        backgroundColor: 'rgba(13, 17, 23, 0.8)', // Using a specific color with transparency
        padding: '5px', // Reduced padding to make space for the header
        boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column', // Changed to column to stack header and controls
        cursor: isDragging ? 'grabbing' : 'grab', // Add grab cursor
        touchAction: 'none', // Prevent default touch actions like scrolling
        border: '2px solid #FFA50080', // Subtler orange outline (50% opacity)
        borderRadius: '8px', // Small corner radius
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      aria-label="Brush Controls Panel" // Added for accessibility in tests
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '5px' }}>
        <span id='Selected-Brush-Label'
          style={{
            fontWeight: 'bold',
            color: '#FFA500', // Subtler orange color for text
            cursor: 'inherit', // Inherit cursor from parent for dragging
          }}
        >
          Brush: {selectedShape}
        </span>
        <span id="brush-effect-label"
          style={{
            marginRight: '17px',
            fontWeight: 'bold',
            color: '#FFA500', // Subtler orange color for text
            cursor: 'inherit', // Inherit cursor from parent for dragging
          }}
        >
          {paintMode === 1 ? 'Activate' : paintMode === -1 ? 'Deactivate' : '(No Effect)'}
        </span>
      </div>


      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)', // Reduced to 6 columns
          gridTemplateRows: 'repeat(4, auto)', // Adjusted rows for compactness
          gap: '5px',
          alignItems: 'center',
        }}
        aria-label="Brush Controls Grid" // Added for accessibility in tests
      >
        <div style={{ gridColumn: '1 / 2', gridRow: '1 / 2' }}>
          <BrushSelectorDropdown />
        </div>
        {(() => {
          // "Selected Community" is no longer in the dropdown, but can still be the selectedShape
          const showSizeControls = selectedShape !== "Selected Community" &&
            selectedShape !== "Single Cell" &&
            selectedShape !== "None";
          const showHollowCheckbox = showSizeControls && shapeSize > 2; // New condition for hollow checkbox visibility
          return (
            <>
              {/* Size and Hollow controls: Always in DOM to preserve space, but hidden when not applicable */}
              <div
                className="brush-size-control"
                style={{
                  gridColumn: '2/5',
                  gridRow: '1 / 2',
                  width: 'unset',
                  visibility: showSizeControls ? 'visible' : 'hidden',
                  pointerEvents: showSizeControls ? 'auto' : 'none',
                }}
              >
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
              <label
                className="control-label row"
                style={{
                  gridColumn: '1  / 1',
                  gridRow: '2 / 2',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  color: '#8b949e',
                  visibility: showHollowCheckbox ? 'visible' : 'hidden', // Use new condition
                  pointerEvents: showHollowCheckbox ? 'auto' : 'none',   // Use new condition
                }}
              >
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
          );
        })()}

        {/* Activate and Clear buttons moved outside conditional rendering */}
        <button
          className={`glass-button   alive-button success ${paintMode === 1 ? 'active' : ''}`}
          onClick={() => setPaintMode(prev => (prev === 1 ? 0 : 1))}
          data-tooltip-bottom="Activate (Paint) (Space)"
          style={{ gridColumn: '5 / 5', gridRow: '1 / 2' }}
        >
          <PlusIcon />
        </button>
        <button
          className={`glass-button edit-action-button clear-button danger ${paintMode === -1 ? 'active' : ''}`}
          onClick={() => setPaintMode(prev => (prev === -1 ? 0 : -1))}
          data-tooltip-bottom="Clear (Delete)"
          style={{ gridColumn: '6 / 6', gridRow: '1 / 2' }}
        >
          <MinusIcon />
        </button>

        {/* Directional controls */}
        <div style={{ gridColumn: '3 / 4', gridRow: '2 / 3', display: 'flex', justifyContent: 'center' }}>
          <button
            id="upBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('w'); setActiveKey('w'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '50px', height: '30px' }}
          ><ArrowUpIcon /></button>
        </div>

        <div style={{ gridColumn: '3/ 4', gridRow: '4 / 5', display: 'flex', justifyContent: 'center' }}>
          <button
            id="downBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('x'); setActiveKey('x'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '50px', height: '30px' }}
          ><ArrowDownIcon /></button>
        </div>

        <div style={{ gridColumn: '2 / 3', gridRow: '3 / 4', display: 'flex', justifyContent: 'center' }}>
          <button
            id="leftBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('a'); setActiveKey('a'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '50px', height: '30px' }}
          ><ArrowLeftIcon /></button>
        </div>

        <div style={{ gridColumn: '4 / 5', gridRow: '3 / 4', display: 'flex', justifyContent: 'center' }}>
          <button
            id="rightBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('d'); setActiveKey('d'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '50px', height: '30px' }}
          ><ArrowRightIcon /></button>
        </div>

        <div style={{ gridColumn: '5 / 7  ', gridRow: '3 / 3', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button
            id="fartherBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('q'); setActiveKey('q'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8pt' }}
          ><AwayIcon />&nbsp;&nbsp;Farther</button>
        </div>

        <div style={{ gridColumn: '5 / 7', gridRow: '4/ 4', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <button
            id="closerBtn"
            className="glass-button"
            onMouseDown={(e) => { e.stopPropagation(); handleMove('z'); setActiveKey('z'); }}
            onMouseUp={() => setActiveKey(null)}
            onMouseLeave={() => setActiveKey(null)}
            style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
          ><CloserIcon />&nbsp;&nbsp;Closer </button>
        </div>
      </div>
    </>
  );
}
