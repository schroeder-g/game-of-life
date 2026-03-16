export interface GenesisConfig {
  name: string;
  cells: Array<[number, number, number]>;
  settings: {
    speed: number;
    density: number;
    surviveMin: number;
    surviveMax: number;
    birthMin: number;
    birthMax: number;
    birthMargin: number;
    cellMargin: number;
    gridSize: number;
    neighborFaces?: boolean;
    neighborEdges?: boolean;
    neighborCorners?: boolean;
  };
  createdAt: string;
}

const GENESIS_STORAGE_KEY = "game-of-life-genesis-configs";

const DEFAULT_CONFIGS: Record<string, GenesisConfig> = {
  "squid gun": {
    name: "squid gun",
    cells: [
      [11, 11, 11],
      [11, 11, 12],
      [11, 12, 11],
      [11, 12, 12],
      [12, 11, 11],
      [12, 11, 12],
      [12, 12, 11],
      [12, 12, 12],
    ],
    settings: {
      speed: 5,
      density: 0.08,
      surviveMin: 2,
      surviveMax: 2,
      birthMin: 3,
      birthMax: 3,
      birthMargin: 0,
      cellMargin: 0.2,
      gridSize: 24,
      neighborFaces: true,
      neighborEdges: true,
      neighborCorners: false,
    },
    createdAt: new Date("2026-03-09T00:00:00Z").toISOString(),
  },
  "3d glider": {
    name: "3d glider",
    cells: [
      [11, 11, 13], 
      [12, 12, 11], 
      [12, 11, 13], 
      [12, 12, 12]
    ],
    settings: {
      speed: 6,
      density: 0.08,
      surviveMin: 4,
      surviveMax: 4,
      birthMin: 3,
      birthMax: 3,
      birthMargin: 0,
      cellMargin: 0.2,
      gridSize: 24,
      neighborFaces: true,
      neighborEdges: true,
      neighborCorners: true,
    },
    createdAt: new Date().toISOString(),
  },
  "gemini glider 2": {
    name: "gemini glider 2",
    cells: [
      [11, 12, 12],
      [11, 12, 11],
      [12, 12, 13],
      [12, 11, 13]
    ],
    settings: {
      speed: 6,
      density: 0.08,
      surviveMin: 5,
      surviveMax: 5,
      birthMin: 3,
      birthMax: 3,
      birthMargin: 0,
      cellMargin: 0.2,
      gridSize: 24,
      neighborFaces: true,
      neighborEdges: true,
      neighborCorners: true,
    },
    createdAt: new Date().toISOString(),
  },
  "gemini glider 3": {
    name: "gemini glider 3",
    cells: [
      [12, 11, 11],
      [11, 12, 11],
      [13, 12, 11],
      [12, 13, 11],
      [11, 11, 12],
      [13, 13, 13],
    ],
    settings: {
      speed: 10,
      density: 0.08,
      surviveMin: 5,
      surviveMax: 5,
      birthMin: 3,
      birthMax: 3,
      birthMargin: 0,
      cellMargin: 0.2,
      gridSize: 24,
      neighborFaces: true,
      neighborEdges: true,
      neighborCorners: true,
    },
    createdAt: new Date().toISOString(),
  },
};

export function loadGenesisConfigs(): Record<string, GenesisConfig> {
  let configs = { ...DEFAULT_CONFIGS };
  try {
    const stored = localStorage.getItem(GENESIS_STORAGE_KEY);
    if (stored) {
      // Merge: stored takes precedence for custom names, default takes precedence for built-in names
      const saved = JSON.parse(stored);
      configs = { ...saved, ...DEFAULT_CONFIGS };
    }
  } catch (e) {
    console.error("Failed to load genesis configs:", e);
  }
  return configs;
}

export function saveGenesisConfigs(configs: Record<string, GenesisConfig>) {
  try {
    localStorage.setItem(GENESIS_STORAGE_KEY, JSON.stringify(configs));
  } catch (e) {
    console.error("Failed to save genesis configs:", e);
  }
}

export function exportGenesisConfig(config: GenesisConfig) {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${config.name.replace(/[^a-z0-9]/gi, "_")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importGenesisConfig(): Promise<GenesisConfig | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const config = JSON.parse(
            event.target?.result as string,
          ) as GenesisConfig;
          resolve(config);
        } catch (err) {
          console.error("Failed to parse genesis config:", err);
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
