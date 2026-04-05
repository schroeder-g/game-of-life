const fs = require('fs');
let text = fs.readFileSync('src/components/BrushControls.tsx', 'utf8');

text = text.replace(
/target instanceof HTMLInputElement/g,
`('tagName' in target && (target as HTMLElement).tagName === 'INPUT')`
);

text = text.replace(
/target instanceof HTMLTextAreaElement/g,
`('tagName' in target && (target as HTMLElement).tagName === 'TEXTAREA')`
);

text = text.replace(
/\(e\.target as HTMLElement\) instanceof HTMLInputElement/g,
`('tagName' in (e.target as HTMLElement) && (e.target as HTMLElement).tagName === 'INPUT')`
);

fs.writeFileSync('src/components/BrushControls.tsx', text);
