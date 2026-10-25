"use client"
/* ══ ui.tsx — small shared primitives ═══════════════════════ */
import { useState } from "react";
import type { ReactNode, ImgHTMLAttributes } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { tileBG, initials, hash, LEVEL_LABEL } from "../lib/util";
import type { Level } from "../lib/types";

export function Logo({ size = 30, draw = false, live = false }: { size?: number; draw?: boolean; live?: boolean }) {
  /* The mark: an open ring - a branch that never closes - ending in the same
     rotated square the header uses as its accent. Read it as a "c" or as a
     commit at the end of someone's work; it is the one shape used everywhere
     the brand has to fit, from the favicon up to the social card.

     `draw` plays the mark being built: the ring strokes itself round, then the
     commit drops onto the end of it. It is a load-once gesture on the header
     and the whole subject of the intro curtain; reduced-motion visitors get
     the finished mark, as everywhere else.

     `live` adds the idle motion: a short light running the length of the ring
     and out at the commit, which is the one thing the mark does while nothing
     is happening to it. */
  const reduce = useReducedMotion();
  const anim = draw && !reduce;
  const easeSilk = [0.22, 1, 0.36, 1] as const;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="mark-live">
      <rect width="100" height="100" rx="26" fill="#0f1214" />
      <motion.rect x="1.25" y="1.25" width="97.5" height="97.5" rx="24.75" fill="none" stroke="#ffffff" strokeOpacity=".09" strokeWidth="2.5"
        initial={anim ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: .4 }} />
      <motion.path d="M68 34a21.5 21.5 0 1 0 .9 32" fill="none" stroke="#eceef0" strokeWidth="11" strokeLinecap="round"
        initial={anim ? { pathLength: 0 } : false} animate={{ pathLength: 1 }}
        transition={{ duration: .9, ease: easeSilk }} />
      {live && !reduce && (
        <path className="mark-run" d="M68 34a21.5 21.5 0 1 0 .9 32" fill="none" stroke="#4ade80"
          strokeWidth="11" strokeLinecap="round" pathLength={100} />
      )}
      {/* the commit sits on a group that framer owns for the entrance; the
          hover turn is a CSS transition on the path inside it, so the two
          never fight over one transform attribute */}
      <motion.g initial={anim ? { opacity: 0, scale: .35 } : false} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: .66, duration: .46, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <path className="mark-commit" d="M68 22.8 79.2 34 68 45.2 56.8 34Z" fill="#4ade80" />
      </motion.g>
    </svg>
  );
}

export const Brand = () => (
  <span className="font-display font-extrabold text-[19px] tracking-[-.02em]">cyrus</span>
);

/* A flat-vector portrait, drawn from the name. These are illustrations, not
   photographs of anyone: a real face next to a quote nobody gave would be the
   worst kind of placeholder, so the avatars stay obviously made-up and say so. */
const SKIN = ["#f0c9a4", "#d9a173", "#a9713f", "#7c4a24", "#e8b48c", "#5c3620"];
const HAIR = ["#2b2b30", "#4a3320", "#1d1d20", "#6b4226", "#3a2a3f", "#8a8f98"];
const CLOTH = ["#2f6b4f", "#37506e", "#6b3f52", "#4a4f55", "#7a5321", "#2f5d63"];
export function Portrait({ name, size = 44, className = "" }: { name: string; size?: number; className?: string }) {
  const h = hash(name);
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >> 3) % HAIR.length];
  const cloth = CLOTH[(h >> 6) % CLOTH.length];
  const style = (h >> 9) % 4;
  const glasses = (h >> 12) % 3 === 0;
  const bg = `hsl(${(h >> 4) % 360} 30% 88%)`;
  const doHair = () => {
    if (style === 0) return <path d="M20 34c0-9 5-15 12-15s12 6 12 15c0-4-3-6-12-6s-12 2-12 6Z" fill={hair} />;
    if (style === 1) return <><path d="M19 36c0-10 5-17 13-17s13 7 13 17c0 6-2 9-3 6 1-8-2-12-10-12s-11 4-10 12c-1 3-3 0-3-6Z" fill={hair} /></>;
    if (style === 2) return <><path d="M20 33c0-9 5-14 12-14s12 5 12 14v3c0-6-4-9-12-9s-12 3-12 9Z" fill={hair} /><circle cx="42" cy="24" r="5" fill={hair} /></>;
    return <path d="M19 35c1-11 6-16 13-16s12 5 13 16c-2-5-6-7-13-7s-11 2-13 7Z" fill={hair} />;
  };
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={`shrink-0 rounded-full ${className}`} role="img">
      <clipPath id={`pc${h}`}><circle cx="32" cy="32" r="32" /></clipPath>
      <g clipPath={`url(#pc${h})`}>
        <rect width="64" height="64" fill={bg} />
        <path d="M32 44c9 0 16 6 17 14H15c1-8 8-14 17-14Z" fill={cloth} />
        <rect x="27" y="38" width="10" height="10" rx="4" fill={skin} />
        <ellipse cx="32" cy="30" rx="12.5" ry="13.5" fill={skin} />
        {doHair()}
        <circle cx="27" cy="30.5" r="1.7" fill="#22262a" />
        <circle cx="37" cy="30.5" r="1.7" fill="#22262a" />
        <path d="M28.5 36.5c1.6 1.3 5.4 1.3 7 0" stroke="#22262a" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".75" />
        {glasses && <g stroke="#22262a" strokeWidth="1.3" fill="none" opacity=".7"><circle cx="27" cy="30.5" r="4.6" /><circle cx="37" cy="30.5" r="4.6" /><path d="M31.6 30.5h2.8" /></g>}
      </g>
      <circle cx="32" cy="32" r="31" fill="none" stroke="currentColor" strokeOpacity=".12" />
    </svg>
  );
}

export function Word({ children }: { children: ReactNode }) {
  return <span className="word-accent">{children}</span>;
}

/* section eyebrow: monospaced and uppercase, with the cyrus spark as its only
   ornament. The pill version read as a badge; a label should not shout. */
export const Eyebrow = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[.16em] text-dim">
    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path d="M12 1.8c.95 4.9 3.32 8.1 8.4 9.5.6.16.6 1.04 0 1.2-5.08 1.4-7.45 4.6-8.4 9.5-.16.6-1.04.6-1.2 0-.95-4.9-3.32-8.1-8.4-9.5-.6-.16-.6-1.04 0-1.2 5.08-1.4 7.45-4.6 8.4-9.5.16-.6 1.04-.6 1.2 0z" fill="var(--color-accent)" />
    </svg>
    {children}
  </span>
);

export const SectionTag = ({ children }: { children: ReactNode }) => (
  <span className="font-mono text-[11px] tracking-[.14em] uppercase text-accent">{children}</span>
);

/* button variants */
const BTN_BASE = "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-all duration-150 active:scale-[.98] cursor-pointer";
const BTN_SIZES: Record<string, string> = {
  sm: "px-3.5 py-1.5 text-[12.5px]", md: "px-5 py-2.5 text-[14px]", lg: "px-7 py-3.5 text-[15.5px]",
};
export const BTN_VARIANTS: Record<string, string> = {
  /* the signal-green fill. Its label is near-black on graphite and white on
     paper, so it stays legible whichever mode the visitor is in. */
  primary: "bg-accent text-accentfg border border-accent shadow-[0_10px_26px_-12px_rgba(34,197,94,.5)] hover:bg-accentd hover:border-accentd",
  /* the neutral pill: near-white on graphite, graphite on paper */
  dark: "bg-ink text-paper border border-ink hover:bg-accent hover:text-accentfg hover:border-accent",
  outline: "bg-card border border-line text-ink shadow-soft hover:border-accent hover:-translate-y-px",
  ghost: "text-cocoa hover:text-ink hover:bg-card border border-transparent hover:border-line",
};
export function btn(variant = "outline", size = "md", extra = "") {
  return `${BTN_BASE} ${BTN_SIZES[size]} ${BTN_VARIANTS[variant]} ${extra}`;
}

/* avatar with graceful fallback */
export function OrgImg({ src, name, className = "", ...rest }: { src: string; name: string } & ImgHTMLAttributes<HTMLImageElement>) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span className={`grid place-items-center bg-clay text-dim font-display font-bold ${className}`} style={{ background: tileBG(name), color: "#fff" }}>
        {initials(name)}
      </span>
    );
  }
  return <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} {...rest} className={className} />;
}

export function Avatar({ name, size = 30, src }: { name: string; size?: number; src?: string }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) {
    return <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)}
      className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span className="rounded-full grid place-items-center font-bold text-white overflow-hidden shrink-0"
      style={{ width: size, height: size, background: tileBG(name), fontSize: size * 0.4 }}>
      {initials("u/" + name)}
    </span>
  );
}

/* level / tag chips */
const LEVEL_CLS: Record<Level, string> = {
  beginner: "text-leaf border-leaf/30 bg-leaf/8",
  intermediate: "text-honey border-honey/30 bg-honey/8",
  advanced: "text-brick border-brick/30 bg-brick/8",
};
export const LevelChip = ({ level }: { level: Level }) => (
  <span className={`font-mono text-[10.5px] font-semibold px-2.5 py-1 rounded-full border ${LEVEL_CLS[level]}`}>
    {LEVEL_LABEL[level]}
  </span>
);

export const Chip = ({ children, tone = "" }: { children: ReactNode; tone?: "cat" | "stars" | "lang" | "green" | "blue" | "purple" | "" }) => {
  const tones: Record<string, string> = {
    cat: "text-rust border-accent/30 bg-peach",
    stars: "text-honey border-honey/30 bg-honey/6",
    lang: "text-denim border-denim/30 bg-denim/6",
    green: "text-leaf border-leaf/35 bg-leaf/7",
    blue: "text-denim border-denim/35 bg-denim/7",
    purple: "text-plum border-plum/35 bg-plum/7",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10.5px] font-semibold rounded-full px-2.5 py-1 border ${tones[tone] ?? "text-cocoa border-line bg-cream"}`}>
      {children}
    </span>
  );
};

export const Tag = ({ children }: { children: ReactNode }) => (
  <span className="inline-block font-mono text-[10.5px] font-semibold px-2.5 py-[3px] rounded-full border border-line text-cocoa bg-cream">
    {children}
  </span>
);

/* section header with side link */
export function SectionHead({ tag, title, sub, side }: { tag: string; title: ReactNode; sub?: string; side?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-5 flex-wrap mb-10">
      <div>
        <SectionTag>{tag}</SectionTag>
        <h2 className="font-display font-extrabold tracking-[-.02em] leading-[1.08] mt-3 text-[clamp(32px,4vw,50px)]">{title}</h2>
        {sub && <p className="text-ink font-medium mt-3 text-[16.5px] leading-[1.6] max-w-[560px]">{sub}</p>}
      </div>
      {side && <div className="flex items-center gap-3">{side}</div>}
    </div>
  );
}

/* deterministic tiny sparkline path */
export function spark(seed: string, w = 110, h = 34): string {
  const pts: string[] = [];
  for (let i = 0; i <= 10; i++) {
    const y = h - 4 - rnd01(seed + i) * (h - 8);
    pts.push(`${(i / 10) * w},${y.toFixed(1)}`);
  }
  return "M" + pts.join(" L");
}
const rnd01 = (s: string) => (hash(s) % 1000) / 1000;
