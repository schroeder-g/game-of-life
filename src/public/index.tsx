import { createRoot } from 'react-dom/client';
import { BrushProvider } from '../contexts/BrushContext';
import { GenesisConfigProvider } from '../contexts/GenesisConfigContext';
import { SimulationProvider } from '../contexts/SimulationContext';
import App from './App';

declare global {
	interface Window {
		__BUILD_INFO__: {
			version: string;
			distribution: 'dev' | 'test' | 'prod';
			buildTime?: string;
		};
	}
}

// Initialize window.__BUILD_INFO__ directly using injected environment variables
// These variables are defined by the bun build command using --define
window.__BUILD_INFO__ = {
	version: process.env.APP_VERSION || 'unknown', // Fallback for non-build environments
	buildTime: process.env.BUILD_TIME,
	distribution:
		(process.env.BUILD_DISTRIBUTION as 'dev' | 'test' | 'prod') ||
		'dev', // Fallback
};

const root = createRoot(document.getElementById('root')!);
root.render(
	<SimulationProvider>
		<BrushProvider>
			<GenesisConfigProvider>
				<App />
			</GenesisConfigProvider>
		</BrushProvider>
	</SimulationProvider>,
);
