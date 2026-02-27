const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..", "..");
const electronBinary = path.resolve(projectRoot, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
const entryPoint = path.join(projectRoot, "src-electron", "main.cjs");
const frontendDist = path.join(projectRoot, "frontend-dist", "index.html");

if (!fs.existsSync(electronBinary)) {
  console.error("Electron binary not found. Run: npm install");
  process.exit(1);
}

if (!fs.existsSync(frontendDist)) {
  console.error("frontend-dist/index.html not found. Build/copy frontend assets first.");
  process.exit(1);
}

const child = spawn(electronBinary, [entryPoint], {
  stdio: "inherit",
  env: { ...process.env }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
