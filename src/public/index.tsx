import { createRoot } from "react-dom/client";
import { BrushProvider } from "../contexts/BrushContext";
import { GenesisConfigProvider } from "../contexts/GenesisConfigContext";
import { SimulationProvider } from "../contexts/SimulationContext";
import App from "./App";

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
