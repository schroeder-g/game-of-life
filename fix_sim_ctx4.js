const fs = require('fs');

let content = fs.readFileSync('src/contexts/SimulationContext.tsx', 'utf8');

content = content.replace(
/if \(organismsRef\.current\.size > 0\) \{\n\s*tickWithOrganismExclusion\(\);\n\s*\} else \{\n\s*gridRef\.current\.tick\(surviveMin, surviveMax, birthMin, birthMax, birthMargin\);\n\s*\}\n\s*\/\/ After grid tick, process organisms\n\s*updateOrganismsAfterTick\(\);/g,
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
/\[\n\s*recordOrganismAction,\n\s*\]/g,
`[]`
);

content = content.replace(
/,\n\s*recordOrganismAction/g,
``
);

content = content.replace(
/organismsRef\.current\.clear\(\);\n\s*pastOrganismsRef\.current = \[\];\n\s*futureOrganismsRef\.current = \[\];/g,
	`organismManagerRef.current.clear();`
);

content = content.replace(
/\[\s*recordOrganismAction\s*\]/g,
`[]`
);


fs.writeFileSync('src/contexts/SimulationContext.tsx', content);
