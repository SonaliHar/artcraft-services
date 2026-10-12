import type { Metadata } from "next";
import Link from "next/link";
import RevealManager from "@/components/reveal-manager";
import { SectionShell } from "@/components/landing/section-shell";
import { Accent, PageHeader } from "@/components/page/page-header";
import DocsSearch from "@/components/docs/docs-search";
import { docHref, getDocApps } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Docs",
  description: "How to install, use and fix ArtCraft and the Craft apps.",
  alternates: { canonical: "/docs" },
};

export default function DocsHome() {
  const apps = getDocApps();
  return (
    <>
      <RevealManager />
      <PageHeader
        index="01"
        label="Docs"
        title={<>Craft <Accent>docs</Accent></>}
        lede="How to install, use and fix ArtCraft and the Craft apps. Written in each app's repo, so it changes with the app."
      />
      <SectionShell>
        <div className="px-6 py-12 md:px-10">
          <div className="mb-10"><DocsSearch /></div>
          {apps.length === 0 ? (
            <p className="text-muted">Docs are on their way.</p>
          ) : (
            <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => {
                const home = app.pages.find((page) => page.urlPath === "");
                return (
                  <li key={app.slug} className="bg-bg">
                    <Link href={docHref(app.slug, "")} className="block h-full p-6 hover:bg-bg-sunken">
                      <span className="font-display text-xl text-ink-strong">{app.name}</span>
                      {home && <p className="mt-2 text-sm text-muted">{home.description}</p>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SectionShell>
    </>
  );
}
