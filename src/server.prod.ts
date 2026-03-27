export { }; // Add this line at the very top to avoid annoying squigglwe on await

// 1. Read package.json metadata (Requires the COPY in your Dockerfile)
const packageJson = await Bun.file("package.json").json();

// 2. Define the port as a number
const portNumber = Number(process.env.PORT || 8080);

const server = Bun.serve({
  port: portNumber,    // Fixed: The key is 'port', the value is our variable
  hostname: "0.0.0.0", // Essential for Cloud Run to route traffic to the container
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Logic to distinguish between a route (like /settings) and a file (like /style.css)
    const isFile = path.includes(".");

    // 1. Serve index.html for the root or any SPA route
    if (path === "/" || !isFile) {
      const indexFile = Bun.file("./dist/index.html");
      if (await indexFile.exists()) {
        let html = await indexFile.text();

        // Inject build info into the global window object
        const rawDist = process.env.DISTRIBUTION;
        if (!rawDist || !["dev", "test", "prod"].includes(rawDist)) {
          throw new Error(
            `DISTRIBUTION environment variable must be set to 'dev', 'test', or 'prod'. Got: ${JSON.stringify(rawDist)}`
          );
        }
        const buildInfo = {
          version: packageJson.version,
          distribution: rawDist as "dev" | "test" | "prod",
        };
        const buildInfoScript = `<script>window.__BUILD_INFO__ = ${JSON.stringify(buildInfo)};</script>`;

        // This replaces your placeholder string in the HTML
        html = html.replace("<!-- __BUILD_INFO_PLACEHOLDER__ -->", buildInfoScript);

        return new Response(html, { headers: { "Content-Type": "text/html" } });
      }
    }

    // 2. Serve static files from the dist folder
    const file = Bun.file(`./dist${path}`);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Production server running on port ${server.port}`);