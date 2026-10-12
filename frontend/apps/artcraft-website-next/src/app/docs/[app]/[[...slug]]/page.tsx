import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RevealManager from "@/components/reveal-manager";
import { SectionShell } from "@/components/landing/section-shell";
import { ArticleBody } from "@/components/page/page-header";
import { appThemeClass } from "@/components/apps/app-wordmark";
import DocsAppMark, { DocsAppName } from "@/components/docs/docs-app-mark";
import DocsBreadcrumbs, { type Crumb } from "@/components/docs/docs-breadcrumbs";
import DocsCodeCopy from "@/components/docs/docs-code-copy";
import DocsHeadingLinks from "@/components/docs/docs-heading-links";
import DocsPageActions from "@/components/docs/docs-page-actions";
import { siteUrl } from "@/lib/links";
import { DocsMenuDisclosure, DocsTocDisclosure } from "@/components/docs/docs-mobile-nav";
import DocsPager from "@/components/docs/docs-pager";
import DocsSidebar from "@/components/docs/docs-sidebar";
import DocsToc from "@/components/docs/docs-toc";
import {
  docAppIcon,
  docCraftApp,
  docEditUrl,
  docHref,
  findDocPage,
  getDocApp,
  getDocApps,
  getDocNav,
  getDocPager,
  getNavPath,
  rawHref,
  readingMinutes,
  renderDocPage,
} from "@/lib/docs";

type Params = Promise<{ app: string; slug?: string[] }>;

export const dynamicParams = false;

// Shared column template so header and body rails line up:
// sidebar | article | table of contents.
const COLUMNS = "md:grid-cols-[16.5rem_minmax(0,1fr)] xl:grid-cols-[16.5rem_minmax(0,1fr)_14.5rem]";
// The rails stick below the 48px site nav and scroll on their own when long.
const RAIL = "sticky top-12 max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain";

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

  const { html, headings } = await renderDocPage(app, page);
  const href = docHref(app.slug, page.urlPath);
  const appHome = docHref(app.slug, "");
  const nav = getDocNav(app);
  const navPath = getNavPath(nav, href);
  const { prev, next } = getDocPager(app, href);
  const crumbs: Crumb[] = [
    { title: "Docs", href: "/docs" },
    { title: app.name, href: appHome, current: href === appHome, app: true },
    ...navPath.slice(0, -1).map((node) => ({ title: node.title, href: node.href })),
  ];
  const section = navPath[0]?.title ?? page.title;
  const minutes = readingMinutes(page);
  // A Craft app's pages wear its color: the theme class sets --app/--app-ink,
  // which the docs accents read with the site blue as fallback, so ArtCraft
  // and the launcher stay blue.
  const craft = docCraftApp(app);
  const icon = docAppIcon(app);

  return (
    <div className={craft ? appThemeClass(craft) : undefined}>
      <RevealManager />

      <SectionShell className="docs-ruler-safe">
        <header className={`grid ${COLUMNS}`}>
          <div className="hidden border-r border-line px-6 py-10 md:block md:py-14">
            {/* The app's lockup: its icon at the size /apps cards use, the
                wordmark under it, then the "Docs" label. */}
            <Link href={appHome} className="group flex flex-col items-start gap-4">
              <DocsAppMark name={app.name} icon={icon} className="h-14 w-14" />
              <span className="min-w-0">
                <span className="block font-display text-xl leading-tight tracking-[-0.03em] text-ink-strong group-hover:text-(--app-ink,var(--accent-ink))">
                  <DocsAppName name={app.name} craft={craft} />
                </span>
                <span className="hud-label block text-faint">Docs</span>
              </span>
            </Link>
          </div>
          <div className="px-6 py-10 md:px-10 md:py-14">
            <DocsBreadcrumbs crumbs={crumbs} />
            <h1 className="mt-6 max-w-3xl font-display [overflow-wrap:anywhere] text-[2.125rem] leading-[1.04] tracking-[-0.035em] text-ink-strong sm:text-5xl">
              {page.title}
            </h1>
            {page.description && (
              <p className="mt-5 max-w-[62ch] text-lg [overflow-wrap:anywhere] leading-relaxed text-muted">{page.description}</p>
            )}
            <div className="mt-8">
              <DocsPageActions url={siteUrl(href)} markdownHref={rawHref(app.slug, page.file)} />
            </div>
          </div>
          <dl className="hidden content-start gap-4 border-l border-line px-6 py-10 md:py-14 xl:grid">
            <div>
              <dt className="hud-label text-faint">Reading</dt>
              <dd className="mt-1 font-mono text-sm text-ink">{minutes} min</dd>
            </div>
            {page.verified && (
              <div>
                <dt className="hud-label text-faint">Checked</dt>
                <dd className="mt-1 font-mono text-sm text-ink">v{page.verified}</dd>
              </div>
            )}
          </dl>
        </header>
      </SectionShell>

      <SectionShell className="docs-ruler-safe">
        <div className={`grid ${COLUMNS}`}>
          <aside className="hidden border-r border-line md:block">
            <DocsSidebar nav={nav} currentHref={href} />
          </aside>

          <div className="min-w-0">
            <DocsMenuDisclosure
              nav={nav}
              currentHref={href}
              section={section}
              mark={<DocsAppMark name={app.name} icon={icon} className="h-5 w-5 drop-shadow-none" />}
              className="md:hidden"
            />
            <DocsTocDisclosure headings={headings} className="xl:hidden" />
            <div className="docs-article relative">
              <ArticleBody html={html} />
              <DocsHeadingLinks key={`links-${href}`} />
              <DocsCodeCopy key={`code-${href}`} />
              <span id="docs-article-end" aria-hidden className="block h-px" />
              <footer className="hud-label flex flex-wrap gap-x-6 gap-y-2 px-6 pb-12 text-muted md:px-10">
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
            <DocsPager prev={prev} next={next} />
          </div>

          <aside className="hidden border-l border-line xl:block">
            <DocsToc headings={headings} className={`${RAIL} docs-rail px-6 py-8`} />
          </aside>
        </div>
      </SectionShell>
    </div>
  );
}
