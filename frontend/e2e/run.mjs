// Runs every browser smoke test in ./tests against a test build of the app.
//   cd frontend\e2e && npm install && npm test        (Edge or Chrome must be installed)
// Optional: node run.mjs login     -> only test files whose name contains "login"
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { serve, launch, newPage, fixtures, CARDS, sleep, BASE } from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, "..");
const only = process.argv[2];

console.log("Building a test copy of the app…");
const build = spawnSync("npx", ["vite", "build", "--config", "e2e/vite.e2e.config.js"], { cwd: frontend, stdio: "pipe", shell: true, encoding: "utf8" });
if (build.status !== 0) {
  console.error(build.stdout, build.stderr);
  process.exit(2);
}

const server = await serve();
const browser = await launch();
let passed = 0;
const failures = [];

const files = fs.readdirSync(path.join(here, "tests")).filter((f) => f.endsWith(".mjs") && (!only || f.includes(only))).sort();
for (const file of files) {
  console.log(`\n# ${file}`);
  const log = [];
  const ok = (name, cond) => {
    if (cond) { passed++; console.log(`  PASS ${name}`); }
    else { failures.push(`${file}: ${name}`); console.log(`  FAIL ${name}`); }
  };
  const mk = (opts = {}) => newPage(browser, { log, ...opts });
  try {
    const mod = await import(pathToFileURL(path.join(here, "tests", file)).href);
    await mod.default({ browser, newPage: mk, fixtures, CARDS, sleep, BASE, ok, log });
    ok("no JavaScript errors on the page", log.length === 0);
    if (log.length) console.log("   ", log.join("\n    "));
  } catch (err) {
    failures.push(`${file}: crashed — ${err.message}`);
    console.log(`  FAIL crashed: ${err.message}`);
  }
}

await browser.close();
server.close();
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log("Failures:\n - " + failures.join("\n - "));
  process.exit(1);
}
