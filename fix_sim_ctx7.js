const fs = require('fs');

let content = fs.readFileSync('src/contexts/SimulationContext.tsx', 'utf8');

content = content.replace(
/pastOrganismsRef\.current = \[\];/g,
	``
);

content = content.replace(
/futureOrganismsRef\.current = \[\];/g,
	``
);

content = content.replace(
/recordOrganismAction\(\);/g,
	`organismManagerRef.current.recordAction();`
);

content = content.replace(
/recordOrganismAction,/g,
``
);

content = content.replace(
/initialOrganismsRef\.current = new Map\(organismsRef\.current\);/g,
	`organismManagerRef.current.saveInitialState();`
);

fs.writeFileSync('src/contexts/SimulationContext.tsx', content);
