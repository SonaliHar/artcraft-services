import { test } from "node:test";
import assert from "node:assert/strict";
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

test("builds image and video tables, deduped, without disabled models, with escaped cells", async () => {
  const md = await GENERATORS["artcraft-models"](fakeFetch);
  assert.match(md, /### Image models/);
  assert.match(md, /\| Nano Banana \| 4 \| Up to 6 \|/);
  assert.match(md, /\| A \\\| B \| 1 \| – \|/);
  assert.equal(md.match(/Kling 1\.6 Pro/g).length, 1);
  assert.doesNotMatch(md, /Old Model/);
  assert.match(md, /\| Kling 1\.6 Pro \| 5–10 s \| Yes \| – \| – \|/);
  assert.match(md, /\| Veo 3 \| 8 s \| Yes \| – \| Up to 3 \|/);
});

test("fails loudly on a bad response", async () => {
  await assert.rejects(GENERATORS["artcraft-models"](async () => new Response("nope", { status: 500 })), /HTTP 500/);
  await assert.rejects(GENERATORS["artcraft-models"](async () => new Response("{}")), /unexpected shape/);
});
