import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
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
  type DocPage,
  getCommonFixes,
  getDocNav,
  getTroubleshootingHref,
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
  const fixes = apps
    .map((app) => ({ app, pages: getCommonFixes(app), allHref: getTroubleshootingHref(app) }))
    .filter((group) => group.pages.length > 0);

  return (
    <>
      <RevealManager />
      <PageHeader
        className="docs-ruler-safe"
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
        <SectionShell className="docs-ruler-safe">
          <p className="px-6 py-12 text-muted md:px-10">Docs are on their way.</p>
        </SectionShell>
      ) : (
        <>
          <SectionShell className="docs-ruler-safe">
            <SectionEyebrow index="02" label="Apps" annotation="Pick an app" />
            <ul className="grid gap-px bg-line md:grid-cols-2">
              {apps.map((app) => (
                <AppCard key={app.slug} app={app} />
              ))}
            </ul>
          </SectionShell>

          {fixes.length > 0 && (
            <SectionShell className="docs-ruler-safe">
              <SectionEyebrow index="03" label="Common fixes" annotation="Find your symptom" />
              <ul className="grid pb-8 md:grid-cols-2 md:pb-10">
                {fixes.map((group, index) => (
                  <FixGroup key={group.app.slug} {...group} column={index % 2 === 0 ? "left" : "right"} />
                ))}
              </ul>
            </SectionShell>
          )}
        </>
      )}
    </>
  );
}

// One app's common fixes: a heading with its mark, its specific symptoms as
// rows (the same rows as the app cards' section lists), then a link to the
// whole troubleshooting folder. Three subgrid rows, so groups side by side
// line up their lists and their footers.
//
// Apps are set apart the way the site sets sections apart, not with boxes:
// a band of empty paper between group rows, crossed only by the section's
// side rails; a strong rule opens each group, and crosshair ticks mark
// where that rule meets the rails and the column divider. Inside a group
// the rules stay hairlines.
function FixGroup({
  app,
  pages,
  allHref,
  column,
}: {
  app: DocApp;
  pages: DocPage[];
  allHref: string | null;
  column: "left" | "right";
}) {
  const craft = docCraftApp(app);
  return (
    <li
      className={`relative mt-8 flex flex-col border-y border-t-line-strong border-b-line bg-bg md:row-span-3 md:mt-10 md:grid md:grid-rows-subgrid ${
        column === "left" ? "md:border-r md:border-r-line" : ""
      } ${themeOf(app)}`}
    >
      <span aria-hidden className="tick -top-[6px] -left-[6px]" />
      {/* Phones stack every group, so each one marks both rails; side by
          side, the left group's right tick would sit on the right group's
          left tick, so only the right column draws it. */}
      <span aria-hidden className={`tick -top-[6px] -right-[6px] ${column === "left" ? "md:hidden" : ""}`} />
      <h2 className="flex items-center gap-3 px-6 pt-6 pb-5 md:px-10 md:pt-7">
        <DocsAppMark name={app.name} icon={docAppIcon(app)} className="h-7 w-7 drop-shadow-none" />
        <span className="font-display text-xl leading-tight tracking-[-0.025em] text-ink-strong">
          <DocsAppName name={app.name} craft={craft} />
        </span>
      </h2>
      <ul className="border-t border-line">
        {pages.map((page) => (
          <li key={page.urlPath} className="border-b border-line last:border-b-0">
            <Link
              href={docHref(app.slug, page.urlPath)}
              className="block px-6 py-3 text-sm leading-snug text-ink hover:bg-bg-sunken hover:text-(--app-ink,var(--accent-ink)) focus-visible:-outline-offset-2 md:px-10"
            >
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
      {allHref ? (
        <Link
          href={allHref}
          className="hud-label group/all flex items-center gap-1.5 border-t border-line px-6 py-4 text-(--app-ink,var(--accent-ink)) hover:bg-bg-sunken focus-visible:-outline-offset-2 md:px-10"
        >
          All {app.name} troubleshooting
          <ArrowRightIcon aria-hidden className="h-3.5 w-3.5 transition-transform duration-150 group-hover/all:translate-x-0.5" />
        </Link>
      ) : (
        // Keeps the footer row's hairline continuous next to a group that has one.
        <span aria-hidden className="border-t border-line" />
      )}
    </li>
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
