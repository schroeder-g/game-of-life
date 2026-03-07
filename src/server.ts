const server = Bun.serve({
  port: 3000,
  async fetch(req, server) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Handle WebSocket upgrade for live reload
    if (path === "/__reload") {
      if (server.upgrade(req)) {
        return;
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // Default to index.html
    if (path === "/") {
      path = "/index.html";
    }

    // Serve files from src/public
    const filePath = `./src/public${path}`;

    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();

      if (!exists) {
        // Try to serve TypeScript files compiled on the fly
        if (path.endsWith(".js")) {
          const tsPath = filePath.replace(/\.js$/, ".ts");
          const tsFile = Bun.file(tsPath);
          if (await tsFile.exists()) {
            const result = await Bun.build({
              entrypoints: [tsPath],
              target: "browser",
            });
            if (result.success && result.outputs.length > 0) {
              const code = await result.outputs[0].text();
              return new Response(code, {
                headers: { "Content-Type": "application/javascript" },
              });
            }
          }
        }
        return new Response("Not Found", { status: 404 });
      }

      // Determine content type
      const ext = path.split(".").pop();
      const contentTypes: Record<string, string> = {
        html: "text/html",
        css: "text/css",
        js: "application/javascript",
        ts: "application/javascript",
        tsx: "application/javascript",
        json: "application/json",
      };

      // For TypeScript/TSX files, compile them
      if (ext === "ts" || ext === "tsx") {
        const result = await Bun.build({
          entrypoints: [filePath],
          target: "browser",
        });
        if (result.success && result.outputs.length > 0) {
          const code = await result.outputs[0].text();
          return new Response(code, {
            headers: { "Content-Type": "application/javascript" },
          });
        }
        return new Response("Build Error", { status: 500 });
      }

      return new Response(file, {
        headers: { "Content-Type": contentTypes[ext || ""] || "text/plain" },
      });
    } catch (error) {
      console.error("Server error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
  websocket: {
    open(ws) {
      console.log("Live reload client connected");
    },
    message() {},
    close() {
      console.log("Live reload client disconnected");
    },
  },
});

console.log(`Game of Life server running at http://localhost:${server.port}`);
console.log("Hot reload enabled - watching for changes...");
