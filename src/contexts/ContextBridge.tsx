import React, { ReactNode } from 'react';
import { SimulationContext, useSimulation } from './SimulationContext';
import { BrushContext, useBrush } from './BrushContext';
import { GenesisConfigContext, useGenesisConfig } from './GenesisConfigContext';

/**
 * ContextBridge simplifies the process of providing outer React contexts
 * to the React-Three-Fiber Canvas elements, which exist in a separate React root.
 */
export function ContextBridge({ children }: { children: ReactNode }) {
	const simulationValue = useSimulation();
	const brushValue = useBrush();
	const genesisValue = useGenesisConfig();

	return (
		<SimulationContext.Provider value={simulationValue}>
			<BrushContext.Provider value={brushValue}>
				<GenesisConfigContext.Provider value={genesisValue}>
					{children}
				</GenesisConfigContext.Provider>
			</BrushContext.Provider>
		</SimulationContext.Provider>
	);
}
