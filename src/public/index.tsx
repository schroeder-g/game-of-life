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
    };
  }
}

if (typeof window !== "undefined") {
  // The server (server.ts or server.prod.ts) injects window.__BUILD_INFO__ into the HTML.
  // We only provide a fallback here in case the script is run without the server (e.g., tests).
  if (!window.__BUILD_INFO__) {
    let dist: "dev" | "test" | "prod" = "dev";
    try {
      // @ts-ignore
      if (typeof process !== "undefined" && process.env.BUILD_DISTRIBUTION) {
        // @ts-ignore
        dist = process.env.BUILD_DISTRIBUTION as "dev" | "test" | "prod";
      }
    } catch (e) {
      // fallback to dev
    }

    window.__BUILD_INFO__ = {
      version: pkg.version,
      // @ts-ignore
      buildTime: new Date().toISOString(),
      distribution: dist,
    };
  }
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
