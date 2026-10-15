import { test } from "node:test";
import assert from "node:assert/strict";
import { GENERATED_IDS } from "./core.mjs";
import { GENERATORS } from "./generated.mjs";

const listing = {
  image: [
    { model: "nano_banana", full_name: "Nano Banana", batch_size_max: 4, image_refs_supported: true, image_refs_max: 6 },
    { model: "pipe", full_name: "A | B", batch_size_max: 1, image_refs_supported: false },
  ],
  video: [
    { model: "kling_1p6_pro", full_name: "Kling 1.6 Pro", duration_seconds_options: [5, 10], starting_keyframe_supported: true, ending_keyframe_supported: false, image_references_supported: false },
    { model: "kling_1p6_pro", full_name: "Kling 1.6 Pro" },
    { model: "old", full_name: "Old Model", is_disabled: true },
    { model: "veo_3", full_name: "Veo 3", duration_seconds_min: 8, duration_seconds_max: 8, starting_keyframe_supported: true, image_references_supported: true, image_references_max: 3 },
  ],
};

const fakeFetch = async (url) => {
  const kind = url.endsWith("/image") ? "image" : "video";
  return new Response(JSON.stringify({ success: true, models: listing[kind] }));
};

// A table row's cells, trimmed (the padding is checked separately).
const row = (...cells) => new RegExp(`^\\|${cells.map((c) => ` ${c} +`).join("\\|")}\\|$`, "m");

test("builds image and video tables, deduped, without disabled models, with escaped cells", async () => {
  const md = await GENERATORS["artcraft-models"](fakeFetch);
  assert.match(md, /### Image models/);
  assert.match(md, row("Nano Banana", "4", "Up to 6"));
  assert.match(md, row("A \\\\\\| B", "1", "–"));
  assert.equal(md.match(/Kling 1\.6 Pro/g).length, 1);
  assert.doesNotMatch(md, /Old Model/);
  assert.match(md, row("Kling 1\\.6 Pro", "5–10 s", "Yes", "–", "–"));
  assert.match(md, row("Veo 3", "8 s", "Yes", "–", "Up to 3"));
});

test("tables are space-padded so their columns line up in plain text", async () => {
  const md = await GENERATORS["artcraft-models"](fakeFetch);
  const tables = md.split(/\n\n+/).filter((block) => block.startsWith("|"));
  assert.equal(tables.length, 2);
  for (const table of tables) {
    const lines = table.split("\n");
    // Pipe positions, ignoring escaped pipes inside cells.
    const pipes = (line) => [...line.matchAll(/(?<!\\)\|/g)].map((m) => m.index);
    const first = pipes(lines[0]);
    for (const line of lines) assert.deepEqual(pipes(line), first, line);
    assert.match(lines[1], /^\|-+(\|-+)*\|$/);
  }
});

test("every model listing request carries a timeout signal", async () => {
  const unsignalled = [];
  await GENERATORS["artcraft-models"](async (url, init = {}) => {
    if (!(init.signal instanceof AbortSignal)) unsignalled.push(url);
    return fakeFetch(url);
  });
  assert.deepEqual(unsignalled, []);
});

test("a hung model listing is aborted", { timeout: 5_000 }, async () => {
  const hanging = (_url, init = {}) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal.reason), { once: true });
    });
  await assert.rejects(GENERATORS["artcraft-models"](hanging, { timeoutMs: 50 }), /timed? ?out|abort/i);
});

test("the checker's generated ids match the generators", () => {
  assert.deepEqual([...GENERATED_IDS].sort(), Object.keys(GENERATORS).sort());
});

test("fails loudly on a bad response", async () => {
  await assert.rejects(GENERATORS["artcraft-models"](async () => new Response("nope", { status: 500 })), /HTTP 500/);
  await assert.rejects(GENERATORS["artcraft-models"](async () => new Response("{}")), /unexpected shape/);
});
