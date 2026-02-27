const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const host = "127.0.0.1";
const port = Number(process.env.APP_DEV_PORT || 1420);
const projectRoot = path.resolve(__dirname, "..", "..");
const electronBinary = path.resolve(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".xml": "application/xml; charset=utf-8",
  ".ico": "image/x-icon"
};

function safeResolve(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const normalizedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const resolved = path.resolve(projectRoot, `.${normalizedPath}`);
  if (!resolved.startsWith(projectRoot)) {
    return null;
  }
  return resolved;
}

function serveStatic(req, res) {
  const resolvedPath = safeResolve(req.url || "/");
  if (!resolvedPath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
  fs.createReadStream(resolvedPath).pipe(res);
}

function runElectron() {
  if (!fs.existsSync(electronBinary)) {
    console.error("Electron binary not found. Run: npm install");
    process.exit(1);
  }

  const child = spawn(electronBinary, [path.join(projectRoot, "src-electron", "main.cjs")], {
    stdio: "inherit",
    env: {
      ...process.env,
      APP_DEV_URL: `http://${host}:${port}/index.html`
    }
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

const server = http.createServer(serveStatic);
server.listen(port, host, () => {
  console.log(`Serving ${projectRoot} on http://${host}:${port}/index.html`);
  runElectron();
});
