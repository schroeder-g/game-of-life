const fs = require('fs');

let content = fs.readFileSync('src/contexts/SimulationContext.tsx', 'utf8');

// The tick loop
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

// Functions that are no longer needed
content = content.replace(
/const recordOrganismAction = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\);/g,
	``
);

content = content.replace(
/\/\*\* Remove organism territory from the grid before GoL tick, restore living cells after\. \*\/[\s\S]*?const tickWithOrganismExclusion = useCallback\(\(\) => \{[\s\S]*?\}, \[surviveMin, surviveMax, birthMin, birthMax, birthMargin\]\);/g,
	``
);

content = content.replace(
/const updateOrganismsAfterTick = useCallback\(\(skipSnapshot = false\) => \{[\s\S]*?\}, \[gridSize, neighborFaces, neighborEdges, neighborCorners, recordOrganismAction, surviveMin, surviveMax, birthMin, birthMax, birthMargin\]\);/g,
	``
);

content = content.replace(
/updateOrganismsAfterTick,/g,
``
);

content = content.replace(
/tickWithOrganismExclusion,/g,
``
);

content = content.replace(
/recordOrganismAction,/g,
``
);

// Remaining history uses
content = content.replace(
/const success = gridRef\.current\.stepBackward\(\);\n\s*if \(success && pastOrganismsRef\.current\.length > 0\) \{\n\s*\/\/ Save current to future for "redo" consistency \(if ever implemented\)\n\s*futureOrganismsRef\.current\.push\(cloneOrganisms\(organismsRef\.current\)\);\n\s*\n\s*\/\/ Restore from past\n\s*organismsRef\.current = pastOrganismsRef\.current\.pop\(\)!;\n\s*setOrganismsVersion\(v => v \+ 1\);\n\s*\}/g,
	`const success = gridRef.current.stepBackward();
		if (success) {
			organismManagerRef.current.stepBackward();
			setOrganismsVersion(organismManagerRef.current.version);
		}`
);

content = content.replace(
/const playStop = useCallback\(\(\) => \{\n\s*if \(!running && gridRef\.current\.generation === 0\) \{\n\s*initialStateRef\.current = gridRef\.current\.saveState\(\);\n\s*initialOrganismsRef\.current = new Map\(organismsRef\.current\);\n\s*setHasInitialState\(initialStateRef\.current\.length > 0\);\n\s*\}/g,
	`const playStop = useCallback(() => {
		if (!running && gridRef.current.generation === 0) {
			initialStateRef.current = gridRef.current.saveState();
			organismManagerRef.current.saveInitialState();
			setHasInitialState(initialStateRef.current.length > 0);
		}`
);


content = content.replace(
/const randomize = useCallback\(\(\) => \{\n\s*gridRef\.current\.randomize\(density\);\n\s*initialStateRef\.current = gridRef\.current\.saveState\(\);\n\s*initialOrganismsRef\.current = new Map\(\);\s*\/\/ Clear initial organisms\n\s*organismsRef\.current\.clear\(\);\s*\/\/ Clear current organisms\n\s*setOrganismsVersion\(v => v \+ 1\);\s*\/\/ Trigger re-render\n\s*setHasInitialState\(initialStateRef\.current\.length > 0\);\n\s*\}, \[density\]\);/g,
	`const randomize = useCallback(() => {
		gridRef.current.randomize(density);
		initialStateRef.current = gridRef.current.saveState();
		organismManagerRef.current.clear(); // Clear current organisms
		setOrganismsVersion(organismManagerRef.current.version); // Trigger re-render
		setHasInitialState(initialStateRef.current.length > 0);
	}, [density]);`
);


content = content.replace(
/const reset = useCallback\(\(\) => \{\n\s*setRunning\(false\);\n\s*gridRef\.current\.restoreState\(initialStateRef\.current\);\n\s*organismsRef\.current = new Map\(initialOrganismsRef\.current\);\s*\/\/ Restore organisms from initial state\n\s*setOrganismsVersion\(v => v \+ 1\);\n\s*\}, \[\]\);/g,
	`const reset = useCallback(() => {
		setRunning(false);
		gridRef.current.restoreState(initialStateRef.current);
		organismManagerRef.current.restoreInitialState();
		setOrganismsVersion(organismManagerRef.current.version);
	}, []);`
);

content = content.replace(
/const clear = useCallback\(\(\) => \{\n\s*setRunning\(false\);\n\s*gridRef\.current\.clear\(\);\n\s*initialStateRef\.current = \[\];\n\s*initialOrganismsRef\.current = new Map\(\);\s*\/\/ Clear initial organisms\n\s*organismsRef\.current = new Map\(\);\s*\/\/ Clear current organisms\n\s*setOrganismsVersion\(v => v \+ 1\);\s*\/\/ Trigger re-render\n\s*setHasInitialState\(false\);\n\s*\}, \[\]\);/g,
	`const clear = useCallback(() => {
		setRunning(false);
		gridRef.current.clear();
		initialStateRef.current = [];
		organismManagerRef.current.clear();
		setOrganismsVersion(organismManagerRef.current.version);
		setHasInitialState(false);
	}, []);`
);

content = content.replace(
/organismManagerRef\.current\.clear\(\);\n\s*if \(savedOrgs && Array\.isArray\(savedOrgs\)\) \{\n\s*for \(const orgData of savedOrgs\) \{\n\s*organismsRef\.current\.set\(\n\s*orgData\.id,\n\s*deserializeOrganism\(orgData, finalGridSize\),\n\s*\);\n\s*\}\n\s*\}\n\s*setOrganismsVersion\(v => v \+ 1\);/g,
	`organismManagerRef.current.applyOrganisms(savedOrgs || [], finalGridSize);
			setOrganismsVersion(organismManagerRef.current.version);`
);

content = content.replace(
/organismsRef\.current/g,
`organismManagerRef.current.organisms`
);

content = content.replace(
/organismsRef,/g,
`organismsRef: organismManagerRef as any,`
);

content = content.replace(
/organisms: organismManagerRef\.current\.organisms\.organisms,/g,
`organisms: organismManagerRef.current.organisms,`
);

fs.writeFileSync('src/contexts/SimulationContext.tsx', content);
