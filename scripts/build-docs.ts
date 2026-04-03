import fs from 'fs';
import path from 'path';
import {
	DOCUMENTATION_CONTENT,
	DOCUMENTATION_INDEX_GROUPS,
} from '../src/data/documentation/_Documentation';

// This script is a basic static site generator for the documentation.
// It does not include dynamic test statuses. For live test data, view the in-app documentation modal.

const stripHtml = (text: string) => text.replace(/<[^>]*>?/gm, '');

let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cube of Life - Documentation</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6; 
      padding: 20px; 
      max-width: 900px; 
      margin: 0 auto; 
      background-color: #f4f4f4; 
      color: #333;
    }
    h1 { color: #1a1a1a; text-align: center; margin-bottom: 40px; }
    h3 { 
      border-bottom: 2px solid #007acc; 
      padding-bottom: 8px; 
      margin-top: 40px;
      color: #005689;
    }
    p { margin-bottom: 16px; }
    .toc {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 40px;
    }
    .toc h2 { margin-top: 0; font-size: 1.2rem; color: #1a1a1a; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    .toc ul { list-style: none; padding-left: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .toc ul ul { display: block; padding-left: 15px; margin-top: 5px; }
    .toc li strong { display: block; margin-top: 10px; color: #005689; font-size: 0.9rem; text-transform: uppercase; }
    .toc li a { color: #007acc; text-decoration: none; font-size: 0.95rem; }
    .toc li a:hover { text-decoration: underline; }
    
    .claim {
      background-color: #fff;
      border-left: 4px solid #007acc;
      padding: 10px 20px;
      margin-bottom: 20px;
      border-radius: 0 5px 5px 0;
    }
    .code-ref { 
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      background-color: #eef; 
      padding: 2px 5px; 
      border-radius: 4px; 
      font-size: 0.9em;
    }
    .references, .test-ids { 
      font-size: 0.85em; 
      color: #555;
      font-style: italic;
    }
    .test-ids { color: #005689; }
  </style>
</head>
<body>
  <h1>Cube of Life - User Manual</h1>
`;

// Generate ToC
let tocHtml = `<div class="toc"><h2>Table of Contents</h2><ul>`;
const allGroupedIds = new Set<string>();

DOCUMENTATION_INDEX_GROUPS.forEach(group => {
	const groupItems = DOCUMENTATION_CONTENT.filter(
		item =>
			item.id.startsWith(group.idPrefix) &&
			!item.id.startsWith('deprecated-') &&
			item.type === 'h3',
	);

	if (groupItems.length > 0) {
		tocHtml += `<li><strong>${group.title}</strong><ul>`;
		groupItems.forEach(item => {
			allGroupedIds.add(item.id);
			tocHtml += `<li><a href="#${item.id}">${stripHtml(item.text.replace(group.stripPrefix, ''))}</a></li>`;
		});
		tocHtml += `</ul></li>`;
	}
});

// Reference Manual (items not in any other group)
tocHtml += `<li><strong>Reference Manual</strong><ul>`;
DOCUMENTATION_CONTENT.forEach(item => {
	if (
		!item.id.startsWith('deprecated-') &&
		!allGroupedIds.has(item.id) &&
		item.type === 'h3'
	) {
		tocHtml += `<li><a href="#${item.id}">${stripHtml(item.text)}</a></li>`;
	}
});
tocHtml += `</ul></li></ul></div>`;

html += tocHtml;

// Generate Content
DOCUMENTATION_CONTENT.forEach(item => {
	if (item.type === 'h3') {
		html += `<h3 id="${item.id}">${item.text}</h3>\n`;
	} else if (item.type === 'p') {
		html += `<div class="claim" id="${item.id}">\n`;
		html += `  <p>${item.text}</p>\n`;
		if (item.references && item.references.length > 0) {
			html += `  <p class="references"><b>References:</b> ${item.references.join(', ')}</p>\n`;
		}
		if (item.testIds && item.testIds.length > 0) {
			html += `  <p class="test-ids"><b>Test IDs:</b> ${item.testIds.join(', ')}</p>\n`;
		}
		html += `</div>\n`;
	}
});

html += `
</body>
</html>
`;

const outputPath = path.join(
	process.cwd(),
	'src/public/documentation.html',
);
fs.writeFileSync(outputPath, html);

console.log(`✅ Documentation built successfully at ${outputPath}`);
