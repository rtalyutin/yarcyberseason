#!/usr/bin/env node
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import tournament from "../src/data/tournaments/dota2-autumn-2026.json" with { type: "json" };
import { collectDotaResults, isPollWindow } from "../src/lib/dota-import.js";
import { validateDotaSnapshot } from "../src/lib/dota-results.js";

const bucket = "e9dc5ea4-6dc9267d-85ca-4ae9-a41f-2895e9542a04";
const key = "results/dota2-autumn-2026.json";
const dryRun = process.argv.includes("--probe-old-league");

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`OpenDota HTTP ${response.status} at ${new URL(url).pathname}`);
  return response.json();
}

async function getLeagueMaps(leagueId, limit = Infinity) {
  const ids = await getJson(`https://api.opendota.com/api/leagues/${leagueId}/matchIds`);
  if (!Array.isArray(ids) || ids.some((id) => !/^[1-9]\d*$/.test(String(id)))) throw new Error("Invalid OpenDota league match IDs");
  const maps = [];
  for (const id of [...new Set(ids.map(String))].slice(0, limit)) maps.push(await getJson(`https://api.opendota.com/api/matches/${id}`));
  return maps;
}

async function readSnapshot(s3) {
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return validateDotaSnapshot(JSON.parse(await object.Body.transformToString()), tournament);
  } catch (error) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) return null;
    throw error;
  }
}

export async function run() {
  if (dryRun) {
    const maps = await getLeagueMaps(19021, 1);
    console.log(`Old league 19021: ${maps.length} map fetched, ${maps[0]?.match_id ?? "none"}; no S3 write`);
    return;
  }
  if (!isPollWindow()) { console.log("Outside confirmed polling window; no API or S3 request"); return; }
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) throw new Error("S3 credentials are not configured");
  const s3 = new S3Client({ region: "ru-1", endpoint: "https://s3.twcstorage.ru",
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
  try {
    const previous = await readSnapshot(s3);
    const maps = await getLeagueMaps(tournament.leagueId);
    const result = collectDotaResults(tournament, maps, previous);
    for (const warning of result.warnings) console.warn(warning);
    const unresolved = result.warnings.filter((warning) => /^(Unmatched|Unknown series|Ambiguous|Conflict)/.test(warning));
    if (!result.changed) {
      if (unresolved.length) throw new Error(`${unresolved.length} unresolved Dota result(s); see map IDs above`);
      console.log("No new confirmed series"); return;
    }
    const body = JSON.stringify(result.snapshot, null, 2) + "\n";
    try {
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body,
        ContentType: "application/json; charset=utf-8", CacheControl: "public, max-age=30" }));
    } catch (error) {
      const afterError = await readSnapshot(s3);
      if (JSON.stringify(afterError) !== JSON.stringify(result.snapshot)) throw error;
      console.log(`S3 write response unknown, readback confirmed revision ${afterError.revision}`);
      if (unresolved.length) throw new Error(`${unresolved.length} unresolved Dota result(s); see map IDs above`);
      return;
    }
    const saved = await readSnapshot(s3);
    if (JSON.stringify(saved) !== JSON.stringify(result.snapshot)) throw new Error("S3 readback differs from intended snapshot");
    console.log(`Published revision ${saved.revision}: ${Object.keys(saved.matches).length} completed series`);
    if (unresolved.length) throw new Error(`${unresolved.length} unresolved Dota result(s); see map IDs above`);
  } finally { s3.destroy(); }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
