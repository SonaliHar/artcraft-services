import Link from "next/link";

export type Crumb = { title: string; href?: string; current?: boolean; app?: boolean };

// HUD-voice trail above a docs title: Docs / ArtCraft / Troubleshooting.
// Folders without an index page show as plain text. The app's crumb takes the
// app's ink inside a Craft app's docs (muted, like the rest, elsewhere).
export default function DocsBreadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="hud-label flex flex-wrap items-center gap-y-1 text-muted">
        {crumbs.map((crumb, index) => (
          <li key={`${index}-${crumb.title}`} className="flex items-center">
            {index > 0 && (
              <span aria-hidden className="mx-2 text-faint">
                /
              </span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                aria-current={crumb.current ? "page" : undefined}
                className={`group/crumb -mx-1 inline-flex ${crumb.app ? "text-(--app-ink,var(--muted))" : ""}`}
              >
                <span className="px-1 py-0.5 group-hover/crumb:bg-invert-bg group-hover/crumb:text-invert-fg">{crumb.title}</span>
              </Link>
            ) : (
              <span className="text-faint">{crumb.title}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
