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

// Inject build-time variables.
// process.env.BUILD_DISTRIBUTION is defined by the bun build command.
// We fall back to 'dev' for the local development server.
if (typeof window !== "undefined") {
  // In the dev server (`bun --hot`), `process` is not defined in the browser,
  // so we safely check for its existence and default to 'dev'.
  const buildDistribution = (
    (typeof process !== "undefined" && process.env.BUILD_DISTRIBUTION) || "dev"
  ) as "dev" | "test" | "prod";

  window.__BUILD_INFO__ = {
    version: pkg.version,
    buildTime: new Date().toISOString(),
    distribution: buildDistribution,
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
