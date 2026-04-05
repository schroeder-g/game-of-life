import React from 'react';
import type { Organism } from '../core/Organism';

interface OrganismSkinsProps {
	organisms: Map<string, Organism>;
	organismsVersion: number;
	gridSize: number;
	cellMargin: number;
}

/**
 * OrganismSkins: Stub — skin rendering is handled by CytoplasmSkin and OrganismNucleusSupersuit.
 */
export function OrganismSkins(_props: OrganismSkinsProps) {
	return null;
}
