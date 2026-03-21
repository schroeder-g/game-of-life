import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ShapeType, supportsHollow } from "../core/shapes";

export interface BrushState {
  selectedShape: ShapeType;
  shapeSize: number;
  isHollow: boolean;
  selectorPos: [number, number, number] | null;
  brushRotationVersion: number;
  brushQuaternion: React.MutableRefObject<THREE.Quaternion>;
}

export interface BrushActions {
  setSelectedShape: (shape: ShapeType) => void;
  setShapeSize: (size: number) => void;
  setIsHollow: (hollow: boolean) => void;
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
}

export interface BrushContextValue {
  state: BrushState;
  actions: BrushActions;
}

const BrushContext = createContext<BrushContextValue | null>(null);

export function BrushProvider({ children }: { children: ReactNode }) {
  const [selectedShape, setSelectedShape] = useState<ShapeType>("None");
  const [shapeSize, setShapeSize] = useState<number>(6); // Midpoint of 1-12 range
  const [isHollow, setIsHollow] = useState<boolean>(false);
  const [selectorPos, setSelectorPos] = useState<
    [number, number, number] | null
  >(null);
  const [brushRotationVersion, setBrushRotationVersion] = useState<number>(0);
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
      selectorPos,
      brushRotationVersion,
      brushQuaternion,
    },
    actions: {
      setSelectedShape,
      setShapeSize,
      setIsHollow,
      setSelectorPos,
      clearShape: () => setSelectedShape("None"),
      changeSize: (delta: number, maxGridSize: number) => {
        setShapeSize((prev) => Math.max(1, Math.min(maxGridSize, prev + delta)));
      },
      incrementBrushRotationVersion: () => setBrushRotationVersion((v) => v + 1),
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
