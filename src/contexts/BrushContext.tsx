import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ShapeType, supportsHollow } from "../core/shapes";

export interface BrushState {
  selectedShape: ShapeType;
  shapeSize: number;
  isHollow: boolean;
  showProjectionGuides: boolean;
  selectorPos: [number, number, number] | null;
  brushRotationVersion: number;
  brushQuaternion: React.MutableRefObject<THREE.Quaternion>;
  customOffsets: [number, number, number][];
  paintMode: 1 | 0 | -1; // 1: Toggle, 0: Idle, -1: Clear
}

export interface BrushActions {
  setSelectedShape: (shape: ShapeType) => void;
  setShapeSize: (size: number) => void;
  setIsHollow: (hollow: boolean) => void;
  setShowProjectionGuides: (show: boolean) => void;
  setSelectorPos: (
    pos:
      | [number, number, number]
      | null
      | ((
          prev: [number, number, number] | null,
        ) => [number, number, number] | null),
  ) => void;
  clearShape: () => void;
  changeSize: (delta: number, maxGridSize: number) => void;
  incrementBrushRotationVersion: () => void;
  setCustomBrush: (cells: [number, number, number][]) => void;
  setPaintMode: (mode: 1 | 0 | -1 | ((prev: 1 | 0 | -1) => 1 | 0 | -1)) => void;
}

export interface BrushContextValue {
  state: BrushState;
  actions: BrushActions;
}

const BrushContext = createContext<BrushContextValue | null>(null);

export function BrushProvider({ children }: { children: ReactNode }) {
  const [selectedShape, setSelectedShape] = useState<ShapeType>("Cube");
  const [shapeSize, setShapeSize] = useState<number>(1);
  const [isHollow, setIsHollow] = useState<boolean>(false);
  const [showProjectionGuides, setShowProjectionGuides] = useState<boolean>(true);
  const [selectorPos, setSelectorPos] = useState<
    [number, number, number] | null
  >(null);
  const [brushRotationVersion, setBrushRotationVersion] = useState<number>(0);
  const [customOffsets, setCustomOffsets] = useState<[number, number, number][]>([]);
  const [paintMode, setPaintMode] = useState<1 | 0 | -1>(0); // 1: Toggle, 0: Idle, -1: Clear
  const brushQuaternion = useRef(new THREE.Quaternion());

  // clear hollow when switching to an unsupported shape
  useEffect(() => {
    if (!supportsHollow(selectedShape) && isHollow) {
      setIsHollow(false);
    }
  }, [selectedShape, isHollow]);

  const value: BrushContextValue = {
    state: {
      selectedShape,
      shapeSize,
      isHollow,
      showProjectionGuides,
      selectorPos,
      brushRotationVersion,
      brushQuaternion,
      customOffsets,
      paintMode,
    },
    actions: {
      setSelectedShape,
      setShapeSize,
      setIsHollow,
      setShowProjectionGuides,
      setSelectorPos,
      clearShape: () => {
        setSelectedShape("Cube");
        setShapeSize(1);
      },
      changeSize: (delta: number, maxGridSize: number) => {
        setShapeSize((prev) => Math.max(1, Math.min(maxGridSize, prev + delta)));
      },
      incrementBrushRotationVersion: () => setBrushRotationVersion((v) => v + 1),
      setCustomBrush: (cells: Array<[number, number, number]>) => {
        if (cells.length === 0) return;

        // Always anchor to the community's own centroid for exact overlap.
        // This ensures the brush perfectly overlaps the cells regardless of where selectorPos is.
        const minX = Math.min(...cells.map((c) => c[0]));
        const maxX = Math.max(...cells.map((c) => c[0]));
        const minY = Math.min(...cells.map((c) => c[1]));
        const maxY = Math.max(...cells.map((c) => c[1]));
        const minZ = Math.min(...cells.map((c) => c[2]));
        const maxZ = Math.max(...cells.map((c) => c[2]));
        const anchorX = Math.round((minX + maxX) / 2);
        const anchorY = Math.round((minY + maxY) / 2);
        const anchorZ = Math.round((minZ + maxZ) / 2);

        // Compute offsets relative to the centroid
        const offsets = cells.map(([x, y, z]) => [x - anchorX, y - anchorY, z - anchorZ] as [number, number, number]);

        // Move cursor to the centroid so brush renders exactly over the community
        setSelectorPos([anchorX, anchorY, anchorZ]);

        // Reset rotation so no previous brush rotation is applied
        brushQuaternion.current.identity();

        setCustomOffsets(offsets);
        setSelectedShape("Selected Community");
      },
      setPaintMode,
    },
  };

  useEffect(() => {
    (window as any).brushActions = value.actions;
  }, [value.actions]);

  return (
    <BrushContext.Provider value={value}>{children}</BrushContext.Provider>
  );
}

export function useBrush() {
  const context = useContext(BrushContext);
  if (!context) {
    throw new Error("useBrush must be used within a BrushProvider");
  }
  return context;
}
