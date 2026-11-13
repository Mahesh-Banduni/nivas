import { cn } from "@/lib/cn";

export function ArtImage({
  url,
  mediaKey,
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

  return (
    <div className={cn("h-full w-full bg-sand", className)} role={alt ? "img" : undefined} aria-label={alt} />
  );
}
