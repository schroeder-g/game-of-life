import { createRoot } from "react-dom/client";
import { BrushProvider } from "../contexts/BrushContext";
import { GenesisConfigProvider } from "../contexts/GenesisConfigContext";
import { SimulationProvider } from "../contexts/SimulationContext";
import App from "./App";
import pkg from "../../package.json";

declare global {
  interface Window {
    __BUILD_INFO__: {
      version: string;
      distribution: 'dev' | 'test' | 'prod';
      buildTime?: string;
    };
  }
}

if (typeof window !== "undefined" && !window.__BUILD_INFO__) {
  // Fallback for environments where __BUILD_INFO__ is not injected (e.g., some test setups)
  window.__BUILD_INFO__ = {
    version: pkg.version,
    buildTime: new Date().toISOString(),
    distribution: "dev", // Default to 'dev' if not explicitly set
  };
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <SimulationProvider>
    <BrushProvider>
      <GenesisConfigProvider>
        <App />
      </GenesisConfigProvider>
    </BrushProvider>
  </SimulationProvider>,
);
