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
  };
  createdAt: string;
}

const GENESIS_STORAGE_KEY = "game-of-life-genesis-configs";

export function loadGenesisConfigs(): Record<string, GenesisConfig> {
  try {
    const stored = localStorage.getItem(GENESIS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load genesis configs:", e);
  }
  return {};
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
