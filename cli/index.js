#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import http from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || "localhost";

function banner() {
  const lines = [
    "┌────────────────────────────┐",
    "│          INPOLIO           │",
    "│  Your business. One place. │",
    "└────────────────────────────┘",
  ];
  process.stdout.write(`\n${lines.join("\n")}\n\n`);
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  let args;
  if (platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
}

function waitForServer(url, attempts = 40) {
  return new Promise((resolve, reject) => {
    const tryOnce = (left) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (left <= 0) reject(new Error("Server did not start in time."));
        else setTimeout(() => tryOnce(left - 1), 250);
      });
    };
    tryOnce(attempts);
  });
}

function runVite(bin, args) {
  return spawn(process.execPath, [bin, ...args], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, HOST: "0.0.0.0", PORT: String(PORT) },
  });
}

async function main() {
  banner();

  const dist = join(root, "dist", "index.html");
  const viteBin = join(root, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) {
    process.stderr.write("Vite is not installed. Run npm install in the Inpolio directory.\n");
    process.exit(1);
  }

  const args = existsSync(dist)
    ? ["preview", "--host", "0.0.0.0", "--port", String(PORT)]
    : ["--host", "0.0.0.0", "--port", String(PORT)];

  const child = runVite(viteBin, args);
  const url = `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/`;

  try {
    await waitForServer(url);
  } catch {
    /* preview/dev still prints its own errors */
  }

  process.stdout.write("✓ Local server started\n");
  process.stdout.write(`→ ${url}\n\n`);
  process.stdout.write("Press Ctrl+C to stop.\n");

  if (!process.env.INPOLIO_NO_OPEN) {
    openBrowser(url);
  }

  const stop = () => {
    child.kill("SIGINT");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
