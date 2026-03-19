import { DEFAULT_CONFIGS, GenesisConfig } from "../data/default-configs";
export type { GenesisConfig };

const GENESIS_STORAGE_KEY = "game-of-life-genesis-configs";

export function loadGenesisConfigs(): Record<string, GenesisConfig> {
  const configs: Record<string, GenesisConfig> = { ...DEFAULT_CONFIGS };
  try {
    const stored = localStorage.getItem(GENESIS_STORAGE_KEY);
    if (stored) {
      const saved = JSON.parse(stored) as Record<string, GenesisConfig>;
      const defaultKeyMap = new Map(
        Object.keys(DEFAULT_CONFIGS).map((k) => [k.toLowerCase(), k]),
      );

      for (const savedKey in saved) {
        const savedKeyLower = savedKey.toLowerCase();
        const defaultKey = defaultKeyMap.get(savedKeyLower);

        if (defaultKey && defaultKey !== savedKey) {
          // Case-insensitive match: saved overrides default.
          // Use the default's canonical casing for the key.
          // And remove the saved-casing key if it exists in the merged object.
          delete configs[savedKey];
          configs[defaultKey] = saved[savedKey];
        } else {
          // No case-insensitive match, or exact match.
          // Just add/overwrite it.
          configs[savedKey] = saved[savedKey];
        }
      }
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
