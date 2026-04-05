const fs = require('fs');

let content = fs.readFileSync('src/contexts/SimulationContext.tsx', 'utf8');

// replace organismsRef with organismManagerRef.current.organisms in diagnostic
content = content.replace(
/Array\.from\(organismsRef\.current\.values\(\)\)\.map\(o => o\.name\)/g,
	`Array.from(organismManagerRef.current.organisms.values()).map(o => o.name)`
);

// fix organismsRef in set
content = content.replace(
/organismsRef\.current\.set\((.*?)\);/g,
	`organismManagerRef.current.organisms.set($1);`
);

// fix entries
content = content.replace(
/organismsRef\.current\.entries\(\)/g,
`organismManagerRef.current.organisms.entries()`
);

// fix get
content = content.replace(
/organismsRef\.current\.get\((.*?)\);/g,
	`organismManagerRef.current.organisms.get($1);`
);

// fix recordOrganismAction
content = content.replace(
/recordOrganismAction\(\);/g,
	`organismManagerRef.current.recordAction();`
);

content = content.replace(
/recordOrganismAction,/g,
``
);

// value not found issue?
content = content.replace(
/<SimulationContext\.Provider value=\{value\}>/g,
	`<SimulationContext.Provider value={value}>` 
);

fs.writeFileSync('src/contexts/SimulationContext.tsx', content);
