import chroma from "chroma-js";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

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
  cells,
  gridSize,
  margin,
}: {
  cells: Array<[number, number, number]>;
  gridSize: number;
  margin: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const edgesRef = useRef<THREE.InstancedMesh>(null);

  // Setup colors and matrices
  const { colorScale, offset, center } = useMemo(() => {
    return {
      colorScale: chroma
        .scale(["blue", "cyan", "green", "yellow", "red"])
        .domain([0, gridSize]),
      offset: gridSize / 2,
      center: gridSize / 2,
    };
  }, [gridSize]);

  useEffect(() => {
    if (!meshRef.current || !edgesRef.current) return;

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
    meshRef.current.instanceColor = new THREE.InstancedBufferAttribute(
      colors,
      3,
    );
    meshRef.current.geometry.setAttribute(
      "instanceOpacity",
      new THREE.InstancedBufferAttribute(opacities, 1),
    );

    edgesRef.current.instanceColor = new THREE.InstancedBufferAttribute(
      edgeColors,
      3,
    );

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.count = cells.length;
    edgesRef.current.instanceMatrix.needsUpdate = true;
    edgesRef.current.count = cells.length;
  }, [cells, offset, center, gridSize]);

  const cellSize = 1 - margin;
  const edgeSize = cellSize + 0.05;

  return (
    <group key={`cells-${margin}`}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, 50000]}>
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
