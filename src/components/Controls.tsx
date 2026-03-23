import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import chroma from "chroma-js";

import { useBrush } from "../contexts/BrushContext";
import { useSimulation } from "../contexts/SimulationContext";

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

// Community sidebar visualization
export function CommunitySidebar({
  community,
}: {
  community: Array<[number, number, number]>;
}) {
  const { state: { gridSize }, actions: { setCommunity } } = useSimulation();
  const { actions: { setCustomBrush } } = useBrush();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`community-sidebar glass-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <header
        className="sidebar-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? 0 : '12px' }}
      >
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
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
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
              </svg>
            </button>
            <button
              className="icon-button danger"
              title="Deselect"
              onClick={(e) => {
                e.stopPropagation();
                setCommunity([]);
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
                <span>Cells: {community.length}</span>
              </div>
              <div className="community-3d-wrapper">
                <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} />
                  <CommunityPreview community={community} gridSize={gridSize} />
                </Canvas>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
