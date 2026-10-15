import { getDocApp, getDocApps, llmsFullText } from "@/lib/docs";

export const dynamic = "force-static";
export const dynamicParams = false;

type Params = Promise<{ app: string }>;

export function generateStaticParams() {
  return getDocApps().map((app) => ({ app: app.slug }));
}

export async function GET(_request: Request, { params }: { params: Params }) {
  const app = getDocApp((await params).app);
  if (!app) return new Response("Not found\n", { status: 404 });
  return new Response(llmsFullText(app), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
