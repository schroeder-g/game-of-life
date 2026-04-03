import { join } from 'path';

const packageJsonPath = join(process.cwd(), 'package.json');
const packageJson = await Bun.file(packageJsonPath).json();
const baseVersion = packageJson.version;

const buildNumber = Math.floor(Date.now() / 1000);
const fullVersion = `${baseVersion}.${buildNumber}`;

const htmlPath = join(process.cwd(), 'dist', 'index.html');
const htmlFile = Bun.file(htmlPath);

if (!(await htmlFile.exists())) {
	console.error(`Error: ${htmlPath} not found!`);
	process.exit(1);
}

let htmlContent = await htmlFile.text();
htmlContent = htmlContent.replace('__VERSION__', fullVersion);

await Bun.write(htmlPath, htmlContent);

console.log(
	`Successfully set version to ${fullVersion} in ${htmlPath}`,
);
