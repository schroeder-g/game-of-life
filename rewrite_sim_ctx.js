const fs = require('fs');

let content = fs.readFileSync('src/contexts/SimulationContext.tsx', 'utf8');

// 1. Imports
content = content.replace(
    `import { processOrganisms } from '../core/organism-processing';`,
    `import { IOrganismManager, DefaultOrganismManager } from '../core/OrganismManager';`
);

// 2. Refs and History
content = content.replace(
    /const organismsRef = useRef.*?;[\s\S]*const historyLimit = 100;/g,
    `const organismManagerRef = useRef<IOrganismManager>(new DefaultOrganismManager());\n\tconst [organismsVersion, setOrganismsVersion] = useState(0);`
);

// 3. handleGridSizeChange
content = content.replace(
    /organismsRef\.current\.clear\(\);\s*setOrganismsVersion\(v => v \+ 1\);/g,
    `organismManagerRef.current.clear();\n\t\t\tsetOrganismsVersion(organismManagerRef.current.version);`
);

// 4. tickWithOrganismExclusion and updateOrganismsAfterTick
content = content.replace(
    /const recordOrganismAction = useCallback[\s\S]*?}, \[gridSize, neighborFaces, neighborEdges, neighborCorners, recordOrganismAction, surviveMin, surviveMax, birthMin, birthMax, birthMargin\]\);/g,
    ``
);

// 5. playStop
content = content.replace(
    /initialOrganismsRef\.current = new Map\(organismsRef\.current\);/g,
    `organismManagerRef.current.saveInitialState();`
);

// 6. stepBackward
content = content.replace(
    /if \(success && pastOrganismsRef\.current\.length > 0\) {[\s\S]*?}/g,
    `if (success) {
			organismManagerRef.current.stepBackward();
			setOrganismsVersion(organismManagerRef.current.version);
		}`
);

// 7. step
content = content.replace(
    /if \(organismsRef\.current\.size > 0\) {[\s\S]*?tickWithOrganismExclusion\(\);[\s\S]*?} else {[\s\S]*?gridRef\.current\.tick\(.*?\);[\s\S]*?}[\s\S]*?updateOrganismsAfterTick\(\);/g,
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
    /updateOrganismsAfterTick,\s*tickWithOrganismExclusion,/g,
    `enableOrganisms, gridSize,`
);

// 8. randomize
content = content.replace(
    /initialOrganismsRef\.current = new Map\(\);(?: \/\/.*)?\n\s*organismsRef\.current\.clear\(\);(?: \/\/.*)?\n\s*setOrganismsVersion\(v => v \+ 1\);/g,
    `organismManagerRef.current.clear();\n\t\torganismManagerRef.current.saveInitialState();\n\t\tsetOrganismsVersion(organismManagerRef.current.version);`
);

// 9. reset and clear
content = content.replace(
    /organismsRef\.current = new Map\(initialOrganismsRef\.current\);(?: \/\/.*)?\n\s*setOrganismsVersion\(v => v \+ 1\);/g,
    `organismManagerRef.current.restoreInitialState();\n\t\tsetOrganismsVersion(organismManagerRef.current.version);`
);

// 10. applyCells
content = content.replace(
    /organismsRef\.current\.clear\(\);\n\s*pastOrganismsRef\.current = \[\];\n\s*futureOrganismsRef\.current = \[\];\n\s*if \(savedOrgs && Array\.isArray\(savedOrgs\)\) {[\s\S]*?}\n\s*setOrganismsVersion\(v => v \+ 1\);/g,
    `organismManagerRef.current.applyOrganisms(savedOrgs || [], finalGridSize);\n\t\t\tsetOrganismsVersion(organismManagerRef.current.version);`
);

// 11. Initializer override for default config
content = content.replace(
    /if \(defaultConfig\.organisms\) {[\s\S]*?setOrganismsVersion\(v => v \+ 1\);\n\s*}/g,
    `if (defaultConfig.organisms) {
							organismManagerRef.current.applyOrganisms(defaultConfig.organisms, defaultConfig.settings.gridSize);
							setOrganismsVersion(organismManagerRef.current.version);
						}`
);

// 12. Update the Context Value returns
content = content.replace(
    /organisms: organismsRef\.current,/g,
    `organisms: organismManagerRef.current.organisms,`
);
content = content.replace(
    /organismsRef,/g,
    `organismsRef: organismManagerRef as any, // Legacy cast for meta if needed`
);
content = content.replace(
/organismsRef\.current\.size > 0/g,
	`organismManagerRef.current.organisms.size > 0`
);
content = content.replace(
/organismsRef\.current\.values\(\)/g,
`organismManagerRef.current.organisms.values()`
);

// 13. EnableOrganisms useEffect
content = content.replace(
    /if \(!enableOrganisms\) {\n\s*if \(organismManagerRef\.current\.organisms\.size > 0\) {\n\s*organismManagerRef\.current\.clear\(\);\n\s*setOrganismsVersion\(v => v \+ 1\);\n\s*}\n\s*setSelectedOrganismId\(null\);\n\s*}/g,
    `if (!enableOrganisms) {
			if (organismManagerRef.current.organisms.size > 0) {
				organismManagerRef.current.clear();
				setOrganismsVersion(organismManagerRef.current.version);
			}
			setSelectedOrganismId(null);
		}`
);

fs.writeFileSync('src/contexts/SimulationContext.tsx', content);
