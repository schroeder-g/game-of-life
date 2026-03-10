import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Rotating community 3D preview
function CommunityPreview({
  community,
}: {
  community: Array<[number, number, number]>;
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
      {cells.map((cell, i) => (
        <mesh key={i} position={[cell[0], cell[1], cell[2]]}>
          <boxGeometry args={[0.85, 0.85, 0.85]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
      {cells.map((cell, i) => (
        <lineSegments key={`edge-${i}`} position={[cell[0], cell[1], cell[2]]}>
          <edgesGeometry args={[new THREE.BoxGeometry(0.9, 0.9, 0.9)]} />
          <lineBasicMaterial color="#00ffaa" />
        </lineSegments>
      ))}
    </group>
  );
}

// Community sidebar visualization
export function CommunitySidebar({
  community,
}: {
  community: Array<[number, number, number]>;
}) {
  if (community.length === 0) {
    return (
      <div className="community-sidebar">
        <h3>Community</h3>
        <p className="no-community">Hover over a cell in Edit mode</p>
      </div>
    );
  }

  // Calculate bounding box
  const minX = Math.min(...community.map((c) => c[0]));
  const maxX = Math.max(...community.map((c) => c[0]));
  const minY = Math.min(...community.map((c) => c[1]));
  const maxY = Math.max(...community.map((c) => c[1]));
  const minZ = Math.min(...community.map((c) => c[2]));
  const maxZ = Math.max(...community.map((c) => c[2]));

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const depth = maxZ - minZ + 1;

  return (
    <div className="community-sidebar">
      <h3>Community</h3>
      <div className="community-stats">
        <span>Cells: {community.length}</span>
        <span>
          Size: {width}×{height}×{depth}
        </span>
      </div>
      <div className="community-3d">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <CommunityPreview community={community} />
        </Canvas>
      </div>
    </div>
  );
}
