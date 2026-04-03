const STORAGE_KEY = 'game-of-life-settings';

export function loadSettings(): Record<string, number> {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (e) {
		console.error('Failed to load settings:', e);
	}
	return {};
}

export function saveSettings(settings: Record<string, number>) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch (e) {
		console.error('Failed to save settings:', e);
	}
}
