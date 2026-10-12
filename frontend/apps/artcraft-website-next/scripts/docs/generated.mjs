// Content generated at build time and spliced into pages at
// `<!-- generated:<id> -->` markers. Each generator returns Markdown.

const MODELS_API = "https://api.storyteller.ai/v1/omni_gen/models";

async function listing(fetchImpl, kind) {
  const res = await fetchImpl(`${MODELS_API}/${kind}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${kind} model listing: HTTP ${res.status}`);
  const body = await res.json();
  if (!body.success || !Array.isArray(body.models)) {
    throw new Error(`${kind} model listing: unexpected shape`);
  }
  // The API repeats some ids and keeps retired models flagged is_disabled.
  const seen = new Set();
  return body.models.filter((m) => {
    if (!m.model || m.is_disabled || seen.has(m.model)) return false;
    seen.add(m.model);
    return true;
  });
}

const cell = (value) => String(value).replace(/\|/g, "\\|");
const yes = (flag) => (flag ? "Yes" : "–");
const upTo = (supported, max) => (supported ? (max ? `Up to ${max}` : "Yes") : "–");

function duration(m) {
  const options = Array.isArray(m.duration_seconds_options) ? m.duration_seconds_options : [];
  const min = options.length ? Math.min(...options) : m.duration_seconds_min;
  const max = options.length ? Math.max(...options) : m.duration_seconds_max;
  if (min == null || max == null) return "–";
  return min === max ? `${min} s` : `${min}–${max} s`;
}

// Model creator is left out on purpose: the listing reports the serving
// provider for some models (e.g. Nano Banana shows "artcraft").
async function artcraftModels(fetchImpl) {
  const [image, video] = await Promise.all([listing(fetchImpl, "image"), listing(fetchImpl, "video")]);
  return [
    "### Image models",
    "",
    "| Model | Images per run | Reference images |",
    "| --- | --- | --- |",
    ...image.map((m) => `| ${cell(m.full_name || m.model)} | ${m.batch_size_max ?? "–"} | ${upTo(m.image_refs_supported, m.image_refs_max)} |`),
    "",
    "### Video models",
    "",
    "| Model | Length | Start frame | End frame | Reference images |",
    "| --- | --- | --- | --- | --- |",
    ...video.map((m) => `| ${cell(m.full_name || m.model)} | ${duration(m)} | ${yes(m.starting_keyframe_supported)} | ${yes(m.ending_keyframe_supported)} | ${upTo(m.image_references_supported, m.image_references_max)} |`),
  ].join("\n");
}

export const GENERATORS = { "artcraft-models": artcraftModels };
