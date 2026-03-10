import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Grid3D } from "../core/Grid3D";
import { loadSettings, saveSettings } from "../hooks/useSettings";

const initialSettings = loadSettings();

const defaults = {
  speed: 5,
  density: 0.08,
  surviveMin: 2,
  surviveMax: 2,
  birthMin: 3,
  birthMax: 3,
  birthMargin: 0,
  cellMargin: 0.2,
  gridSize: 24,
};

const storedSettings = { ...defaults, ...initialSettings };

export interface SimulationState {
  speed: number;
  density: number;
  cellMargin: number;
  gridSize: number;
  surviveMin: number;
  surviveMax: number;
  birthMin: number;
  birthMax: number;
  birthMargin: number;
  running: boolean;
  community: Array<[number, number, number]>;
  rotationMode: boolean;
}

export interface SimulationActions {
  setSpeed: (speed: number) => void;
  setDensity: (density: number) => void;
  setCellMargin: (margin: number) => void;
  setGridSize: (size: number) => void;
  setSurviveMin: (val: number) => void;
  setSurviveMax: (val: number) => void;
  setBirthMin: (val: number) => void;
  setBirthMax: (val: number) => void;
  setBirthMargin: (val: number) => void;
  setCommunity: (community: Array<[number, number, number]>) => void;
  setRotationMode: (mode: boolean | ((prev: boolean) => boolean)) => void;

  playStop: () => void;
  step: () => void;
  randomize: () => void;
  reset: () => void;
  clear: () => void;
  tick: () => void;

  toggleCell: (x: number, y: number, z: number) => void;
  setCells: (cells: Array<[number, number, number]>) => void;
  deleteCells: (cells: Array<[number, number, number]>) => void;

  applyCells: (
    cells: Array<[number, number, number]>,
    updateGridSize?: number,
  ) => void;
}

export interface SimulationMeta {
  gridRef: React.MutableRefObject<Grid3D>;
  initialStateRef: React.MutableRefObject<Array<[number, number, number]>>;
}

export interface SimulationContextValue {
  state: SimulationState;
  actions: SimulationActions;
  meta: SimulationMeta;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [gridSize, setGridSize] = useState(storedSettings.gridSize);
  const gridRef = useRef(new Grid3D(storedSettings.gridSize));
  const initialStateRef = useRef<Array<[number, number, number]>>([]);
  const isFirstLoadRef = useRef(true);

  if (isFirstLoadRef.current) {
    isFirstLoadRef.current = false;
    if (Object.keys(initialSettings).length === 0) {
      const mid = Math.floor(storedSettings.gridSize / 2);
      for (let x = mid - 1; x <= mid; x++) {
        for (let y = mid - 1; y <= mid; y++) {
          for (let z = mid - 1; z <= mid; z++) {
            gridRef.current.set(x, y, z, true);
            initialStateRef.current.push([x, y, z]);
          }
        }
      }
    }
  }

  const [running, setRunning] = useState(false);
  const [rotationMode, setRotationMode] = useState(true);
  const [community, setCommunity] = useState<Array<[number, number, number]>>(
    [],
  );

  const [speed, setSpeed] = useState(storedSettings.speed);
  const [density, setDensity] = useState(storedSettings.density);
  const [cellMargin, setCellMargin] = useState(storedSettings.cellMargin);
  const [surviveMin, setSurviveMin] = useState(storedSettings.surviveMin);
  const [surviveMax, setSurviveMax] = useState(storedSettings.surviveMax);
  const [birthMin, setBirthMin] = useState(storedSettings.birthMin);
  const [birthMax, setBirthMax] = useState(storedSettings.birthMax);
  const [birthMargin, setBirthMargin] = useState(storedSettings.birthMargin);

  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    const settings = {
      speed,
      density,
      cellMargin,
      gridSize,
      surviveMin,
      surviveMax,
      birthMin,
      birthMax,
      birthMargin,
    };
    saveSettings(settings);
  }, [
    speed,
    density,
    cellMargin,
    gridSize,
    surviveMin,
    surviveMax,
    birthMin,
    birthMax,
    birthMargin,
  ]);

  const handleGridSizeChange = useCallback((newSize: number) => {
    setRunning(false);
    gridRef.current = new Grid3D(newSize);
    initialStateRef.current = [];
    setGridSize(newSize);
    setCommunity([]);
  }, []);

  const playStop = useCallback(() => {
    if (!running && gridRef.current.generation === 0) {
      initialStateRef.current = gridRef.current.saveState();
    }
    setRunning((r) => !r);
  }, [running]);

  const step = useCallback(() => {
    if (!running) {
      if (gridRef.current.generation === 0) {
        initialStateRef.current = gridRef.current.saveState();
      }
      gridRef.current.tick(
        surviveMin,
        surviveMax,
        birthMin,
        birthMax,
        birthMargin,
      );
    }
  }, [running, surviveMin, surviveMax, birthMin, birthMax, birthMargin]);

  const randomize = useCallback(() => {
    gridRef.current.randomize(density);
    initialStateRef.current = gridRef.current.saveState();
  }, [density]);

  const reset = useCallback(() => {
    setRunning(false);
    gridRef.current.restoreState(initialStateRef.current);
  }, []);

  const clear = useCallback(() => {
    setRunning(false);
    gridRef.current.clear();
    initialStateRef.current = [];
  }, []);

  const tick = useCallback(() => {
    gridRef.current.tick(
      surviveMin,
      surviveMax,
      birthMin,
      birthMax,
      birthMargin,
    );
  }, [surviveMin, surviveMax, birthMin, birthMax, birthMargin]);

  const toggleCell = useCallback((x: number, y: number, z: number) => {
    gridRef.current.toggle(x, y, z);
  }, []);

  const setCells = useCallback((cells: Array<[number, number, number]>) => {
    for (const [x, y, z] of cells) {
      gridRef.current.set(x, y, z, true);
    }
  }, []);

  const deleteCells = useCallback((cells: Array<[number, number, number]>) => {
    for (const [x, y, z] of cells) {
      gridRef.current.set(x, y, z, false);
    }
  }, []);

  const applyCells = useCallback(
    (cells: Array<[number, number, number]>, updateGridSize?: number) => {
      setRunning(false);
      if (updateGridSize !== undefined && updateGridSize !== gridSize) {
        gridRef.current = new Grid3D(updateGridSize);
        setGridSize(updateGridSize);
      } else {
        gridRef.current.clear();
      }
      gridRef.current.restoreState(cells);
      initialStateRef.current = cells;
      setCommunity([]);
    },
    [gridSize],
  );

  const value: SimulationContextValue = {
    state: {
      speed,
      density,
      cellMargin,
      gridSize,
      surviveMin,
      surviveMax,
      birthMin,
      birthMax,
      birthMargin,
      running,
      community,
      rotationMode,
    },
    actions: {
      setSpeed,
      setDensity,
      setCellMargin,
      setGridSize: handleGridSizeChange,
      setSurviveMin,
      setSurviveMax,
      setBirthMin,
      setBirthMax,
      setBirthMargin,
      setCommunity,
      setRotationMode,
      playStop,
      step,
      randomize,
      reset,
      clear,
      tick,
      toggleCell,
      setCells,
      deleteCells,
      applyCells,
    },
    meta: {
      gridRef,
      initialStateRef,
    },
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
}
