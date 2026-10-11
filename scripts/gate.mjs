#!/usr/bin/env node
/**
 * Quality gate for a Claude Code "Stop" hook (see docs/LOOP.md).
 * Runs the real checks. If any fail, it blocks Claude from stopping so it keeps fixing.
 * It gives up after GATE_MAX_TRIES consecutive failures (default 8), so it can never loop forever.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { join } from "node:path";

const MAX = Number(process.env.GATE_MAX_TRIES ?? 8);
const counter = join(tmpdir(), `folio-gate-${createHash("sha1").update(process.cwd()).digest("hex").slice(0, 10)}`);

const steps = [
  ["typecheck", ["npm", "run", "typecheck", "--silent"]],
  ["tests", ["npm", "test", "--silent"]],
  ...(process.env.GATE_BUILD === "1" ? [["build", ["npm", "run", "build", "--silent"]]] : []),
];

let failed = null;
for (const [name, cmd] of steps) {
  const r = spawnSync(cmd[0], cmd.slice(1), { encoding: "utf8", shell: process.platform === "win32" });
  if (r.status !== 0) {
    failed = { name, output: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n").slice(-25).join("\n") };
    break;
  }
}

if (!failed) {
  if (existsSync(counter)) rmSync(counter);
  console.log("Gate passed: typecheck and tests are green.");
  process.exit(0);
}

const tries = (existsSync(counter) ? Number(readFileSync(counter, "utf8")) || 0 : 0) + 1;
if (tries >= MAX) {
  rmSync(counter, { force: true });
  console.error(`Gate still red after ${MAX} attempts (${failed.name}). Stopping so a human can look.`);
  process.exit(0); // ceiling reached: allow Claude to stop
}
writeFileSync(counter, String(tries));
console.log(JSON.stringify({ decision: "block", reason: `The ${failed.name} check is failing (attempt ${tries} of ${MAX}). Fix it, then try again.\n\n${failed.output}` }));
process.exit(2);
