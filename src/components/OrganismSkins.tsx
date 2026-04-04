import React from 'react';
import type { Organism } from '../core/Organism';

interface OrganismSkinsProps {
	organisms: Map<string, Organism>;
	organismsVersion: number;
	gridSize: number;
	cellMargin: number;
}

/**
 * OrganismSkins: Previously rendered cytoplasm visual decorations.
 * Currently serves as a container for organism-related visuals if needed,
 * but the skin decorations are removed as per request.
 */
export function OrganismSkins({
	organisms,
}: OrganismSkinsProps) {
	// Decorator skins removed. The OrganismNucleusSupersuit and OrganismCoreVisuals 
	// are rendered via the main Organism component list.
	return null;
}
