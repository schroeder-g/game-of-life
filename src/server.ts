import { join } from 'path';
import { watch } from 'fs';

// Read version from package.json for dev mode display
const packageJson = await Bun.file(
	join(process.cwd(), 'package.json'),
).json();
const baseVersion = packageJson.version;
let buildTime = new Date().toISOString();

let buildOutput: any;
const srcDir = join(process.cwd(), 'src');
const publicDir = join(srcDir, 'public');
const mainJsEntrypoint = join(publicDir, 'index.tsx');
const hotReloadClients = new Set<any>();

watch(srcDir, { recursive: true }, async (event, filename) => {
	// Rebuild the frontend bundle and inject new version
	await buildMainJs();

	console.log(`File changed: ${filename}, notifying clients...`);
	for (const ws of hotReloadClients) {
		ws.send('reload');
	}
});

// This function builds the entrypoint and stores the result in our cache.
async function buildMainJs() {
	console.log('Building index.tsx for development...');

	// Update the version timestamp to the current build time
	// Update the build time on each rebuild
	buildTime = new Date().toISOString();
	console.log(`Injected BUILD_TIME for dev build: ${buildTime}`); // Diagnostic log

	const build = await Bun.build({
		entrypoints: [mainJsEntrypoint],
		sourcemap: 'inline',
		define: {
			'process.env.APP_VERSION': JSON.stringify(baseVersion),
			'process.env.BUILD_TIME': JSON.stringify(buildTime),
			'process.env.BUILD_DISTRIBUTION': JSON.stringify('dev'),
		},
	});

	if (!build.success) {
		console.error('Build failed:');
		const errorLogs = build.logs.join('\n');

		console.error(errorLogs);
		buildOutput = `console.error("Bun build failed. Check server logs for details:\\n${errorLogs.replace(
			/`/g,
			'\\`',
		)}")`;
		return;
	}

	buildOutput = build.outputs[0];
	console.log('Build successful.');
}

// Build the script once on server startup.
await buildMainJs();

const server = Bun.serve({
	port: 3000,
	hostname: '0.0.0.0',
	development: false, // We will handle hot reloading manually to ensure reliability
	async fetch(req, server) {
		const path = new URL(req.url).pathname;

		// Handle WebSocket upgrade for our manual hot reload
		if (path === '/__hot_reload') {
			if (server.upgrade(req)) return undefined;
			return new Response('WebSocket upgrade failed', { status: 400 });
		}

		// 1. Serve the bundled JavaScript entrypoint
		if (path === '/index.js') {
			return new Response(buildOutput, {
				headers: { 'Content-Type': 'application/javascript' },
			});
		}

		// 2. Serve other static assets like CSS and data files.
		const isFileRequest = path.includes('.');
		if (isFileRequest) {
			const staticAssetPath = join(publicDir, path);
			const staticAsset = Bun.file(staticAssetPath);
			if (await staticAsset.exists()) {
				return new Response(staticAsset);
			}
			// Return a 404 for missing files to prevent serving index.html.
			console.warn(`Static file not found: ${staticAssetPath}`);
			return new Response(`File not found: ${path}`, { status: 404 });
		}

		// 3. For the root path or any other non-asset path, serve the main HTML file.
		const indexFile = Bun.file(join(publicDir, 'index.html'));
		let html = await indexFile.text();

		// Inject the dynamic dev version info, including the buildTime.
		const buildInfo = {
			version: baseVersion,
			distribution: 'dev',
			buildTime: buildTime,
		};
		const buildInfoScript = `<script id="build-info-data">window.__BUILD_INFO__ = ${JSON.stringify(buildInfo)};</script>`;
		html = html.replace(
			'<!-- __BUILD_INFO_PLACEHOLDER__ -->',
			buildInfoScript,
		);

		// Manually inject the hot reload listener script.
		const hotReloadScript = `
      <script>
        (function() {
          const ws = new WebSocket("ws://" + location.host + "/__hot_reload");
          ws.onopen = () => console.log("Hot reload connected");
          ws.onmessage = (e) => { if (e.data === "reload") location.reload(); };
          ws.onclose = () => console.log("Hot reload disconnected");
        })();
      </script>
    `;

		return new Response(
			html.replace('</body>', hotReloadScript + '</body>'),
			{
				headers: { 'Content-Type': 'text/html' },
			},
		);
	},

	websocket: {
		open(ws) {
			hotReloadClients.add(ws);
			console.log(
				'Hot reload client connected. Total:',
				hotReloadClients.size,
			);
		},
		close(ws) {
			hotReloadClients.delete(ws);
			console.log(
				'Hot reload client disconnected. Total:',
				hotReloadClients.size,
			);
		},
		message() {},
	},
});

console.log(
	`🚀 Development server running at http://${server.hostname}:${server.port}`,
);
