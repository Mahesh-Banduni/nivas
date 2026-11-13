import { sceneForKey, PropertyArt, toneForKey } from "./property-art";
import { cn } from "@/lib/cn";

/**
 * Renders an uploaded R2 image when available, otherwise the deterministic
 * illustration for that listing. Seeded listings have no binary assets, which
 * keeps the demo fully offline and fast.
 */
export function ArtImage({
  url,
  r2Key,
  type,
  alt,
  className,
  priority = false,
}: {
  url?: string | null;
  r2Key?: string | null;
  type?: string | null;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt ?? ""}
        className={cn("object-cover", className)}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  const scene = sceneForKey(r2Key, type);
  return (
    <PropertyArt
      scene={scene}
      tone={toneForKey(r2Key ?? type ?? "stay")}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
