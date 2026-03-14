const server = Bun.serve({
  port: process.env.PORT || 8080, // Use PORT from environment or default to 8080 for Cloud Run
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Serve index.html for the root path
    if (path === "/") {
      path = "/index.html";
    }

    const filePath = `./dist${path}`;
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (exists) {
      return new Response(file);
    }

    // Fallback for client-side routing: serve index.html for any path that is not a file.
    if (!path.split("/").pop()?.includes(".")) {
      const indexFile = Bun.file("./dist/index.html");
      return new Response(indexFile);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Production server running on port ${server.port}`);