import { getDocApp, getDocApps, rawDocMarkdown, supportSkillMarkdown } from "@/lib/docs";

// Serves /docs/<app>/<file>.md (rewritten here in next.config.ts) and the
// support skill at /docs/agents/support.md.

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = Promise<{ app: string; file: string[] }>;

export function generateStaticParams() {
  return [
    { app: "agents", file: ["support.md"] },
    ...getDocApps().flatMap((app) => app.pages.map((page) => ({ app: app.slug, file: page.file.split("/") }))),
  ];
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const { app: slug, file } = await params;
  const path = file.join("/");
  let text: string | null = null;
  if (slug === "agents" && path === "support.md") {
    text = supportSkillMarkdown();
  } else {
    const app = getDocApp(slug);
    const page = app?.pages.find((p) => p.file === path);
    if (app && page) text = rawDocMarkdown(app, page);
  }
  if (text === null) return new Response("Not found\n", { status: 404 });
  return new Response(text, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
