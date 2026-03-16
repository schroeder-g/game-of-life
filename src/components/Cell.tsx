import { useFrame } from "@react-three/fiber";
import chroma from "chroma-js";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Grid3D } from "../core/Grid3D";

// Custom shader material for per-instance color and opacity
const cellShaderMaterial = {
  vertexShader: `
    attribute float instanceOpacity;
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      vColor = instanceColor;
      vOpacity = instanceOpacity;
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vOpacity;

    void main() {
      gl_FragColor = vec4(vColor, vOpacity);
    }
  `,
};

export function Cells({ 
  grid, 
  margin,
  onClick
}: { 
  grid: Grid3D; 
  margin: number;
  onClick?: (e: any) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.InstancedMesh>(null);
  const lastVersion = useRef(-1);

  // Setup colors and matrices
  const { colorScale, offset, center, gridSize } = useMemo(() => {
    return {
      colorScale: chroma
        .scale(["blue", "cyan", "green", "yellow", "red"])
        .domain([0, grid.size]),
      offset: (grid.size - 1) / 2,
      center: (grid.size - 1) / 2,
      gridSize: grid.size,
    };
  }, [grid]);

  // Use useFrame to natively poll the Grid3D instance without triggering React re-renders
  useFrame(() => {
    if (!meshRef.current || !edgesRef.current) return;

    // Only update buffers if the version changed
    if (grid.version === lastVersion.current) return;
    lastVersion.current = grid.version;

    const cells = grid.getLivingCells();
    const tempObject = new THREE.Object3D();
    const colors = new Float32Array(cells.length * 3);
    const opacities = new Float32Array(cells.length);
    const edgeColors = new Float32Array(cells.length * 3);

    cells.forEach((cell, i) => {
      const [x, y, z] = cell;

      // Position
      tempObject.position.set(x - offset, y - offset, z - offset);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      edgesRef.current!.setMatrixAt(i, tempObject.matrix);

      // Hue based on X position (blue to red)
      // Saturation based on Z position
      const hue = (x / gridSize) * 300; // 240 (blue) to 0 (red)
      const saturation = 0.4 + (z / gridSize) * 0.6; // 0.4 to 1.0
      const color = chroma.hsl(240 - hue, saturation, 0.55);
      const [r, g, b] = color.gl();

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Edge colors slightly brighter
      const edgeColor = color.brighten(0.5);
      const [er, eg, eb] = edgeColor.gl();
      edgeColors[i * 3] = er;
      edgeColors[i * 3 + 1] = eg;
      edgeColors[i * 3 + 2] = eb;

      // Opacity based on distance from center (closer = more opaque)
      const dx = x - center;
      const dy = y - center;
      const dz = z - center;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const maxDist = Math.sqrt(3) * center;
      opacities[i] = 0.1 + 0.9 * (1 - distFromCenter / maxDist);
    });

    // Set instance colors
    if (!meshRef.current.instanceColor) {
      meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(50000 * 3), 3);
    }
    (meshRef.current.instanceColor as THREE.InstancedBufferAttribute).set(colors);
    meshRef.current.instanceColor.needsUpdate = true;

    if (!meshRef.current.geometry.attributes.instanceOpacity) {
      meshRef.current.geometry.setAttribute(
        "instanceOpacity",
        new THREE.InstancedBufferAttribute(new Float32Array(50000), 1),
      );
    }
    (meshRef.current.geometry.attributes.instanceOpacity as THREE.InstancedBufferAttribute).set(opacities);
    meshRef.current.geometry.attributes.instanceOpacity.needsUpdate = true;

    if (!edgesRef.current.instanceColor) {
      edgesRef.current.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(50000 * 3), 3);
    }
    (edgesRef.current.instanceColor as THREE.InstancedBufferAttribute).set(edgeColors);
    edgesRef.current.instanceColor.needsUpdate = true;

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.count = cells.length;
    edgesRef.current.instanceMatrix.needsUpdate = true;
    edgesRef.current.count = cells.length;

    // IMPORTANT: Three.js needs updated bounding info for raycasting to work correctly on the whole mesh volume
    meshRef.current.computeBoundingSphere();
    edgesRef.current.computeBoundingSphere();
  });


  const cellSize = 1 - margin;
  const edgeSize = cellSize + 0.05;

  return (
    <group key={`cells-${margin}`}>
      <instancedMesh 
        ref={meshRef} 
        args={[undefined, undefined, 50000]}
        onClick={onClick}
      >
        <boxGeometry args={[cellSize, cellSize, cellSize]} />
        <shaderMaterial
          vertexShader={cellShaderMaterial.vertexShader}
          fragmentShader={cellShaderMaterial.fragmentShader}
          transparent
          vertexColors
        />
      </instancedMesh>
      <instancedMesh ref={edgesRef} args={[undefined, undefined, 50000]}>
        <boxGeometry args={[edgeSize, edgeSize, edgeSize]} />
        <meshBasicMaterial wireframe vertexColors />
      </instancedMesh>
    </group>
  );
}
