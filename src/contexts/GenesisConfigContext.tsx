import {
	createContext,
	ReactNode,
	useCallback,
	useContext,
	useState,
} from 'react';
import {
	exportGenesisConfig,
	GenesisConfig,
	importGenesisConfig,
	loadGenesisConfigs,
	saveGenesisConfigs,
} from '../hooks/useGenesisConfigs';

export interface GenesisConfigState {
	savedConfigs: Record<string, GenesisConfig>;
	selectedConfigName: string;
	newConfigName: string;
}

export interface GenesisConfigActions {
	setSelectedConfigName: (name: string) => void;
	setNewConfigName: (name: string) => void;
	saveConfig: (name: string, config: GenesisConfig) => void;
	exportConfig: (config: GenesisConfig) => void;
	importConfig: (
		onImportSuccess?: (config: GenesisConfig) => void,
	) => Promise<void>;
	deleteConfig: (name: string) => void;
}

export interface GenesisConfigContextValue {
	state: GenesisConfigState;
	actions: GenesisConfigActions;
}

const GenesisConfigContext =
	createContext<GenesisConfigContextValue | null>(null);

export function GenesisConfigProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [savedConfigs, setSavedConfigs] = useState<
		Record<string, GenesisConfig>
	>(() => loadGenesisConfigs());
	const [selectedConfigName, setSelectedConfigName] =
		useState<string>('');
	const [newConfigName, setNewConfigName] = useState<string>('');

	const saveConfig = useCallback(
		(name: string, config: GenesisConfig) => {
			const newConfigs = { ...savedConfigs, [name]: config };
			setSavedConfigs(newConfigs);
			saveGenesisConfigs(newConfigs);
			setSelectedConfigName(name);
			setNewConfigName('');
		},
		[savedConfigs],
	);

	const exportConfig = useCallback((config: GenesisConfig) => {
		exportGenesisConfig(config);
	}, []);

	const importConfig = useCallback(
		async (onImportSuccess?: (config: GenesisConfig) => void) => {
			const config = await importGenesisConfig();
			if (config) {
				const newConfigs = { ...savedConfigs, [config.name]: config };
				setSavedConfigs(newConfigs);
				saveGenesisConfigs(newConfigs);
				setSelectedConfigName(config.name);
				if (onImportSuccess) {
					onImportSuccess(config);
				}
			}
		},
		[savedConfigs],
	);

	const deleteConfig = useCallback(
		(name: string) => {
			if (name && savedConfigs[name]) {
				const newConfigs = { ...savedConfigs };
				delete newConfigs[name];
				setSavedConfigs(newConfigs);
				saveGenesisConfigs(newConfigs);
				setSelectedConfigName('');
			}
		},
		[savedConfigs],
	);

	const value: GenesisConfigContextValue = {
		state: {
			savedConfigs,
			selectedConfigName,
			newConfigName,
		},
		actions: {
			setSelectedConfigName,
			setNewConfigName,
			saveConfig,
			exportConfig,
			importConfig,
			deleteConfig,
		},
	};

	return (
		<GenesisConfigContext.Provider value={value}>
			{children}
		</GenesisConfigContext.Provider>
	);
}

export function useGenesisConfig() {
	const context = useContext(GenesisConfigContext);
	if (!context) {
		throw new Error(
			'useGenesisConfig must be used within a GenesisConfigProvider',
		);
	}
	return context;
}
