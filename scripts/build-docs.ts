import fs from 'fs';
import path from 'path';
import { DOCUMENTATION_CONTENT } from '../src/data/documentation/_Documentation';

// This script is a basic static site generator for the documentation.
// It does not include dynamic test statuses. For live test data, view the in-app documentation modal.

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
      max-width: 800px; 
      margin: 0 auto; 
      background-color: #f4f4f4; 
      color: #333;
    }
    h1 { color: #1a1a1a; }
    h3 { 
      border-bottom: 2px solid #007acc; 
      padding-bottom: 8px; 
      margin-top: 40px;
      color: #005689;
    }
    p { margin-bottom: 16px; }
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

DOCUMENTATION_CONTENT.forEach(item => {
  // We will render all items, including deprecated ones, in a single flow.
  // The deprecated prefix in the text is sufficient to mark them.
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

// Note: Bun's `__dirname` behavior can be tricky. This assumes the script is run from the project root.
const outputPath = path.join(process.cwd(), 'src/public/documentation.html');
fs.writeFileSync(outputPath, html);

console.log(`✅ Documentation built successfully at ${outputPath}`);
