const fs = require('fs');

let content = fs.readFileSync('src/contexts/SimulationContext.tsx', 'utf8');

content = content.replace(
/organisms: organismsRef\.current,/g,
`organisms: organismManagerRef.current.organisms,`
);

content = content.replace(
/organismsRef,/g,
`organismsRef: organismManagerRef as any,`
);

content = content.replace(
/Array\.from\(organismsRef\.current\.entries\(\)\)/g,
`Array.from(organismManagerRef.current.organisms.entries())`
);

content = content.replace(
/convertCommunityToOrganism\((.*?)\) \{[\s\S]*?\},/g,
`convertCommunityToOrganism(community: Array<[number, number, number]>) {
		// Stub for now.
	},`
);

content = content.replace(
/const moveSelectedOrganism = useCallback\([\s\S]*?\}, \[selectedOrganismId, gridSize, recordOrganismAction\]\);/g,
	`const moveSelectedOrganism = useCallback(() => {}, []);`
);

content = content.replace(
/const rotateSelectedOrganism = useCallback\([\s\S]*?\},[\s\S]*?\]\);/g,
	`const rotateSelectedOrganism = useCallback((axis: THREE.Vector3, angle: number) => {
		if (selectedOrganismId) {
			organismManagerRef.current.rotateOrganism(gridRef.current, selectedOrganismId, axis, angle);
			setOrganismsVersion(organismManagerRef.current.version);
		}
	}, [selectedOrganismId]);`
);


fs.writeFileSync('src/contexts/SimulationContext.tsx', content);
