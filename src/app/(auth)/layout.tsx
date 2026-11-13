import { PropertyArt } from "@/components/property/property-art";
import { Logo } from "@/components/site/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-pine text-cream lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-[0.16]">
          <PropertyArt scene="villa" tone={1} className="h-full w-full" />
        </div>
        <div className="relative z-10 p-10">
          <a href="/" className="inline-flex items-center gap-2.5">
            <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect width="40" height="40" rx="11" fill="#F6F1E6" />
              <path d="M12 28V17.6c0-3.2 2.6-5.8 5.8-5.8h4.4c3.2 0 5.8 2.6 5.8 5.8V28" stroke="#22483B" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M17 28v-5.4a3 3 0 0 1 6 0V28" stroke="#22483B" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M12 12.6 20 7l8 5.6" stroke="#A8854C" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="flex flex-col leading-none">
              <span className="display text-[24px] tracking-[-0.04em] text-cream">nivas</span>
              <span className="mt-1 text-[8.5px] uppercase tracking-[0.24em] text-cream/50">stays with a story</span>
            </span>
          </a>
        </div>
        <div className="relative z-10 max-w-md p-10">
          <p className="eyebrow text-cream/60">Stays with a story</p>
          <h1 className="display mt-4 text-[44px] leading-[1.02] text-cream">
            The quiet side of India, one home at a time.
          </h1>
          <p className="mt-5 text-[13.5px] leading-relaxed text-cream/70">
            Villas in Goa, havelis in Jaipur, cabins above Manali — every listing is reviewed,
            every night is live, and every payment is protected.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-cream/15 pt-6">
            {[
              ["12", "live homes"],
              ["6", "cities"],
              ["4.9", "guest rating"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="font-display text-2xl text-cream">{value}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-cream/50">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3 border-t border-cream/15 px-10 py-5 text-[11px] text-cream/50">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          D1 · Supabase Storage · KV · Workers
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 lg:hidden">
          <Logo />
          <a href="/" className="text-[12px] text-muted hover:text-ink">
            Back to marketplace
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
