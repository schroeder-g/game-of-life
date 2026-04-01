import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import chroma from "chroma-js";
import { useSimulation } from "../contexts/SimulationContext";
import { useBrush } from "../contexts/BrushContext";
import { ClaimHint } from "./ClaimHint";

// Rotating community 3D preview
function CommunityPreview({
  community,
  gridSize,
}: {
  community: Array<[number, number, number]>;
  gridSize: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate center offset to center the community
  const { cells, maxDim } = useMemo(() => {
    if (community.length === 0) return { cells: [], maxDim: 1 };

    const minX = Math.min(...community.map((c) => c[0]));
    const maxX = Math.max(...community.map((c) => c[0]));
    const minY = Math.min(...community.map((c) => c[1]));
    const maxY = Math.max(...community.map((c) => c[1]));
    const minZ = Math.min(...community.map((c) => c[2]));
    const maxZ = Math.max(...community.map((c) => c[2]));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    const maxDim = Math.max(maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1);

    return {
      cells: community.map(
        ([x, y, z]) =>
          [x - centerX, y - centerY, z - centerZ] as [number, number, number],
      ),
      maxDim,
    };
  }, [community]);

  // Auto-rotate
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
    }
  });

  const scale = 4 / Math.max(maxDim, 1);

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {cells.map((cell, i) => {
        const [x, y, z] = community[i];
        const hue = (x / gridSize) * 300;
        const saturation = 0.4 + ((gridSize - 1 - z) / gridSize) * 0.6;
        const color = chroma.hsl(240 - hue, saturation, 0.55).hex();

        return (
          <mesh key={i} position={[cell[0], cell[1], cell[2]]}>
            <boxGeometry args={[0.85, 0.85, 0.85]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}
      {cells.map((cell, i) => {
        const [x, y, z] = community[i];
        const hue = (x / gridSize) * 300;
        const saturation = 0.4 + ((gridSize - 1 - z) / gridSize) * 0.6;
        const color = chroma.hsl(240 - hue, saturation, 0.55).darken(0.5).hex();

        return (
          <lineSegments key={`edge-${i}`} position={[cell[0], cell[1], cell[2]]}>
            <edgesGeometry args={[new THREE.BoxGeometry(0.9, 0.9, 0.9)]} />
            <lineBasicMaterial color={color} />
          </lineSegments>
        );
      })}
    </group>
  );
}

interface SelectedCommunityPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export function SelectedCommunityPanel({ isVisible, onClose }: SelectedCommunityPanelProps) {
  const { state: { gridSize, community, viewMode }, actions: { setCommunity } } = useSimulation();
  const { actions: { setCustomBrush, setSelectedShape, setPaintMode } } = useBrush();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [position, setPosition] = useState({ x: 10, y: 10 }); // Initial position
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Effect to set initial position to top-right relative to its offset parent
  useEffect(() => {
    if (panelRef.current) {
      const panelRect = panelRef.current.getBoundingClientRect();
      const margin = 10; // 10px margin from edges

      // Calculate initial position to be top-right with a margin
      const initialX = window.innerWidth - panelRect.width - margin;
      const initialY = margin; // Top margin

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
    if (panelRef.current) {
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

    const newPanelLeft_viewport = e.clientX - dragOffset.current.x;
    const newPanelTop_viewport = e.clientY - dragOffset.current.y;

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
      window.addEventListener('touchmove', handleTouchMove as unknown as EventListener, { passive: false });
      window.addEventListener('touchend', handleTouchEnd as unknown as EventListener);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove as unknown as EventListener);
      window.removeEventListener('touchend', handleTouchEnd as unknown as EventListener);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove as unknown as EventListener);
      window.removeEventListener('touchend', handleTouchEnd as unknown as EventListener);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  if (!isVisible) return null;

  return (
    <div
      id="community-sidebar"
      ref={panelRef}
      className={`community-sidebar glass-panel ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: isCollapsed ? 'fit-content' : '25vw', // Set width based on collapsed state
        minWidth: isCollapsed ? 'unset' : '220px', // Consistent min-width with BrushControls
        maxWidth: isCollapsed ? 'unset' : '400px', // Optional: Add a max-width to prevent it from getting too wide
        touchAction: 'none',
        zIndex: 1000,
      }}
    >
      <header
        className="sidebar-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isCollapsed ? 0 : '12px',
          cursor: isDragging ? 'grabbing' : 'grab', // Apply cursor to header
        }}
        onMouseDown={handleMouseDown} // Dragging from header
        onTouchStart={handleTouchStart} // Dragging from header
      >
        <div
          onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }} // Stop propagation for collapse click
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}
        >
          <span style={{ fontSize: "12px", opacity: 0.6, width: '12px' }}>{isCollapsed ? "▼" : "▲"}</span>
          <h3 style={{ margin: 0 }}>Community Selection</h3>
        </div>

        {community.length > 0 && (
          <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
            <button
              className="icon-button"
              title="Activate Brush"
              onClick={(e) => {
                e.stopPropagation();
                setCustomBrush(community);
                setSelectedShape("Selected Community"); // Set the shape when activating
                setPaintMode(1); // Set to Activate mode
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
              </svg>
              {/* Claim hint removed from here as per request */}
            </button>
            <button
              className="icon-button danger"
              title="Deselect"
              onClick={(e) => {
                e.stopPropagation();
                setCommunity([]);
                onClose(); // Close the panel when deselected
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {!isCollapsed && (
        <>
          {community.length === 0 ? (
            <p className="no-community">
              Click on a living cell in Edit mode to view its community
            </p>
          ) : (
            <>
              <div className="community-stats">
                <span>Cells: {community.length} <ClaimHint claimId="COMMUNITY_STATS_CLAIM" /></span>
              </div>
              <div className="community-3d-wrapper">
                <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} />
                  <CommunityPreview community={community} gridSize={gridSize} />
                </Canvas>
                <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                  <ClaimHint claimId="COMMUNITY_PREVIEW_3D_CLAIM" />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
