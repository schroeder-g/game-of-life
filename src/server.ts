import { join } from "path";

// Read version from package.json for dev mode display
const packageJson = await Bun.file(join(process.cwd(), "package.json")).json();
const baseVersion = packageJson.version;
let currentVersion = baseVersion;

let buildOutput: any; 
const publicDir = join(process.cwd(), "src", "public");
const mainJsEntrypoint = join(publicDir, "index.tsx");
const hotReloadClients = new Set<any>();

// This function builds the entrypoint and stores the result in our cache.
async function buildMainJs() {
  console.log("Building index.tsx for development...");

  // Update the version timestamp on every build so the client sees it's new
  currentVersion = `${baseVersion}.${Math.floor(Date.now() / 1000)}`;

  const build = await Bun.build({
    entrypoints: [mainJsEntrypoint],
    sourcemap: "inline",
  });

  if (!build.success) {
    console.error("Build failed:");
    const errorLogs = build.logs.join("\n");

    console.error(errorLogs);
    buildOutput = `console.error("Bun build failed. Check server logs for details:\\n${errorLogs.replace(
        /`/g,
        "\\`",
      )}")`;
    return;
  }

  buildOutput = build.outputs[0];
  console.log("Build successful.");
}

// Build the script once on server startup.
await buildMainJs();

const server = Bun.serve({
  port: 3000,
  hostname: "0.0.0.0",
  development: false, // We will handle hot reloading manually to ensure reliability
  async fetch(req, server) {
    const path = new URL(req.url).pathname;

    // Handle WebSocket upgrade for our manual hot reload
    if (path === "/__hot_reload") {
      if (server.upgrade(req)) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // 1. Serve the bundled JavaScript entrypoint
    if (path === "/index.js") {
      return new Response(buildOutput, {
        headers: { "Content-Type": "application/javascript" },
      });
    }

    // 2. Serve other static assets like CSS directly
    const staticAssetPath = join(publicDir, path);
    const staticAsset = Bun.file(staticAssetPath);
    if (await staticAsset.exists()) {
      // Direct file response is fast and fine for non-HTML assets.
      return new Response(staticAsset);
    }

    // 3. For the root path or any other non-asset path, serve the main HTML file.
    // This handles the entry point and client-side routing fallbacks.
    // We MUST read it to text to allow Bun to inject the hot-reload script.
    const indexFile = Bun.file(join(publicDir, "index.html"));
    let html = await indexFile.text();

    // Inject the dynamic dev version
    html = html.replace("__VERSION__", currentVersion);

    // Manually inject the hot reload listener script
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

    return new Response(html.replace("</body>", hotReloadScript + "</body>"), {
      headers: { "Content-Type": "text/html" },
    });
  },
  
  websocket: {
    open(ws) {
      hotReloadClients.add(ws);
      console.log("Hot reload client connected. Total:", hotReloadClients.size);
    },
    close(ws) {
      hotReloadClients.delete(ws);
      console.log("Hot reload client disconnected. Total:", hotReloadClients.size);
    },
    message() {},
  },

  // This hook is called by `bun --hot` when a file changes.
  // It prevents the server from restarting and gives us control over the reload.
  async reload() {
    console.log("File change detected, rebuilding...");
    await buildMainJs();
    
    // Notify all connected clients to reload
    console.log(`Notifying ${hotReloadClients.size} clients to reload...`);
    for (const ws of hotReloadClients) {
      ws.send("reload");
    }
  },
});

console.log(
  `🚀 Development server running at http://${server.hostname}:${server.port}`,
);