const fs = require('fs');

let content = fs.readFileSync('src/contexts/SimulationContext.tsx', 'utf8');

content = content.replace(
/const recordOrganismAction = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\);/g,
	`// recordOrganismAction removed`
);

content = content.replace(
/\/\*\* Remove organism territory from the grid before GoL tick, restore living cells after\. \*\/[\s\S]*?const tickWithOrganismExclusion = useCallback\(\(\) => \{[\s\S]*?\}, \[surviveMin, surviveMax, birthMin, birthMax, birthMargin\]\);/g,
	`// tickWithOrganismExclusion removed`
);

content = content.replace(
/const updateOrganismsAfterTick = useCallback\(\(skipSnapshot = false\) => \{[\s\S]*?\}, \[gridSize, neighborFaces, neighborEdges, neighborCorners, recordOrganismAction, surviveMin, surviveMax, birthMin, birthMax, birthMargin\]\);/g,
	`// updateOrganismsAfterTick removed`
);

content = content.replace(
/if \(!running && gridRef\.current\.generation === 0\) \{\n\s*initialStateRef\.current = gridRef\.current\.saveState\(\);\n\s*initialOrganismsRef\.current = new Map\(organismsRef\.current\);\n\s*setHasInitialState\(initialStateRef\.current\.length > 0\);\n\s*\}/g,
	`if (!running && gridRef.current.generation === 0) {
			initialStateRef.current = gridRef.current.saveState();
			organismManagerRef.current.saveInitialState();
			setHasInitialState(initialStateRef.current.length > 0);
		}`
);

content = content.replace(
/const success = gridRef\.current\.stepBackward\(\);\n\s*if \(success && pastOrganismsRef\.current\.length > 0\) \{[\s\S]*?setOrganismsVersion\(v => v \+ 1\);\n\s*\}/g,
	`const success = gridRef.current.stepBackward();
		if (success) {
			organismManagerRef.current.stepBackward();
			setOrganismsVersion(organismManagerRef.current.version);
		}`
);

content = content.replace(
/if \(organismsRef\.current\.size > 0\) \{\n\s*tickWithOrganismExclusion\(\);\n\s*\} else \{\n\s*gridRef\.current\.tick\(surviveMin, surviveMax, birthMin, birthMax, birthMargin\);\n\s*\}\n\s*updateOrganismsAfterTick\(\);/g,
	`if (enableOrganisms) { 
				organismManagerRef.current.beforeTick(gridRef.current); 
			}
			gridRef.current.tick(surviveMin, surviveMax, birthMin, birthMax, birthMargin);
			if (enableOrganisms) { 
				organismManagerRef.current.afterTick(gridRef.current, { surviveMin, surviveMax, birthMin, birthMax, birthMargin, neighborFaces, neighborEdges, neighborCorners, gridSize }); 
				setOrganismsVersion(organismManagerRef.current.version);
			}`
);

content = content.replace(
/updateOrganismsAfterTick,\n\s*tickWithOrganismExclusion,/g,
`enableOrganisms, gridSize,`
);

content = content.replace(
/initialOrganismsRef\.current = new Map\(\);\s*\/\/ Clear initial organisms\n\s*organismsRef\.current\.clear\(\);\s*\/\/ Clear current organisms\n\s*setOrganismsVersion\(v => v \+ 1\);/g,
	`organismManagerRef.current.clear();
		organismManagerRef.current.saveInitialState();
		setOrganismsVersion(organismManagerRef.current.version);`
);

content = content.replace(
/organismsRef\.current = new Map\(initialOrganismsRef\.current\);\s*\/\/ Restore organisms from initial state\n\s*setOrganismsVersion\(v => v \+ 1\);/g,
	`organismManagerRef.current.restoreInitialState();
		setOrganismsVersion(organismManagerRef.current.version);`
);

content = content.replace(
/initialOrganismsRef\.current = new Map\(\);\s*\/\/ Clear initial organisms\n\s*organismsRef\.current = new Map\(\);\s*\/\/ Clear current organisms\n\s*setOrganismsVersion\(v => v \+ 1\);/g,
	`organismManagerRef.current.clear();
		setOrganismsVersion(organismManagerRef.current.version);`
);

content = content.replace(
/organismsRef\.current\.clear\(\);\n\s*pastOrganismsRef\.current = \[\];\n\s*futureOrganismsRef\.current = \[\];\n\s*if \(savedOrgs && Array\.isArray\(savedOrgs\)\) \{\n\s*for \(const orgData of savedOrgs\) \{\n\s*organismsRef\.current\.set\(\n\s*orgData\.id,\n\s*deserializeOrganism\(orgData, finalGridSize\),\n\s*\);\n\s*\}\n\s*\}\n\s*setOrganismsVersion\(v => v \+ 1\);/g,
	`organismManagerRef.current.applyOrganisms(savedOrgs || [], finalGridSize);
			setOrganismsVersion(organismManagerRef.current.version);`
);

fs.writeFileSync('src/contexts/SimulationContext.tsx', content);
