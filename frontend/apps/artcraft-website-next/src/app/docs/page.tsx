import type { Metadata } from "next";
import Link from "next/link";
import RevealManager from "@/components/reveal-manager";
import { SectionEyebrow, SectionShell } from "@/components/landing/section-shell";
import { Accent, PageHeader } from "@/components/page/page-header";
import { appThemeClass } from "@/components/apps/app-wordmark";
import DocsAppMark, { DocsAppName } from "@/components/docs/docs-app-mark";
import DocsSearch from "@/components/docs/docs-search";
import {
  type DocApp,
  type NavNode,
  docAppIcon,
  docCraftApp,
  docHref,
  getDocApps,
  getDocNav,
  getTroubleshootingPages,
} from "@/lib/docs";

export const metadata: Metadata = {
  title: "Docs",
  description: "How to install, use and fix ArtCraft and the Craft apps.",
  alternates: { canonical: "/docs" },
};

// Pages in a sidebar section, counting the section's own index page.
const countPages = (node: NavNode): number =>
  (node.href ? 1 : 0) + node.children.reduce((sum, child) => sum + countPages(child), 0);

export default function DocsHome() {
  const apps = getDocApps();
  const pageCount = apps.reduce((sum, app) => sum + app.pages.length, 0);
  const fixes = apps.flatMap((app) => getTroubleshootingPages(app).map((page) => ({ app, page })));

  return (
    <>
      <RevealManager />
      <PageHeader
        index="01"
        label="Docs"
        annotation={apps.length > 0 ? `${apps.length} apps · ${pageCount} pages` : undefined}
        title={
          <>
            Craft <Accent>docs</Accent>
          </>
        }
        lede="How to install, use and fix ArtCraft and the Craft apps. Written in each app's repo, so it changes with the app."
      >
        <div className="mt-10 max-w-2xl">
          <DocsSearch />
        </div>
      </PageHeader>

      {apps.length === 0 ? (
        <SectionShell>
          <p className="px-6 py-12 text-muted md:px-10">Docs are on their way.</p>
        </SectionShell>
      ) : (
        <>
          <SectionShell>
            <SectionEyebrow index="02" label="Apps" annotation="Pick an app" />
            <ul className="grid gap-px bg-line md:grid-cols-2">
              {apps.map((app) => (
                <AppCard key={app.slug} app={app} />
              ))}
            </ul>
          </SectionShell>

          {fixes.length > 0 && (
            <SectionShell>
              <SectionEyebrow index="03" label="Common fixes" annotation="Find your symptom" />
              <ul className="grid gap-px bg-line md:grid-cols-2">
                {fixes.map(({ app, page }) => (
                  <li key={`${app.slug}/${page.urlPath}`} className={`bg-bg ${themeOf(app)}`}>
                    <Link
                      href={docHref(app.slug, page.urlPath)}
                      className="group flex h-full flex-col gap-2 px-6 py-5 hover:bg-bg-sunken focus-visible:-outline-offset-2 md:px-10 md:py-6"
                    >
                      <span className="hud-label text-(--app-ink,var(--faint))">{app.name}</span>
                      <span className="font-medium leading-snug text-ink-strong group-hover:text-(--app-ink,var(--accent-ink))">
                        {page.title}
                      </span>
                      {page.description && (
                        <span className="text-sm leading-relaxed text-muted">{page.description}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </SectionShell>
          )}
        </>
      )}
    </>
  );
}

// A Craft app's card wears its color (see the docs article page).
function themeOf(app: DocApp): string {
  const craft = docCraftApp(app);
  return craft ? appThemeClass(craft) : "";
}

// Each card spans two rows of the parent grid (header, section list) through
// a subgrid, so side-by-side cards start their lists on the same line however
// their descriptions wrap.
function AppCard({ app }: { app: DocApp }) {
  const home = app.pages.find((page) => page.urlPath === "");
  const sections = getDocNav(app).filter((node) => node.href !== docHref(app.slug, ""));
  return (
    <li className={`flex flex-col bg-bg md:row-span-2 md:grid md:grid-rows-subgrid ${themeOf(app)}`}>
      <Link
        href={docHref(app.slug, "")}
        className="group flex items-start gap-4 px-6 pt-8 pb-6 hover:bg-bg-sunken focus-visible:-outline-offset-2 md:px-10"
      >
        <DocsAppMark name={app.name} icon={docAppIcon(app)} className="h-12 w-12" />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-4">
            <span className="font-display text-2xl leading-tight tracking-[-0.03em] text-ink-strong group-hover:text-(--app-ink,var(--accent-ink))">
              <DocsAppName name={app.name} craft={docCraftApp(app)} />
            </span>
            <span className="hud-label shrink-0 text-faint">{app.pages.length} pages</span>
          </span>
          {home?.description && <span className="mt-2 block leading-relaxed text-muted">{home.description}</span>}
        </span>
      </Link>
      {sections.length > 0 && (
        <ul className="border-t border-line">
          {sections.map((node, index) => {
            const count = countPages(node);
            const label = (
              <>
                <span>{node.title}</span>
                <span className="hud-label text-faint">{count}</span>
              </>
            );
            return (
              <li key={node.href ?? `label-${index}`} className="border-b border-line last:border-b-0">
                {node.href ? (
                  <Link
                    href={node.href}
                    className="flex items-center justify-between gap-4 px-6 py-3 text-sm text-muted hover:bg-bg-sunken hover:text-ink focus-visible:-outline-offset-2 md:px-10"
                  >
                    {label}
                  </Link>
                ) : (
                  <span className="flex items-center justify-between gap-4 px-6 py-3 text-sm text-muted md:px-10">
                    {label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
