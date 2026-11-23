import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const args = process.argv.slice(2);

function runWrangler(...argumentsForWrangler) {
  const result = spawnSync(process.execPath, [wrangler, ...argumentsForWrangler], { stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

// Workers Builds runs without arguments. Explicit CLI flags keep Wrangler's usual behavior.
const migrationStatus = args.length ? 0 : runWrangler("d1", "migrations", "apply", "DB", "--remote");
process.exitCode = migrationStatus || runWrangler("deploy", ...args);
