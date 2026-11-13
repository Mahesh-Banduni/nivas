import type { CSSProperties, ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4.5 4.5" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21v-1a7.5 7.5 0 0 1 15 0v1" />
    </>
  ),
  home: <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </>
  ),
  message: <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.5-.7L3 21l1.3-4.4A8.4 8.4 0 1 1 21 11.5Z" />,
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <circle cx="17" cy="14.5" r="1.2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  shield: <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6Z" />,
  sliders: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h13M21 12h-1" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8Z" />,
  bed: <path d="M3 18v-7h18v7M3 18v3M21 18v3M3 11V7M7 11V9h4v2" />,
  bath: (
    <>
      <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" />
      <path d="M6 12V6a2 2 0 0 1 4 0M8 21l-1 1M16 21l1 1" />
    </>
  ),
  guests: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9.5" r="2.5" />
      <path d="M14.5 20a5 5 0 0 1 6.5-4.8" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  "arrow-right": <path d="M4 12h16M14 6l6 6-6 6" />,
  "arrow-left": <path d="M20 12H4M10 6l-6 6 6 6" />,
  "arrow-up-right": <path d="M7 17 17 7M8 7h9v9" />,
  check: <path d="M20 6 9 17l-5-5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  wifi: (
    <>
      <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  pool: (
    <>
      <path d="M2 16c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 20c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
      <path d="M7 13V5.5A1.5 1.5 0 0 1 8.5 4h1M7 8h4M16 13V5.5A1.5 1.5 0 0 1 17.5 4h1" />
    </>
  ),
  kitchen: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 11h16M8 4v16" />
      <circle cx="14" cy="7.5" r="1" />
      <circle cx="17" cy="7.5" r="1" />
    </>
  ),
  ac: (
    <>
      <rect x="3" y="5" width="18" height="8" rx="2" />
      <path d="M7 17c1.5-2 3-2 4.5 0M14 17c1.5-2 3-2 4.5 0M7 20c1.5-2 3-2 4.5 0" />
    </>
  ),
  parking: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
    </>
  ),
  workspace: (
    <>
      <rect x="3" y="5" width="18" height="11" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  breakfast: (
    <>
      <path d="M5 8h11v6a5 5 0 0 1-11 0Z" />
      <path d="M16 9h2a2.5 2.5 0 0 1 0 5h-2M4 21h14M8 5c0-1 1-1.5 1-2.5M12 5c0-1 1-1.5 1-2.5" />
    </>
  ),
  beach: (
    <>
      <path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z" />
      <path d="M12 12v7M8 21h8" />
    </>
  ),
  mountain: (
    <>
      <path d="M3 19h18L14.5 7l-3 5-2-2Z" />
      <circle cx="18" cy="6" r="2" />
    </>
  ),
  fireplace: (
    <>
      <path d="M4 20V9h16v11M2 20h20" />
      <path d="M12 17c2 0 3-1.3 3-3 0-1.7-2-3-3-5-1 2-3 3.3-3 5 0 1.7 1 3 3 3Z" />
    </>
  ),
  pet: (
    <>
      <circle cx="7" cy="9" r="1.8" />
      <circle cx="12" cy="6.5" r="1.8" />
      <circle cx="17" cy="9" r="1.8" />
      <path d="M12 11c3 0 5.5 2.4 5.5 4.8A3.2 3.2 0 0 1 14.3 19c-1 0-1.6-.4-2.3-.4s-1.3.4-2.3.4a3.2 3.2 0 0 1-3.2-3.2C6.5 13.4 9 11 12 11Z" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M9 21h6" />
    </>
  ),
  washer: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <circle cx="12" cy="13" r="4" />
      <circle cx="8" cy="7" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  garden: (
    <>
      <path d="M12 21V9" />
      <path d="M12 9c0-4 3-6 7-6 0 4-3 6-7 6ZM12 14c0-4-3-6-7-6 0 4 3 6 7 6Z" />
    </>
  ),
  bonfire: (
    <>
      <path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 2 2 2 4" />
      <path d="M4 21l16-4M4 17l16 4" />
    </>
  ),
  gym: <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />,
  power: <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />,
  water: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3l1.4 4.1L17.5 9l-4.1 1.9L12 15l-1.4-4.1L6.5 9l4.1-1.9Z" />
      <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  phone: <path d="M7 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4 5.2 2 2 0 0 1 6 3Z" />,
  "credit-card": (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.8 20h18.4Z" />
      <path d="M12 10v4M12 17.2v.3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  filter: <path d="M4 7h16M7 12h10M10 17h4" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  edit: <path d="M4 20h4L20 8l-4-4L4 16Z" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M4 18l5-5 4 4 3-2 4 3" />
    </>
  ),
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  refresh: <path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />,
  "trend-up": <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  key: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l9 9M17 17l2-2M14 14l2-2" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5.5 4h13l2.5 9v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Z" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </>
  ),
  leaf: <path d="M4 20c0-9 5-14 16-16-1 11-6 16-16 16ZM4 20c2-5 5-8 9-10" />,
  "arrow-down": <path d="M12 4v16M6 14l6 6 6-6" />,
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
  "building-2": (
    <>
      <path d="M4 20h16v-4H4v4Z" />
      <path d="M8 12h2v8H8ZM14 12h2v8h-2Z" />
      <path d="M6 20V8h16v12" />
    </>
  ),
  "badge-check": (
    <>
      <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  "alert-circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 4v5h5M20 20v-5h-5" />
      <path d="M4 4l6 6M20 20l-6-6" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6l-12 12" />,
};

export type IconName = keyof typeof PATHS | (string & {});

export function Icon({
  name,
  size = 18,
  className = "",
  strokeWidth = 1.5,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  const content = PATHS[name] ?? PATHS.dot;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}

export function Stars({
  rating,
  size = 14,
  className = "",
  max = 5,
}: {
  rating: number;
  size?: number;
  className?: string;
  max?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-[2px] ${className}`} aria-label={`${rating} out of ${max}`}>
      {Array.from({ length: max }).map((_, index) => {
        const filled = rating >= index + 0.75;
        const half = !filled && rating >= index + 0.25;
        return (
          <svg key={index} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8Z"
              fill={filled ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.4"
              opacity={filled || half ? 1 : 0.35}
            />
            {half && (
              <path
                d="M12 3.5v14.6l-4.2 2.2 1-5.9-4.3-4.1 5.9-.8Z"
                fill="currentColor"
                stroke="none"
              />
            )}
          </svg>
        );
      })}
    </span>
  );
}

export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="var(--color-pine)" />
      <path
        d="M12 28V17.6c0-3.2 2.6-5.8 5.8-5.8h4.4c3.2 0 5.8 2.6 5.8 5.8V28"
        stroke="#F6F1E6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M17 28v-5.4a3 3 0 0 1 6 0V28" stroke="#F6F1E6" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 12.6 20 7l8 5.6" stroke="#C9A227" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
