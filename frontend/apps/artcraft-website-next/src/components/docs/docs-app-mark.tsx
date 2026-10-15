import { twMerge } from "tailwind-merge";
import { ColorAccent } from "@/components/apps/app-wordmark";
import type { CraftApp } from "@/lib/crafting-apps";
import type { DocAppIcon } from "@/lib/docs";

// An app's icon in docs, sized by the caller (40px by default). Decorative:
// the app's name always sits beside it, so alt is empty. Explicit width and
// height reserve the box before the file loads.
//
// A Craft app's tile is the rounded engraved-animal square from /apps, with
// a drop shadow that follows its transparent corners, scaled down from
// AppIcon's. The ArtCraft "A" is a bare glyph, inset so it reads at the same
// optical size as a tile: in theme ink for ArtCraft, untouched blue for the
// launcher (its own app icon). A source without an icon gets a monogram.
export default function DocsAppMark({
  name,
  icon,
  className,
}: {
  name: string;
  icon: DocAppIcon | null;
  className?: string;
}) {
  if (icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon.src}
        alt=""
        width={48}
        height={48}
        decoding="async"
        className={twMerge(
          "h-10 w-10 shrink-0",
          // The inset is a scale, not padding, so it stays proportional at
          // every size the caller picks.
          icon.kind === "tile" ? "drop-shadow-[0_3px_7px_rgba(0,0,0,0.26)]" : "scale-[0.84] object-contain",
          icon.kind === "ink" && "themed-logo",
          className,
        )}
      />
    );
  }
  const letters = name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .map((word) => word[0])
    .slice(-2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      data-monogram
      className={twMerge(
        "flex h-10 w-10 shrink-0 items-center justify-center border border-line-strong bg-bg-sunken font-mono text-xs font-medium tracking-[0.08em] text-ink",
        className,
      )}
    >
      {letters}
    </span>
  );
}

// The app's name as text. A Craft app's name is its wordmark, "Craft" in the
// app's ink as on /apps (needs an appThemeClass ancestor); others read plain.
export function DocsAppName({ name, craft }: { name: string; craft?: CraftApp }) {
  if (!craft) return <>{name}</>;
  return (
    <>
      {craft.prefix}
      <ColorAccent>Craft</ColorAccent>
    </>
  );
}
