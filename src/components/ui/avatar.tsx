import { cn } from "@/lib/cn";

export function initials(name?: string | null): string {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "N";
}

export function Avatar({
  name,
  color = "#234A3D",
  size = 36,
  className,
}: {
  name?: string | null;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium text-cream", className)}
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.max(10, Math.round(size * 0.34)),
        letterSpacing: "0.02em",
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  size = 28,
}: {
  people: Array<{ name: string; color?: string }>;
  size?: number;
}) {
  return (
    <div className="flex items-center">
      {people.map((person, index) => (
        <span
          key={`${person.name}-${index}`}
          className="-ml-1.5 rounded-full ring-2 ring-cream first:ml-0"
          style={{ zIndex: people.length - index }}
        >
          <Avatar name={person.name} color={person.color} size={size} />
        </span>
      ))}
    </div>
  );
}
