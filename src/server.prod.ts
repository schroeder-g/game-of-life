const packageJson = await Bun.file("package.json").json();

const server = Bun.serve({
  port: process.env.PORT || 8080, // Use PORT from environment or default to 8080 for Cloud Run
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Serve index.html for the root path or client-side routes
    if (path === "/" || !path.split("/").pop()?.includes(".")) {
      const indexFile = Bun.file("./dist/index.html");
      if (await indexFile.exists()) {
        let html = await indexFile.text();

        // Inject build info
        const buildInfo = {
          version: packageJson.version,
          distribution: process.env.DISTRIBUTION || "prod"
        };
        const buildInfoScript = `window.__BUILD_INFO__ = ${JSON.stringify(buildInfo)};`;
        html = html.replace("__BUILD_INFO_PLACEHOLDER__", buildInfoScript);
        
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      }
    }

    // Serve other static files
    const filePath = `./dist${path}`;
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Production server running on port ${server.port}`);
