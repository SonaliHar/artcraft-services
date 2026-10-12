import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RevealManager from "@/components/reveal-manager";
import { SectionShell } from "@/components/landing/section-shell";
import { ArticleBody, BackLink, PageHeader } from "@/components/page/page-header";
import DocsSidebar from "@/components/docs/docs-sidebar";
import {
  docEditUrl,
  docHref,
  findDocPage,
  getDocApp,
  getDocApps,
  getDocNav,
  rawHref,
  renderDocPage,
} from "@/lib/docs";

type Params = Promise<{ app: string; slug?: string[] }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return getDocApps().flatMap((app) =>
    app.pages.map((page) => ({ app: app.slug, slug: page.urlPath ? page.urlPath.split("/") : [] })),
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { app: slug, slug: path } = await params;
  const app = getDocApp(slug);
  const page = app && findDocPage(app, path);
  if (!app || !page) return {};
  return {
    title: page.urlPath ? `${page.title} · ${app.name} docs` : page.title,
    description: page.description,
    alternates: { canonical: docHref(app.slug, page.urlPath) },
  };
}

export default async function DocsPage({ params }: { params: Params }) {
  const { app: slug, slug: path } = await params;
  const app = getDocApp(slug);
  const page = app && findDocPage(app, path);
  if (!app || !page) notFound();

  const { html } = await renderDocPage(app, page);
  const href = docHref(app.slug, page.urlPath);

  return (
    <>
      <RevealManager />
      <PageHeader index="01" label="Docs" annotation={app.name} title={page.title} lede={page.description}>
        <div className="mt-8">
          <BackLink href="/docs">All docs</BackLink>
        </div>
      </PageHeader>
      <SectionShell>
        <div className="grid md:grid-cols-[16rem_minmax(0,1fr)]">
          <DocsSidebar nav={getDocNav(app)} currentHref={href} />
          <div>
            <ArticleBody html={html} />
            <footer className="hud-label mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-6 pb-12 text-muted md:px-10">
              <a href={docEditUrl(app, page)} className="hover:text-ink">Edit on GitHub</a>
              <a href={rawHref(app.slug, page.file)} className="hover:text-ink">Markdown</a>
              {page.verified && <span>Checked against v{page.verified}</span>}
              {app.sha && (
                <a href={`https://github.com/${app.repo}/commit/${app.sha}`} className="hover:text-ink">
                  Source {app.sha.slice(0, 7)}
                </a>
              )}
            </footer>
          </div>
        </div>
      </SectionShell>
    </>
  );
}
