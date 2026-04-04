import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import chroma from 'chroma-js';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Grid3D } from '../core/Grid3D';
import { useSimulation } from '../contexts/SimulationContext';
import { ClaimHint } from './ClaimHint';
import { Organism, makeKey } from '../core/Organism'; // Updated import for makeKey

// Custom shader material for per-instance color and opacity
const cellShaderMaterial = {
	vertexShader: `
    attribute float instanceOpacity;
    attribute float instanceHighlight;
    varying vec3 vColor;
    varying float vOpacity;
    varying float vHighlight;

    void main() {
      vColor = instanceColor;
      vOpacity = instanceHighlight;
      vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
	fragmentShader: `
    uniform float u_time;
    varying vec3 vColor;
    varying float vOpacity;
    varying float vHighlight;

    void main() {
      vec3 finalColor = vColor;
      if (vHighlight > 0.5) {
        // Pulse effect: smoothly cycle brightness
        float pulse = (sin(u_time * 6.0) + 1.0) * 0.5; // oscillates between 0 and 1
        finalColor = vColor + vec3(0.4, 0.4, 0.4) * pulse; // Add brightness
      }
      gl_FragColor = vec4(finalColor, vOpacity);
    }
  `,
};

export function Cells({
	grid,
	margin,
	onClick,
	selectorPos,
	viewMode,
	organisms, // ADD THIS PROP
	organismsVersion, // ADD THIS PROP
}: {
	grid: Grid3D;
	margin: number;
	onClick?: (e: any) => void;
	selectorPos: [number, number, number] | null;
	viewMode?: boolean;
	organisms: Map<string, Organism>; // ADD THIS PROP
	organismsVersion: number; // ADD THIS PROP
}) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const materialRef = useRef<THREE.ShaderMaterial>(null);
	const edgesRef = useRef<THREE.InstancedMesh>(null);
	const ghostMeshRef = useRef<THREE.InstancedMesh>(null);
	const lastVersion = useRef(-1);
	const lastSelectorPos = useRef<string | null>(null);
	const lastviewMode = useRef<boolean | null>(null);
	const lastOrganismsVersion = useRef(-1); // ADD THIS REF

	// Setup colors and matrices
	const { colorScale, offset, center, gridSize } = useMemo(() => {
		return {
			colorScale: chroma
				.scale(['blue', 'cyan', 'green', 'yellow', 'red'])
				.domain([0, grid.size]),
			offset: (grid.size - 1) / 2,
			center: (grid.size - 1) / 2,
			gridSize: grid.size,
		};
	}, [grid]);

	const {
		state: { speed, isAnimatingInit },
	} = useSimulation();

	// Create a set of all cell keys belonging to any organism
	const organismCellKeys = useMemo(() => {
		const keys = new Set<string>();
		organisms.forEach(org => {
			org.livingCells.forEach(key => keys.add(key));
		});
		return keys;
	}, [organisms, organismsVersion]);

	// Use useFrame to natively poll the Grid3D instance without triggering React re-renders
	useFrame((state, delta) => {
		if (materialRef.current) {
			materialRef.current.uniforms.u_time.value =
				state.clock.getElapsedTime();
		}
		if (!meshRef.current || !edgesRef.current) return;

		const selectorPosStr = JSON.stringify(selectorPos);

		// Detect changes
		const gridChanged = grid.version !== lastVersion.current;
		const selectorChanged = selectorPosStr !== lastSelectorPos.current;
		const modeChanged = viewMode !== lastviewMode.current;
		const organismsChanged = organismsVersion !== lastOrganismsVersion.current; // ADD THIS LINE

		if (!gridChanged && !selectorChanged && !modeChanged && !organismsChanged) { // UPDATE THIS LINE
			return;
		}

		lastVersion.current = grid.version;
		lastSelectorPos.current = selectorPosStr;
		lastviewMode.current = viewMode;
		lastOrganismsVersion.current = organismsVersion; // ADD THIS LINE

		const livingCells = grid.getLivingCells();
		const tempObject = new THREE.Object3D();

		const cellsToRender: Array<[number, number, number]> = []; // NEW ARRAY
		const cellsToRenderKeys: string[] = []; // NEW ARRAY for keys

		// Filter out cells that belong to an organism
		livingCells.forEach(pos => {
			const key = makeKey(pos[0], pos[1], pos[2]);
			if (!organismCellKeys.has(key)) {
				cellsToRender.push(pos);
				cellsToRenderKeys.push(key);
			}
		});

		const count = cellsToRender.length; // Use filtered count
		const colors = new Float32Array(count * 3);
		const opacities = new Float32Array(count);
		const edgeColors = new Float32Array(count * 3);
		const highlights = new Float32Array(count);

		cellsToRender.forEach((pos, i) => { // Iterate over filtered cells
			const [x, y, z] = pos;
			const key = cellsToRenderKeys[i]; // Get key for current cell

			// Position & Scale
			tempObject.position.set(
				x - offset,
				y - offset,
				gridSize - 1 - z - offset,
			);
			tempObject.scale.set(1.0, 1.0, 1.0);
			tempObject.updateMatrix();
			meshRef.current!.setMatrixAt(i, tempObject.matrix);
			edgesRef.current!.setMatrixAt(i, tempObject.matrix);

			// Hue based on X position (blue to red)
			const hue = (x / gridSize) * 300;
			const saturation = 0.4 + ((gridSize - 1 - z) / gridSize) * 0.6;
			let color = chroma.hsl(240 - hue, saturation, 0.55);

			const onAxis =
				!viewMode &&
				selectorPos &&
				(x === selectorPos[0] ||
					y === selectorPos[1] ||
					z === selectorPos[2]);
			const isSelected =
				!viewMode &&
				selectorPos &&
				x === selectorPos[0] &&
				y === selectorPos[1] &&
				z === selectorPos[2];

			if (isSelected) {
				color = chroma('white');
			} else if (onAxis) {
				color = color.brighten(0.75);
			}

			const [r, g, b] = color.gl();
			colors[i * 3] = r;
			colors[i * 3 + 1] = g;
			colors[i * 3 + 2] = b;

			// Edges & Highlights
			const sharesTwoCoords =
				!viewMode &&
				selectorPos &&
				((x === selectorPos[0] && y === selectorPos[1]) ||
					(x === selectorPos[0] && z === selectorPos[2]) ||
					(y === selectorPos[1] && z === selectorPos[2]));

			highlights[i] = sharesTwoCoords ? 1.0 : 0.0;

			if (sharesTwoCoords) {
				edgeColors[i * 3] = 1;
				edgeColors[i * 3 + 1] = 1;
				edgeColors[i * 3 + 2] = 1;
			} else {
				let edgeColor = color.darken(0.8);
				if (edgeColor.luminance() > 0.2) {
					edgeColor = edgeColor.darken(0.5);
				}
				const [er, eg, eb] = edgeColor.gl();
				edgeColors[i * 3] = er;
				edgeColors[i * 3 + 1] = eg;
				edgeColors[i * 3 + 2] = eb;
			}

			// Opacity
			if (isSelected) {
				opacities[i] = 1.0;
			} else {
				const dx = x - center,
					dy = y - center,
					dz = z - center;
				const distFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);
				const maxDist = Math.sqrt(3) * center;
				// Sharper, denser core: stays opaque for a larger radius
				const normalizedDist = distFromCenter / maxDist;
				opacities[i] =
					0.2 + 0.8 * Math.pow(Math.max(0, 1.0 - normalizedDist), 0.3);
			}
		});

		meshRef.current.count = count;
		edgesRef.current.count = count;

		// Update attributes
		if (!meshRef.current.instanceColor) {
			meshRef.current.instanceColor =
				new THREE.InstancedBufferAttribute(
					new Float32Array(50000 * 3),
					3,
				);
		}
		meshRef.current.instanceColor.set(colors);
		meshRef.current.instanceColor.needsUpdate = true;

		if (!meshRef.current.geometry.attributes.instanceOpacity) {
			meshRef.current.geometry.setAttribute(
				'instanceOpacity',
				new THREE.InstancedBufferAttribute(new Float32Array(50000), 1),
			);
		}
		(
			meshRef.current.geometry.attributes
				.instanceOpacity as THREE.InstancedBufferAttribute
		).set(opacities);
		meshRef.current.geometry.attributes.instanceOpacity.needsUpdate = true;

		if (!meshRef.current.geometry.attributes.instanceHighlight) {
			meshRef.current.geometry.setAttribute(
				'instanceHighlight',
				new THREE.InstancedBufferAttribute(new Float32Array(50000), 1),
			);
		}
		(
			meshRef.current.geometry.attributes
				.instanceHighlight as THREE.InstancedBufferAttribute
		).set(highlights);
		meshRef.current.geometry.attributes.instanceHighlight.needsUpdate = true;

		if (!edgesRef.current.instanceColor) {
			edgesRef.current.instanceColor =
				new THREE.InstancedBufferAttribute(
					new Float32Array(50000 * 3),
					3,
				);
		}
		edgesRef.current.instanceColor.set(edgeColors);
		edgesRef.current.instanceColor.needsUpdate = true;

		meshRef.current.instanceMatrix.needsUpdate = true;
		edgesRef.current.instanceMatrix.needsUpdate = true;

		meshRef.current.computeBoundingSphere();
		edgesRef.current.computeBoundingSphere();

		// --- Ghost Axis Highlights (Edit Mode only) ---
		if (!viewMode && selectorPos && ghostMeshRef.current) {
			const [sx, sy, sz] = selectorPos;
			const gridSize = grid.size;
			const offset = (gridSize - 1) / 2;
			const cellSize = 1 - margin;

			const livingKeys = new Set(
				cellsToRender.map(([x, y, z]) => `${x},${y},${z}`), // Use filtered cells
			);

			let ghostCount = 0;
			// Use a simple triple-loop approach but filter for axis
			// X-axis
			for (let x = 0; x < gridSize; x++) {
				const key = `${x},${sy},${sz}`;
				if (!livingKeys.has(key) && !organismCellKeys.has(key)) { // ADD organismCellKeys check
					tempObject.position.set(
						x - offset,
						sy - offset,
						gridSize - 1 - sz - offset,
					);
					tempObject.scale.set(cellSize, cellSize, cellSize);
					tempObject.updateMatrix();
					ghostMeshRef.current.setMatrixAt(
						ghostCount++,
						tempObject.matrix,
					);
				}
			}
			// Y-axis
			for (let y = 0; y < gridSize; y++) {
				if (y === sy) continue; // already handled in X-axis pass for center
				const key = `${sx},${y},${sz}`;
				if (!livingKeys.has(key) && !organismCellKeys.has(key)) { // ADD organismCellKeys check
					tempObject.position.set(
						sx - offset,
						y - offset,
						gridSize - 1 - sz - offset,
					);
					tempObject.scale.set(cellSize, cellSize, cellSize);
					tempObject.updateMatrix();
					ghostMeshRef.current.setMatrixAt(
						ghostCount++,
						tempObject.matrix,
					);
				}
			}
			// Z-axis
			for (let z = 0; z < gridSize; z++) {
				if (z === sz) continue; // already handled
				const key = `${sx},${sy},${z}`;
				if (!livingKeys.has(key) && !organismCellKeys.has(key)) { // ADD organismCellKeys check
					tempObject.position.set(
						sx - offset,
						sy - offset,
						gridSize - 1 - z - offset,
					);
					tempObject.scale.set(cellSize, cellSize, cellSize);
					tempObject.updateMatrix();
					ghostMeshRef.current.setMatrixAt(
						ghostCount++,
						tempObject.matrix,
					);
				}
			}
			ghostMeshRef.current.count = ghostCount;
			ghostMeshRef.current.instanceMatrix.needsUpdate = true;
		} else if (ghostMeshRef.current) {
			ghostMeshRef.current.count = 0;
		}
	});

	const cellSize = 1 - margin;
	const edgeSize = cellSize + 0.01;

	return (
		<group key={`cells-${margin}`}>
			<Html position={[0, gridSize / 2 + 0.5, 0]}>
				<div style={{ display: 'flex', gap: '4px' }}>
					{/* Claim hints removed from here as per request */}
				</div>
			</Html>
			<instancedMesh
				ref={meshRef}
				args={[undefined, undefined, 50000]}
				onClick={onClick}
			>
				<boxGeometry args={[cellSize, cellSize, cellSize]} />
				<shaderMaterial
					ref={materialRef}
					uniforms={{ u_time: { value: 0 } }}
					{...cellShaderMaterial}
					transparent
					vertexColors
				/>
			</instancedMesh>
			<instancedMesh
				ref={edgesRef}
				args={[undefined, undefined, 50000]}
			>
				<boxGeometry args={[edgeSize, edgeSize, edgeSize]} />
				<meshBasicMaterial wireframe vertexColors />
			</instancedMesh>
			<instancedMesh
				ref={ghostMeshRef}
				args={[undefined, undefined, 1000]}
			>
				<boxGeometry args={[cellSize, cellSize, cellSize]} />
				<meshBasicMaterial
					color='white'
					transparent
					opacity={0.05}
					depthWrite={false}
				/>
			</instancedMesh>
		</group>
	);
}
