import { sceneForKey, PropertyArt, toneForKey } from "./property-art";
import { cn } from "@/lib/cn";

/**
 * Renders an uploaded image when available, otherwise the deterministic
 * illustration for that listing. Seeded listings have no binary assets, which
 * keeps the demo fully offline and fast.
 */
export function ArtImage({
  url,
  mediaKey,
  type,
  alt,
  className,
  priority = false,
}: {
  url?: string | null;
  mediaKey?: string | null;
  type?: string | null;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  const imageUrl = url ?? (mediaKey?.startsWith("properties/") ? `/api/media/${mediaKey}` : null);
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt ?? ""}
        className={cn("object-cover", className)}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  const scene = sceneForKey(mediaKey, type);
  return (
    <PropertyArt
      scene={scene}
      tone={toneForKey(mediaKey ?? type ?? "stay")}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
