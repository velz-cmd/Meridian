#!/usr/bin/env node
/**
 * Evaluate NEXUS gate from JSON snapshot (stdin or file).
 * echo '{"symbol":"BNB","change24h":4.5,...}' | node bnb-hack/evaluate.mjs
 * node bnb-hack/evaluate.mjs snapshot.json [--enforce '{"action":"BUY","confidence":80}']
 */
import { readFileSync } from "fs";
import { evaluateNexusGate, enforceAgentGate, toStructuredOutput } from "./engine/nexus-gate.mjs";

async function readInput() {
  const file = process.argv[2];
  if (file && !file.startsWith("--")) return JSON.parse(readFileSync(file, "utf8"));
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) throw new Error("Pass JSON file path or pipe snapshot on stdin");
  return JSON.parse(raw);
}

function parseEnforce() {
  const fileIdx = process.argv.indexOf("--enforce-file");
  if (fileIdx !== -1 && process.argv[fileIdx + 1]) {
    return JSON.parse(readFileSync(process.argv[fileIdx + 1], "utf8"));
  }
  const idx = process.argv.indexOf("--enforce");
  if (idx === -1 || !process.argv[idx + 1]) return null;
  return JSON.parse(process.argv[idx + 1]);
}

const snap = await readInput();
const enforce = parseEnforce();

if (enforce) {
  console.log(JSON.stringify(enforceAgentGate(snap, enforce), null, 2));
} else {
  console.log(JSON.stringify(toStructuredOutput(snap, evaluateNexusGate(snap)), null, 2));
}
