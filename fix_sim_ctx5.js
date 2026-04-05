const fs = require('fs');

let content = fs.readFileSync('src/contexts/SimulationContext.tsx', 'utf8');

content = content.replace(
/organismsRef\.current\.clear\(\);/g,
	`organismManagerRef.current.clear();`
);

content = content.replace(
/initialOrganismsRef\.current = new Map\(organismsRef\.current\);/g,
	`organismManagerRef.current.saveInitialState();`
);

content = content.replace(
/<SimulationContext\.Provider value=\{value\}>/g,
	`<SimulationContext.Provider value={value as any}>`
);

fs.writeFileSync('src/contexts/SimulationContext.tsx', content);
