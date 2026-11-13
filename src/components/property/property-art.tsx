import type { ReactNode } from "react";

/**
 * Editorial SVG illustrations used for seeded listings. Each scene shares one
 * drawing language (flat shapes, warm light, a single accent colour) so the
 * marketplace feels art-directed rather than full of stock photography.
 * Uploaded images render as <img> instead — see ArtImage.
 */

export type SceneName =
  | "villa"
  | "beach"
  | "haveli"
  | "cabin"
  | "apartment"
  | "suite"
  | "living"
  | "bedroom"
  | "kitchen"
  | "garden";

const TYPE_SCENES: Record<string, SceneName> = {
  villa: "villa",
  "beach house": "beach",
  heritage: "haveli",
  cabin: "cabin",
  apartment: "apartment",
  suite: "suite",
  studio: "apartment",
  farmhouse: "villa",
};

const GALLERY_SCENES: SceneName[] = ["villa", "living", "bedroom", "kitchen", "garden"];

export function sceneForType(type?: string | null): SceneName {
  return TYPE_SCENES[(type ?? "").toLowerCase()] ?? "villa";
}

const SCENE_NAMES = ["villa", "beach", "haveli", "cabin", "apartment", "suite", "living", "bedroom", "kitchen", "garden"];

export function sceneForKey(key: string | null | undefined, type?: string | null): SceneName {
  const base = sceneForType(type);
  if (!key) return base;
  const parts = key.split("/");
  const scene = parts[1] as SceneName;
  if (SCENE_NAMES.includes(scene)) return scene;
  // Seeded gallery keys look like seed/villa/3 — map the position to an
  // interior scene so a single listing has a varied gallery.
  const position = Number.parseInt(parts[parts.length - 1] ?? "", 10);
  if (Number.isFinite(position) && position > 0) {
    return galleryScenes(base)[(position - 1) % galleryScenes(base).length];
  }
  return base;
}

export function toneForKey(key?: string | null, fallback = 0): number {
  if (!key) return fallback;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 997;
  }
  return hash % 5;
}

export function galleryScenes(scene: SceneName): SceneName[] {
  const base = scene === "villa" || scene === "beach" || scene === "haveli" || scene === "cabin" || scene === "apartment" || scene === "suite" ? scene : "villa";
  return [base, "living", "bedroom", "kitchen", "garden"];
}

const ACCENTS = ["#BC6134", "#3C5A7A", "#7A4A63", "#2F5D50", "#A8854C"];

export function PropertyArt({
  scene = "villa",
  tone = 0,
  className = "",
  alt,
}: {
  scene?: SceneName;
  tone?: number;
  className?: string;
  alt?: string;
}) {
  const accent = ACCENTS[tone % ACCENTS.length];
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role={alt ? "img" : "presentation"}
      aria-label={alt}
      aria-hidden={alt ? undefined : true}
    >
      {renderScene(scene, accent)}
      <rect width="800" height="600" fill="url(#vn-vignette)" opacity="0.5" />
      <defs>
        <radialGradient id="vn-vignette" cx="50%" cy="42%" r="78%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#3A2E20" stopOpacity="0.22" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function renderScene(scene: SceneName, accent: string): ReactNode {
  switch (scene) {
    case "villa":
      return <Villa accent={accent} />;
    case "beach":
      return <Beach accent={accent} />;
    case "haveli":
      return <Haveli accent={accent} />;
    case "cabin":
      return <Cabin accent={accent} />;
    case "apartment":
      return <Apartment accent={accent} />;
    case "suite":
      return <Suite accent={accent} />;
    case "living":
      return <Living accent={accent} />;
    case "bedroom":
      return <Bedroom accent={accent} />;
    case "kitchen":
      return <Kitchen accent={accent} />;
    case "garden":
      return <Garden accent={accent} />;
    default:
      return <Villa accent={accent} />;
  }
}

function Sky({ from, to, id }: { from: string; to: string; id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
  );
}

function Palm({ x, y, scale = 1, flip = false }: { x: number; y: number; scale?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <path d="M0 0 C 6 -60 4 -120 -6 -190" stroke="#6B5844" strokeWidth="9" fill="none" strokeLinecap="round" />
      <g stroke="#3B6455" strokeWidth="7" fill="none" strokeLinecap="round">
        <path d="M-6 -190 C -50 -212 -74 -206 -92 -186" />
        <path d="M-6 -190 C -44 -232 -30 -252 -8 -262" />
        <path d="M-6 -190 C 30 -226 58 -218 76 -196" />
        <path d="M-6 -190 C 40 -178 58 -160 62 -136" />
        <path d="M-6 -190 C -42 -172 -58 -152 -60 -132" />
      </g>
      <circle cx="-14" cy="-182" r="5" fill="#8A6A3E" />
      <circle cx="4" cy="-176" r="4" fill="#8A6A3E" />
    </g>
  );
}

function PalmSmall({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 0 C 3 -34 2 -66 -3 -100" stroke="#6B5844" strokeWidth="5" fill="none" strokeLinecap="round" />
      <g stroke="#3B6455" strokeWidth="5" fill="none" strokeLinecap="round">
        <path d="M-3 -100 C -28 -112 -40 -106 -50 -94" />
        <path d="M-3 -100 C -20 -126 -8 -138 4 -142" />
        <path d="M-3 -100 C 20 -122 38 -116 48 -102" />
        <path d="M-3 -100 C 24 -92 34 -80 36 -66" />
      </g>
    </g>
  );
}

function Villa({ accent }: { accent: string }) {
  return (
    <>
      <Sky from="#F4D9BE" to="#FBF3E6" id="vn-villa-sky" />
      <rect width="800" height="600" fill="url(#vn-villa-sky)" />
      <circle cx="596" cy="150" r="76" fill="#EBA97A" opacity="0.75" />
      <circle cx="596" cy="150" r="118" fill="#EBA97A" opacity="0.12" />
      <path d="M0 372 C 120 336 220 366 320 344 C 450 316 560 348 800 322 V 600 H 0 Z" fill="#DFCDB2" opacity="0.7" />
      {/* house */}
      <rect x="196" y="252" width="330" height="196" fill="#FBF7EE" />
      <path d="M184 254 L 361 176 L 538 254 Z" fill="#EFE6D6" />
      <rect x="526" y="300" width="96" height="148" fill="#EBDFC9" />
      <rect x="196" y="252" width="330" height="8" fill="#D8C8AE" />
      {/* arched windows */}
      {[244, 320, 396, 472].map((x, index) => (
        <g key={x}>
          <path d={`M${x} 322 h42 v56 a21 21 0 0 1 -42 0 Z`} fill="#2C4B43" />
          <path d={`M${x + 6} 330 h30 v48 a15 15 0 0 1 -30 0 Z`} fill={index === 1 ? "#F0C184" : "#7FA79C"} opacity={index === 1 ? 1 : 0.55} />
        </g>
      ))}
      {/* door */}
      <path d="M330 448 v-88 a36 36 0 0 1 72 0 v88 Z" fill="#8A5C3B" />
      <circle cx="390" cy="404" r="3" fill="#E9D6B8" />
      {/* pool */}
      <rect x="92" y="470" width="616" height="98" rx="16" fill="#8FBBB2" />
      <rect x="92" y="470" width="616" height="40" rx="16" fill="#AFD2C9" opacity="0.7" />
      {[140, 250, 380, 520, 640].map((x, index) => (
        <rect key={x} x={x} y={496 + (index % 2) * 26} width={index % 2 ? 78 : 52} height="4" rx="2" fill="#F3F7F2" opacity="0.5" />
      ))}
      <rect x="72" y="556" width="656" height="20" rx="6" fill="#E6D8C1" />
      {/* greenery */}
      <Palm x={690} y={470} scale={1.05} flip />
      <PalmSmall x={120} y={470} />
      <ellipse cx="120" cy="474" rx="54" ry="8" fill="#3B6455" opacity="0.3" />
      <ellipse cx="690" cy="476" rx="66" ry="9" fill="#3B6455" opacity="0.3" />
      <g fill="#3F6B57">
        <circle cx="160" cy="440" r="18" />
        <circle cx="186" cy="446" r="13" />
        <circle cx="140" cy="450" r="11" />
      </g>
      <rect x="86" y="500" width="60" height="16" rx="7" fill={accent} opacity="0.85" />
      <rect x="650" y="502" width="52" height="14" rx="6" fill={accent} opacity="0.7" />
      {/* foreground terrace */}
      <rect x="0" y="572" width="800" height="28" fill="#D9C6A9" opacity="0.5" />
    </>
  );
}

function Beach({ accent }: { accent: string }) {
  return (
    <>
      <Sky from="#F6E7CE" to="#E4F0EC" id="vn-beach-sky" />
      <rect width="800" height="600" fill="url(#vn-beach-sky)" />
      <circle cx="230" cy="138" r="58" fill="#F0C58E" />
      <rect x="0" y="300" width="800" height="120" fill="#8FBDB6" />
      <rect x="0" y="352" width="800" height="70" fill="#6FA5A0" />
      <rect x="0" y="394" width="800" height="30" fill="#5B918D" opacity="0.8" />
      {[60, 200, 360, 520, 690].map((x, index) => (
        <path
          key={x}
          d={`M${x} ${310 + (index % 3) * 18} q 26 -6 52 0`}
          stroke="#F4F8F4"
          strokeWidth="3"
          fill="none"
          opacity="0.55"
        />
      ))}
      <path d="M0 424 C 180 408 320 436 470 420 C 610 406 700 424 800 414 V 600 H 0 Z" fill="#EFE0C4" />
      {/* stilted hut */}
      <g>
        <rect x="452" y="286" width="188" height="100" fill="#F6EDDC" />
        <path d="M436 290 L 546 214 L 656 290 Z" fill="#B9855A" />
        <path d="M452 290 L 546 228 L 640 290 Z" fill="#A8744C" opacity="0.55" />
        <rect x="470" y="306" width="36" height="52" fill="#3B6455" />
        <rect x="520" y="306" width="44" height="36" fill="#E9BE85" />
        <rect x="584" y="306" width="36" height="52" fill="#3B6455" opacity="0.8" />
        {[470, 520, 584].map((x) => (
          <rect key={x} x={x - 6} y="386" width="6" height="42" fill="#8A7256" />
        ))}
        <rect x="456" y="386" width="182" height="8" fill="#C9B08A" />
        <rect x="600" y="394" width="6" height="34" fill="#8A7256" />
        <rect x="492" y="394" width="6" height="34" fill="#8A7256" />
      </g>
      {/* loungers */}
      <g fill={accent}>
        <rect x="186" y="452" width="86" height="10" rx="3" />
        <rect x="186" y="418" width="10" height="38" rx="3" transform="rotate(-14 186 418)" />
        <rect x="270" y="452" width="86" height="10" rx="3" />
        <rect x="270" y="418" width="10" height="38" rx="3" transform="rotate(-14 270 418)" />
      </g>
      <rect x="180" y="462" width="12" height="18" rx="3" fill="#8A7256" />
      <rect x="264" y="462" width="12" height="18" rx="3" fill="#8A7256" />
      <Palm x={688} y={478} scale={1.2} flip />
      <ellipse cx="688" cy="484" rx="86" ry="10" fill="#6B7F5C" opacity="0.25" />
      <PalmSmall x={92} y={452} />
      <path d="M330 120 q 16 -12 32 0 M372 106 q 12 -10 24 0" stroke="#7C8A7A" strokeWidth="3" fill="none" opacity="0.6" />
      <rect x="0" y="556" width="800" height="44" fill="#E6D4B4" opacity="0.55" />
    </>
  );
}

function Haveli({ accent }: { accent: string }) {
  return (
    <>
      <Sky from="#F3DFC4" to="#F8EFDD" id="vn-haveli-sky" />
      <rect width="800" height="600" fill="url(#vn-haveli-sky)" />
      <circle cx="150" cy="120" r="52" fill="#E7B57E" opacity="0.8" />
      {/* domes */}
      <g fill="#D9B688">
        <path d="M250 172 a44 44 0 0 1 88 0 Z" />
        <path d="M450 158 a38 38 0 0 1 76 0 Z" />
        <rect x="294" y="132" width="6" height="26" fill="#B9925F" />
        <rect x="486" y="120" width="5" height="24" fill="#B9925F" />
      </g>
      {/* facade */}
      <rect x="96" y="200" width="608" height="300" fill="#E7C99F" />
      <rect x="96" y="200" width="608" height="14" fill="#D3AF7F" />
      <rect x="96" y="230" width="608" height="6" fill="#D3AF7F" opacity="0.6" />
      {/* jharokha balcony */}
      <g>
        <rect x="330" y="248" width="140" height="82" rx="6" fill="#D9B688" />
        <rect x="342" y="260" width="116" height="58" rx="4" fill="#5B4433" />
        {[356, 380, 404, 428].map((x) => (
          <rect key={x} x={x} y="260" width="4" height="58" fill="#C9A87C" opacity="0.6" />
        ))}
        <path d="M322 332 h156 l -12 12 h -132 Z" fill="#C9A87C" />
        <circle cx="400" cy="240" r="16" fill="#F0D9B4" />
        <path d="M384 240 a16 16 0 0 1 32 0" stroke="#C9A87C" strokeWidth="3" fill="none" />
      </g>
      {/* arches */}
      {[140, 236, 448, 544].map((x, index) => (
        <g key={x}>
          <path d={`M${x} 500 v-118 a40 40 0 0 1 80 0 v118 Z`} fill="#7E5F42" />
          <path
            d={`M${x + 9} 500 v-110 a31 31 0 0 1 62 0 v110 Z`}
            fill={index === 1 ? "#4C3A2E" : accent}
            opacity={index === 1 ? 1 : 0.65}
          />
          {index === 1 && (
            <g stroke="#C9A87C" strokeWidth="2" opacity="0.5">
              <path d={`M${x + 20} 500 v-104 M${x + 40} 500 v-112 M${x + 60} 500 v-104`} />
              <path d={`M${x + 9} 430 h62 M${x + 9} 466 h62`} />
            </g>
          )}
        </g>
      ))}
      {/* lanterns */}
      <g fill="#E9BE85">
        <rect x="212" y="360" width="26" height="34" rx="10" />
        <rect x="500" y="360" width="26" height="34" rx="10" />
      </g>
      <g stroke="#8A6A3E" strokeWidth="2">
        <path d="M225 360 v-16M513 360 v-16" />
      </g>
      {/* steps */}
      <rect x="60" y="500" width="680" height="16" fill="#D9B688" />
      <rect x="40" y="516" width="720" height="16" fill="#CFA97A" />
      <rect x="0" y="532" width="800" height="68" fill="#C6A075" />
      <PalmSmall x={716} y={520} />
      <PalmSmall x={82} y={524} />
      <circle cx="120" cy="520" r="20" fill="#4E6B4A" opacity="0.75" />
      <circle cx="686" cy="524" r="18" fill="#4E6B4A" opacity="0.75" />
    </>
  );
}

function Cabin({ accent }: { accent: string }) {
  return (
    <>
      <Sky from="#E9ECE6" to="#F7F4EC" id="vn-cabin-sky" />
      <rect width="800" height="600" fill="url(#vn-cabin-sky)" />
      <path d="M0 300 L 150 150 L 300 300 Z" fill="#B5C0B8" />
      <path d="M150 150 L 205 208 L 150 196 L 96 208 Z" fill="#F7F5EF" opacity="0.9" />
      <path d="M220 320 L 400 120 L 580 320 Z" fill="#9EACA4" />
      <path d="M400 120 L 470 196 L 400 178 L 330 196 Z" fill="#FBFAF5" />
      <path d="M470 330 L 620 190 L 770 330 Z" fill="#B5C0B8" opacity="0.85" />
      <path d="M620 190 L 664 236 L 620 226 L 576 236 Z" fill="#F7F5EF" opacity="0.8" />
      <rect x="0" y="330" width="800" height="270" fill="#E9E5D8" />
      {/* pines */}
      {[70, 140, 640, 710, 760].map((x, index) => (
        <g key={x} transform={`translate(${x} ${352 - index * 3})`}>
          <rect x="-4" y="60" width="8" height="46" fill="#6B5844" />
          <path d="M0 0 L 34 46 L -34 46 Z" fill="#3F5B4A" />
          <path d="M0 24 L 42 78 L -42 78 Z" fill="#35503F" />
          <path d="M0 50 L 50 108 L -50 108 Z" fill="#2C4636" />
        </g>
      ))}
      {/* cabin */}
      <rect x="238" y="300" width="324" height="188" fill="#8B5E3C" />
      <path d="M218 304 L 400 208 L 582 304 Z" fill="#5A4632" />
      <path d="M218 304 L 400 208 L 582 304 Z" fill="url(#vn-cabin-roof)" opacity="0.5" />
      <defs>
        <linearGradient id="vn-cabin-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7A5B41" />
          <stop offset="100%" stopColor="#3E3025" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4, 5].map((row) =>
        [0, 1, 2, 3, 4, 5, 6, 7].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={246 + col * 40}
            y={312 + row * 30}
            width="36"
            height="26"
            fill={row % 2 ? "#936744" : "#8B5E3C"}
            opacity="0.9"
          />
        )),
      )}
      <rect x="286" y="360" width="58" height="54" fill="#F2C078" />
      <path d="M286 387 h58 M315 360 v54" stroke="#6B4A30" strokeWidth="4" />
      <rect x="456" y="360" width="58" height="54" fill="#E9B26C" />
      <path d="M456 387 h58 M485 360 v54" stroke="#6B4A30" strokeWidth="4" />
      <rect x="366" y="398" width="52" height="90" fill="#5A4632" />
      <circle cx="408" cy="444" r="3" fill="#E9D6B8" />
      <rect x="486" y="270" width="18" height="46" fill="#7A5B41" />
      <g fill="#F7F5EF" opacity="0.5">
        <circle cx="495" cy="250" r="12" />
        <circle cx="508" cy="234" r="16" />
        <circle cx="526" cy="222" r="20" />
      </g>
      <path d="M0 488 C 200 470 400 500 800 476 V 600 H 0 Z" fill="#F4F1E8" />
      <path d="M330 560 q 30 -22 62 0 q 30 20 66 2" stroke="#C9BFA9" strokeWidth="4" fill="none" />
      <rect x="560" y="420" width="80" height="12" rx="4" fill={accent} opacity="0.7" />
      <rect x="120" y="430" width="70" height="10" rx="4" fill="#8A7256" opacity="0.6" />
    </>
  );
}

function Apartment({ accent }: { accent: string }) {
  return (
    <>
      <Sky from="#E8DCCB" to="#F7F2E8" id="vn-apt-sky" />
      <rect width="800" height="600" fill="url(#vn-apt-sky)" />
      {/* window with city */}
      <rect x="318" y="70" width="418" height="350" rx="6" fill="#F3EEE2" />
      <rect x="334" y="86" width="386" height="318" fill="#CFE0DC" />
      <defs>
        <linearGradient id="vn-apt-citysky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E9D3B4" />
          <stop offset="100%" stopColor="#DCE9E4" />
        </linearGradient>
      </defs>
      <rect x="334" y="86" width="386" height="318" fill="url(#vn-apt-citysky)" />
      <g fill="#A9BDB6">
        <rect x="352" y="250" width="58" height="154" />
        <rect x="424" y="212" width="44" height="192" />
        <rect x="482" y="268" width="66" height="136" />
        <rect x="562" y="228" width="52" height="176" />
        <rect x="628" y="286" width="74" height="118" />
      </g>
      <g fill="#F2C078" opacity="0.55">
        {Array.from({ length: 22 }).map((_, index) => (
          <rect
            key={index}
            x={360 + (index % 11) * 26}
            y={268 + Math.floor(index / 11) * 34}
            width="8"
            height="10"
          />
        ))}
      </g>
      <path d="M334 86 h386 M527 86 v318 M334 240 h386" stroke="#F3EEE2" strokeWidth="9" />
      <rect x="318" y="70" width="418" height="10" rx="4" fill="#E4DAC8" />
      <rect x="318" y="414" width="418" height="10" rx="4" fill="#E4DAC8" />
      {/* floor + wall */}
      <rect x="0" y="470" width="800" height="130" fill="#E9DCC6" />
      <rect x="0" y="466" width="800" height="6" fill="#D8C7AC" />
      {/* desk */}
      <rect x="96" y="386" width="188" height="10" rx="3" fill="#8B5E3C" />
      <rect x="112" y="396" width="8" height="80" fill="#7A5233" />
      <rect x="260" y="396" width="8" height="80" fill="#7A5233" />
      <rect x="140" y="344" width="64" height="42" rx="3" fill="#3B3A36" />
      <rect x="148" y="352" width="48" height="26" fill="#7FA79C" />
      <rect x="216" y="360" width="26" height="26" rx="4" fill={accent} />
      {/* plant */}
      <path d="M700 476 v-70" stroke="#4E6B4A" strokeWidth="5" />
      <g fill="#3F6B57">
        <path d="M700 430 c -34 -10 -44 -38 -40 -60 c 28 6 42 30 40 60 Z" />
        <path d="M700 442 c 34 -12 42 -42 36 -66 c -28 8 -40 34 -36 66 Z" />
        <path d="M700 456 c -28 -4 -40 -24 -42 -44 c 24 2 40 20 42 44 Z" />
      </g>
      <rect x="676" y="474" width="48" height="42" rx="6" fill="#B9855A" />
      {/* sofa */}
      <rect x="380" y="476" width="256" height="66" rx="14" fill={accent} opacity="0.9" />
      <rect x="392" y="452" width="232" height="44" rx="12" fill={accent} opacity="0.65" />
      <rect x="410" y="460" width="70" height="34" rx="8" fill="#F3EBDD" opacity="0.55" />
      <rect x="500" y="460" width="70" height="34" rx="8" fill="#F3EBDD" opacity="0.35" />
      <rect x="380" y="540" width="12" height="22" fill="#6B5844" />
      <rect x="624" y="540" width="12" height="22" fill="#6B5844" />
      <ellipse cx="440" cy="574" rx="150" ry="10" fill="#3A2E20" opacity="0.06" />
    </>
  );
}

function Suite({ accent }: { accent: string }) {
  return (
    <>
      <rect width="800" height="600" fill="#F1E7D6" />
      <rect x="0" y="0" width="800" height="330" fill="#EFE3CF" />
      {/* arch niche */}
      <path d="M240 470 V 220 a160 160 0 0 1 320 0 V 470 Z" fill="#E4D5BC" />
      <path d="M262 470 V 226 a138 138 0 0 1 276 0 V 470 Z" fill="#DCCBB0" />
      <path d="M286 470 V 232 a114 114 0 0 1 228 0 V 470 Z" fill="#4C3A2E" opacity="0.9" />
      {Array.from({ length: 6 }).map((_, index) => (
        <rect key={index} x={300 + index * 34} y="222" width="3" height="70" fill="#C9A87C" opacity="0.35" />
      ))}
      {/* bed */}
      <rect x="250" y="386" width="300" height="116" rx="10" fill="#FBF6EC" />
      <rect x="250" y="470" width="300" height="32" rx="8" fill={accent} opacity="0.8" />
      <rect x="250" y="356" width="300" height="46" rx="12" fill="#C9A87C" />
      <rect x="270" y="366" width="118" height="34" rx="10" fill="#FBF6EC" />
      <rect x="404" y="366" width="118" height="34" rx="10" fill="#FBF6EC" opacity="0.9" />
      <path d="M250 470 h300" stroke="#E3D3BA" strokeWidth="3" />
      <rect x="230" y="492" width="16" height="26" fill="#8B5E3C" />
      <rect x="554" y="492" width="16" height="26" fill="#8B5E3C" />
      {/* bedside tables + lamps */}
      {[{ x: 176 }, { x: 596 }].map(({ x }) => (
        <g key={x}>
          <rect x={x} y="432" width="62" height="60" rx="6" fill="#8B5E3C" />
          <rect x={x + 8} y="440" width="46" height="4" rx="2" fill="#6B4A30" />
          <rect x={x + 20} y="392" width="22" height="40" rx="10" fill="#D9B688" />
          <path d={`M${x + 31} 392 v-14`} stroke="#8A6A3E" strokeWidth="2" />
          <circle cx={x + 31} cy="374" r="24" fill="#F2C078" opacity="0.25" />
        </g>
      ))}
      {/* rug */}
      <ellipse cx="400" cy="540" rx="250" ry="40" fill="#E3D3BA" opacity="0.75" />
      <ellipse cx="400" cy="540" rx="190" ry="28" fill={accent} opacity="0.16" />
      {/* floor */}
      <rect x="0" y="512" width="800" height="88" fill="#E9DCC6" />
      <rect x="0" y="508" width="800" height="6" fill="#D8C7AC" />
      {/* art frame */}
      <rect x="88" y="180" width="84" height="108" rx="4" fill="#FBF6EC" />
      <rect x="98" y="190" width="64" height="88" fill="#C8D6D0" />
      <path d="M98 260 l20 -24 16 16 18 -22 10 30 Z" fill="#7FA79C" opacity="0.7" />
      <rect x="636" y="180" width="84" height="108" rx="4" fill="#FBF6EC" />
      <rect x="646" y="190" width="64" height="88" fill="#EAD7BC" />
      <circle cx="678" cy="226" r="18" fill="#BC6134" opacity="0.45" />
    </>
  );
}

function Living({ accent }: { accent: string }) {
  return (
    <>
      <rect width="800" height="600" fill="#F3EADB" />
      <rect x="0" y="0" width="800" height="420" fill="#F6EEE0" />
      {/* window */}
      <rect x="486" y="70" width="230" height="270" rx="4" fill="#DCE9E4" />
      <rect x="498" y="82" width="206" height="246" fill="#CFE0DC" />
      <g fill="#7FA79C" opacity="0.55">
        <path d="M498 328 v-98 l 44 -34 36 30 40 -52 44 46 42 -30 v138 Z" />
      </g>
      <circle cx="646" cy="132" r="24" fill="#F2C078" opacity="0.7" />
      <path d="M601 82 v246 M498 205 h206" stroke="#F6EEE0" strokeWidth="8" />
      {/* light beam */}
      <path d="M486 340 L 180 600 L 640 600 L 716 340 Z" fill="#F2C078" opacity="0.07" />
      {/* art */}
      <rect x="96" y="96" width="128" height="164" rx="3" fill="#FBF6EC" />
      <rect x="106" y="106" width="108" height="144" fill={accent} opacity="0.3" />
      <path d="M106 220 l34 -46 26 26 28 -38 20 58 Z" fill="#3B6455" opacity="0.55" />
      <rect x="250" y="120" width="86" height="112" rx="3" fill="#FBF6EC" />
      <rect x="258" y="128" width="70" height="96" fill="#E4D5BC" />
      <circle cx="293" cy="166" r="18" fill="#BC6134" opacity="0.35" />
      {/* sofa */}
      <rect x="120" y="392" width="380" height="96" rx="18" fill={accent} opacity="0.9" />
      <rect x="136" y="352" width="348" height="64" rx="16" fill={accent} opacity="0.62" />
      <rect x="160" y="364" width="94" height="46" rx="12" fill="#F8F1E3" opacity="0.6" />
      <rect x="266" y="364" width="94" height="46" rx="12" fill="#F8F1E3" opacity="0.4" />
      <rect x="372" y="364" width="94" height="46" rx="12" fill="#F8F1E3" opacity="0.55" />
      <rect x="112" y="398" width="20" height="70" rx="8" fill={accent} opacity="0.8" />
      <rect x="488" y="398" width="20" height="70" rx="8" fill={accent} opacity="0.8" />
      {[140, 468].map((x) => (
        <rect key={x} x={x} y="488" width="10" height="20" fill="#6B5844" />
      ))}
      {/* coffee table */}
      <ellipse cx="330" cy="534" rx="106" ry="26" fill="#8B5E3C" />
      <rect x="316" y="534" width="10" height="34" fill="#6B4A30" />
      <rect x="360" y="534" width="10" height="34" fill="#6B4A30" />
      <rect x="352" y="504" width="32" height="10" rx="4" fill="#F2C078" opacity="0.8" />
      {/* plant */}
      <path d="M676 520 v-92" stroke="#4E6B4A" strokeWidth="5" />
      <g fill="#3F6B57">
        <path d="M676 456 c -36 -12 -46 -42 -40 -66 c 30 8 44 34 40 66 Z" />
        <path d="M676 470 c 36 -14 44 -46 36 -70 c -30 10 -42 38 -36 70 Z" />
        <path d="M676 486 c -30 -4 -42 -26 -44 -48 c 26 4 42 22 44 48 Z" />
      </g>
      <rect x="650" y="518" width="52" height="46" rx="8" fill="#B9855A" />
      <rect x="0" y="556" width="800" height="44" fill="#E9DCC6" />
    </>
  );
}

function Bedroom({ accent }: { accent: string }) {
  return (
    <>
      <rect width="800" height="600" fill="#F4EBDB" />
      <rect x="0" y="0" width="800" height="440" fill="#F7EFE1" />
      {/* headboard */}
      <path d="M180 400 V 260 a120 120 0 0 1 240 0 V 400 Z" fill="#DCCBB0" />
      <path d="M198 400 V 266 a102 102 0 0 1 204 0 V 400 Z" fill="#D2BFA2" />
      {/* bed */}
      <rect x="150" y="386" width="300" height="150" rx="8" fill="#FBF6EC" />
      <rect x="150" y="470" width="300" height="66" rx="6" fill={accent} opacity="0.8" />
      <rect x="150" y="470" width="300" height="10" fill="#F8F1E3" opacity="0.5" />
      <path d="M150 500 h300" stroke="#EFE2CB" strokeWidth="2" opacity="0.8" />
      <rect x="172" y="352" width="110" height="46" rx="12" fill="#FBF6EC" />
      <rect x="292" y="352" width="110" height="46" rx="12" fill="#FBF6EC" opacity="0.92" />
      <path d="M227 352 v46 M347 352 v46" stroke="#EFE2CB" strokeWidth="2" />
      <rect x="134" y="446" width="16" height="90" fill="#6B4A30" />
      <rect x="450" y="446" width="16" height="90" fill="#6B4A30" />
      {/* side tables */}
      <rect x="478" y="424" width="76" height="72" rx="8" fill="#8B5E3C" />
      <rect x="486" y="434" width="60" height="4" rx="2" fill="#6B4A30" />
      <rect x="504" y="374" width="24" height="50" rx="10" fill="#D9B688" />
      <circle cx="516" cy="358" r="26" fill="#F2C078" opacity="0.3" />
      <rect x="56" y="424" width="76" height="72" rx="8" fill="#8B5E3C" />
      <rect x="64" y="434" width="60" height="4" rx="2" fill="#6B4A30" />
      {/* window */}
      <rect x="596" y="96" width="150" height="210" rx="4" fill="#DCE9E4" />
      <rect x="606" y="106" width="130" height="190" fill="#CFE0DC" />
      <g fill="#7FA79C" opacity="0.5">
        <path d="M606 296 v-70 l 30 -24 26 22 28 -38 32 34 14 -10 v86 Z" />
      </g>
      <path d="M671 106 v190 M606 200 h130" stroke="#F7EFE1" strokeWidth="7" />
      {/* rug + floor */}
      <rect x="0" y="536" width="800" height="64" fill="#E9DCC6" />
      <ellipse cx="330" cy="548" rx="220" ry="34" fill="#E3D3BA" opacity="0.7" />
      <ellipse cx="330" cy="548" rx="150" ry="20" fill={accent} opacity="0.14" />
    </>
  );
}

function Kitchen({ accent }: { accent: string }) {
  return (
    <>
      <rect width="800" height="600" fill="#F2E9DA" />
      <rect x="0" y="0" width="800" height="440" fill="#F7F0E3" />
      {/* window */}
      <rect x="500" y="70" width="210" height="160" rx="4" fill="#DCE9E4" />
      <rect x="510" y="80" width="190" height="140" fill="#CFE0DC" />
      <g fill="#4E6B4A" opacity="0.5">
        <circle cx="560" cy="180" r="42" />
        <circle cx="620" cy="160" r="54" />
        <circle cx="676" cy="186" r="36" />
      </g>
      <path d="M605 80 v140 M510 150 h190" stroke="#F7F0E3" strokeWidth="7" />
      {/* shelves */}
      <rect x="72" y="118" width="330" height="10" rx="4" fill="#8B5E3C" />
      <rect x="72" y="210" width="330" height="10" rx="4" fill="#8B5E3C" />
      {[96, 140, 184, 228].map((x, index) => (
        <g key={x}>
          <rect x={x} y={index % 2 ? 62 : 70} width="28" height={index % 2 ? 48 : 40} rx="4" fill={index % 2 ? "#D9B688" : "#FBF6EC"} />
          <rect x={x + 6} y={index % 2 ? 70 : 78} width="16" height="4" rx="2" fill="#C9A87C" />
        </g>
      ))}
      {[300, 336, 372].map((x) => (
        <g key={x}>
          <rect x={x} y="158" width="26" height="52" rx="4" fill="#7FA79C" opacity="0.6" />
          <rect x={x} y="158" width="26" height="12" rx="4" fill="#5E8A82" />
        </g>
      ))}
      <rect x="90" y="246" width="60" height="26" rx="6" fill={accent} opacity="0.75" />
      <rect x="160" y="246" width="42" height="26" rx="6" fill="#8B5E3C" />
      {/* pendant lights */}
      {[430, 470].map((x) => (
        <g key={x}>
          <path d={`M${x} 0 v 74`} stroke="#8A6A3E" strokeWidth="2" />
          <path d={`M${x - 20} 96 a20 20 0 0 1 40 0 Z`} fill="#3B3A36" />
          <circle cx={x} cy="100" r="14" fill="#F2C078" opacity="0.45" />
        </g>
      ))}
      {/* counter */}
      <rect x="60" y="330" width="680" height="18" rx="4" fill="#FBF6EC" />
      <rect x="60" y="348" width="680" height="150" fill="#E2D3B9" />
      {[110, 220, 330, 440, 550, 660].map((x) => (
        <rect key={x} x={x} y="368" width="92" height="112" rx="4" fill="#EFE3CE" stroke="#D8C7AC" strokeWidth="2" />
      ))}
      {/* sink + tap */}
      <rect x="250" y="336" width="110" height="8" rx="3" fill="#A9BDB6" />
      <path d="M300 336 v-44 h 26 v 16" stroke="#8A9A92" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* pots on counter */}
      <rect x="430" y="300" width="46" height="30" rx="4" fill="#3B3A36" />
      <rect x="486" y="306" width="34" height="24" rx="4" fill="#BC6134" opacity="0.8" />
      <rect x="86" y="308" width="54" height="22" rx="6" fill="#B9855A" />
      <g fill="#4E6B4A">
        <circle cx="108" cy="296" r="12" />
        <circle cx="126" cy="292" r="9" />
      </g>
      {/* floor */}
      <rect x="0" y="514" width="800" height="86" fill="#E9DCC6" />
      <path d="M0 542 h800 M0 572 h800" stroke="#DCCBB0" strokeWidth="2" opacity="0.7" />
    </>
  );
}

function Garden({ accent }: { accent: string }) {
  return (
    <>
      <Sky from="#E9E4D5" to="#F6F1E5" id="vn-garden-sky" />
      <rect width="800" height="600" fill="url(#vn-garden-sky)" />
      {/* pergola */}
      <g fill="#8B5E3C">
        <rect x="60" y="120" width="14" height="330" />
        <rect x="726" y="120" width="14" height="330" />
        <rect x="60" y="120" width="680" height="14" />
      </g>
      <g stroke="#A8744C" strokeWidth="8" opacity="0.85">
        {[110, 190, 270, 350, 430, 510, 590, 670].map((x) => (
          <path key={x} d={`M${x} 134 v 46`} />
        ))}
      </g>
      {/* string lights */}
      <path d="M74 180 C 240 230 480 150 726 196" stroke="#6B5844" strokeWidth="2" fill="none" />
      {[120, 200, 290, 380, 470, 560, 650].map((x, index) => (
        <circle key={x} cx={x} cy={190 + (index % 2) * 14} r="6" fill="#F2C078" opacity="0.9" />
      ))}
      {/* greenery backdrop */}
      <g fill="#4E6B4A" opacity="0.55">
        <circle cx="120" cy="330" r="70" />
        <circle cx="210" cy="360" r="54" />
        <circle cx="660" cy="330" r="76" />
        <circle cx="580" cy="362" r="50" />
      </g>
      <g fill="#3F6B57" opacity="0.7">
        <circle cx="90" cy="380" r="60" />
        <circle cx="700" cy="386" r="64" />
      </g>
      {/* table + chairs */}
      <ellipse cx="400" cy="404" rx="130" ry="34" fill="#FBF6EC" />
      <rect x="392" y="410" width="16" height="86" fill="#8B5E3C" />
      <ellipse cx="400" cy="500" rx="54" ry="10" fill="#6B4A30" opacity="0.35" />
      <g fill={accent} opacity="0.9">
        <rect x="208" y="392" width="86" height="18" rx="8" />
        <rect x="208" y="334" width="12" height="66" rx="6" />
        <rect x="504" y="392" width="86" height="18" rx="8" />
        <rect x="578" y="334" width="12" height="66" rx="6" />
      </g>
      <g fill="#8B5E3C">
        <rect x="216" y="410" width="10" height="82" />
        <rect x="276" y="410" width="10" height="82" />
        <rect x="514" y="410" width="10" height="82" />
        <rect x="574" y="410" width="10" height="82" />
      </g>
      <rect x="360" y="386" width="34" height="16" rx="4" fill="#F2C078" />
      <rect x="414" y="382" width="22" height="20" rx="4" fill="#7FA79C" />
      {/* pots */}
      <g>
        <rect x="84" y="438" width="66" height="58" rx="8" fill="#B9855A" />
        <path d="M117 438 v-56" stroke="#4E6B4A" strokeWidth="4" />
        <g fill="#3F6B57">
          <path d="M117 396 c -28 -8 -36 -30 -32 -48 c 22 6 34 26 32 48 Z" />
          <path d="M117 408 c 28 -10 34 -34 28 -52 c -22 8 -32 28 -28 52 Z" />
        </g>
      </g>
      <g>
        <rect x="650" y="444" width="58" height="52" rx="8" fill="#B9855A" />
        <path d="M679 444 v-46" stroke="#4E6B4A" strokeWidth="4" />
        <g fill="#3F6B57">
          <path d="M679 412 c -24 -6 -32 -26 -28 -42 c 20 4 30 22 28 42 Z" />
          <path d="M679 420 c 24 -8 30 -30 24 -46 c -20 8 -28 26 -24 46 Z" />
        </g>
      </g>
      {/* ground */}
      <rect x="0" y="492" width="800" height="108" fill="#E3D6BE" />
      <path d="M0 520 h800 M0 552 h800 M0 584 h800" stroke="#D3C3A6" strokeWidth="2" opacity="0.6" />
      <ellipse cx="400" cy="510" rx="170" ry="12" fill="#C9B89A" opacity="0.4" />
    </>
  );
}
