#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { run } from "../backend/dota-results-import.mjs";

export { run };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ probeOldLeague: process.argv.includes("--probe-old-league") })
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
