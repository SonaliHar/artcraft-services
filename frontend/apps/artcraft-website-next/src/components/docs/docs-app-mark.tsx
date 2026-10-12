import { twMerge } from "tailwind-merge";

// An app's icon in docs: its image when it has one, otherwise a mono
// monogram in a hairline square. Decorative; the app name always sits beside it.
export default function DocsAppMark({
  name,
  icon,
  className,
}: {
  name: string;
  icon: { src: string; themed: boolean } | null;
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
        className={twMerge("h-10 w-10 shrink-0 object-contain", icon.themed && "themed-logo p-1", className)}
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
      className={twMerge(
        "flex h-10 w-10 shrink-0 items-center justify-center border border-line-strong bg-bg-sunken font-mono text-xs font-medium tracking-[0.08em] text-ink",
        className,
      )}
    >
      {letters}
    </span>
  );
}
