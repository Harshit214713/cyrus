"use client"
/* ══ Organizations.tsx — searchable org directory + programs ═ */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "@/lib/router";
import { ORGS, PROGRAMS } from "../data/orgs";
import { programsOf, assocNote } from "../data/programAssoc";
import { ROSTER, ROSTER_LABEL, ROSTER_STATS } from "../data/rosterOrgs";
import { useRosterIndex } from "../lib/programRoster";
import { avatarOf, byStars, fmt } from "../lib/util";
import type { Org } from "../lib/types";
import { useStore } from "../lib/store";
import { btn, Chip, LevelChip, OrgImg, Word } from "../components/ui";

const W = "max-w-[1240px] mx-auto px-6";

/* the directory now carries the whole confirmed roster, so it paginates */
const PAGE = 48;

/* ── page head ─────────────────────────────────────────────── */
function PageHead() {
  return (
    <header className={`${W} pt-14 pb-2`}>
      <p className="font-mono text-[10.5px] tracking-[.14em] uppercase text-dim">
        <Link to="/" className="hover:text-accent">Home</Link> / <span className="text-cocoa">Organizations</span>
      </p>
      <h1 className="font-display font-extrabold tracking-[-.02em] leading-[1.08] mt-3.5 mb-3 text-[clamp(33px,4.2vw,52px)]">
        Find your <Word>people.</Word> Then your<br />first good issue.
      </h1>
      <p className="text-ink font-medium max-w-[640px] text-[16.5px] leading-[1.6]">
        {ORGS.length} major open-source organizations, tracked live from GitHub. Every profile shows both sides -
        what they ship and the mentored programs they build, with real participation stats.
      </p>
    </header>
  );
}

/* ── featured-org rail ─────────────────────────────────────── */
function PillRail() {
  const top = useMemo(() => [...ORGS].sort(byStars).slice(0, 14), []);
  const slide = (o: Org) => (
    <Link key={o.login} to={`/organizations/${o.login}`}
      className="flex none shrink-0 inline-flex items-center gap-2.5 py-2 pl-2.5 pr-4 bg-card border border-line rounded-full text-[13px] font-semibold text-cocoa transition-all hover:border-accent hover:text-rust hover:-translate-y-0.5">
      <OrgImg src={avatarOf(o.login, 52)} name={o.login} className="w-[26px] h-[26px] rounded-full object-cover bg-clay" />
      {o.login}
      <span className="font-mono text-[10.5px] text-honey font-bold">★ {fmt(o.stars)}</span>
    </Link>
  );
  return (
    <div className="marq-mask overflow-hidden mt-6">
      <div className="marq-track animate-marq-slow">{top.map(slide)}{top.map(slide)}</div>
    </div>
  );
}

/* ── org card ──────────────────────────────────────────────── */
function OrgCard({ org }: { org: Org }) {
  const { savedOrgs, toggleSavedOrg, toast } = useStore();
  const on = savedOrgs.includes(org.login);
  const progs = programsOf(org.login);
  return (
    <article className="group bg-card border border-line rounded-[20px] p-5 flex flex-col gap-2.5 shadow-soft transition-all duration-200 hover:-translate-y-[5px] hover:shadow-lift hover:border-accent/40">
      <div className="flex items-center gap-3">
        <OrgImg src={avatarOf(org.login, 88)} name={org.login} className="w-11 h-11 rounded-[13px] object-cover bg-clay" />
        <div className="min-w-0">
          <b className="block card-title truncate">{org.name}</b>
          <span className="font-mono text-[10.5px] text-dim">@{org.login} · {org.domain}</span>
        </div>
        <span className="ml-auto shrink-0"><LevelChip level={org.level} /></span>
      </div>
      <p className="text-cocoa text-[13px] leading-[1.6] flex-1 line-clamp-2">{org.tagline}</p>
      <div className="flex gap-1.5 flex-wrap">{org.tags.slice(0, 3).map((t) => <Chip key={t}>{t}</Chip>)}</div>
      {progs.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center" aria-label="Programs this organization runs">
          <span className="font-mono text-[9px] uppercase tracking-[.11em] text-dim">runs</span>
          {progs.map((a) => (
            <Link key={a.id} to={`/programs/${a.id}`} title={assocNote(a)}>
              <Chip tone={a.tone}>{a.label} · {a.n}</Chip>
            </Link>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        <span className="font-mono text-[11px] text-honey font-bold">★ {fmt(org.stars)}</span>
        <span className="font-mono text-[10.5px] text-dim">{org.repos} repos</span>
        <button aria-label={on ? "Unsave organization" : "Save organization"} onClick={() => {
          const added = toggleSavedOrg(org.login);
          toast(added ? `Saved ${org.login} - see your dashboard` : `Removed ${org.login}`);
        }} className={`w-[34px] h-[34px] rounded-[10px] border grid place-items-center text-[13px] transition-all ${on ? "bg-accent border-accent text-accentfg" : "bg-cream border-line text-dim hover:border-accent hover:text-accent"}`}>
          {on ? "★" : "☆"}
        </button>
        <Link to={`/organizations/${org.login}`} className={btn("outline", "sm", "flex-1 justify-center")}>Explore</Link>
      </div>
    </article>
  );
}

/* ── the rest of the program roster ───────────────────────────
   The cards above need a GitHub account we could confirm, because every number
   on them is GitHub's. 616 organizations ran one of the four archives -
   GSoC 2016-2026 and the rest 2022-2026. The difference appears here: the same organization, named
   and counted by the program that accepted its projects, with no invented stars. */
const ROSTER_TONE: Record<string, "blue" | "green" | "cat" | "purple"> = {
  gsoc: "blue", lfx: "green", outreachy: "cat", sob: "purple",
};
const BAND = 40;

function RosterBand() {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(BAND);
  const idx = useRosterIndex();
  const profiles = useMemo(() => new Set(ORGS.map((o) => o.login.toLowerCase())), []);
  const rest = useMemo(() => ROSTER.filter((r) => !r.login || !profiles.has(r.login.toLowerCase())), [profiles]);
  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? rest.filter((r) => r.name.toLowerCase().includes(n) || r.category.toLowerCase().includes(n)) : rest;
  }, [rest, q]);

  const row = (r: (typeof ROSTER)[number]) => {
    const inner = (
      <>
        <span className="flex items-center gap-2.5 min-w-0">
          {r.login
            ? <OrgImg src={avatarOf(r.login, 48)} name={r.login} className="w-[22px] h-[22px] rounded-[7px] object-cover bg-clay shrink-0" />
            : <span aria-hidden className="w-[22px] h-[22px] rounded-[7px] bg-clay shrink-0 grid place-items-center font-mono text-[9px] text-dim">{r.name.slice(0, 1)}</span>}
          <b className="text-[13px] font-semibold text-ink truncate">{r.name}</b>
        </span>
        <span className="flex gap-1.5 flex-wrap items-center shrink-0">
          {r.programs.map((p) => (
            <span key={p.program} title={`${fmt(p.projects)} accepted ${ROSTER_LABEL[p.program] ?? p.program} project${p.projects === 1 ? "" : "s"} (${p.years[0]}-${p.years[p.years.length - 1]})`}>
              <Chip tone={ROSTER_TONE[p.program] ?? "cat"}>
                {ROSTER_LABEL[p.program] ?? p.program} · {fmt(p.projects)}
              </Chip>
            </span>
          ))}
          {!r.login && (
            <span className="font-mono text-[9px] uppercase tracking-[.1em] text-dim" title="No GitHub account could be confirmed for this organization, so it shows no stars, repos or profile.">no account</span>
          )}
        </span>
      </>
    );
    const cls = "flex items-center justify-between gap-3 py-2.5 px-3 rounded-[12px] border border-transparent hover:border-line hover:bg-cream transition-all";
    return r.login
      ? <a key={r.name} href={`https://github.com/${r.login}`} target="_blank" rel="noopener" className={cls}>{inner}</a>
      : <span key={r.name} className={cls}>{inner}</span>;
  };

  return (
    <section className={`${W} pt-6 pb-2`}>
      <div className="bg-card border border-line rounded-[22px] p-6 shadow-soft max-[700px]:p-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display font-extrabold text-[22px] tracking-[-.02em]">
              The rest of the <Word>program roster</Word>
            </h2>
            <p className="text-cocoa text-[13px] leading-[1.6] mt-1.5 max-w-[720px]">
              {fmt(ROSTER_STATS.orgs)} organizations ran a mentored project, across{" "}
              {fmt(ROSTER_STATS.projects)} accepted projects in the four archives that publish one - Google Summer
              of Code 2016-2026, LFX, Outreachy and Summer of Bitcoin 2022-2026.{" "}
              {fmt(ROSTER_STATS.withGithub)} have a GitHub account we could confirm and {ORGS.length} of those
              are profiled above; the {fmt(rest.length)} here are the remainder, shown exactly as their program
              recorded them. The wider participation roster - {idx?.totals ? fmt(idx.totals.distinctOrgs) : "several thousand"}{" "}
              distinct organizations across the {idx?.totals ? idx.totals.programs : "eight"} programs that publish
              any record, including 24 Pull Requests and the GSSoC board - is listed on each{" "}
              <Link to="/programs" className="text-accent hover:underline">program page</Link>.
            </p>
          </div>
          <input value={q} onChange={(e) => { setQ(e.target.value); setShown(BAND); }}
            aria-label="Search the program roster" placeholder="Search the roster"
            className="w-full max-w-[240px] bg-paper border border-line rounded-xl px-3.5 py-2 text-[13.5px] outline-none transition-all focus:border-accent" />
        </div>

        <div className="grid grid-cols-2 gap-x-6 mt-4 max-[860px]:grid-cols-1">
          {hits.slice(0, shown).map(row)}
        </div>
        {!hits.length && (
          <p className="text-dim text-[13px] py-8 text-center">No roster organization by that name - the {ORGS.length} profiled above are searched by the box at the top of the page.</p>
        )}
        {hits.length > shown && (
          <div className="flex justify-center mt-5">
            <button type="button" onClick={() => setShown((s) => s + BAND * 2)} className={btn("outline", "sm")}>
              Show more · {fmt(hits.length - shown)} left
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── page ──────────────────────────────────────────────────── */
export default function Organizations() {
  const [params, setParams] = useSearchParams();
  const LEVEL_VALUES = ["all", "beginner", "intermediate", "advanced"] as const;
  const rawLevel = params.get("level");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [level, setLevel] = useState<string>(
    LEVEL_VALUES.includes(rawLevel as any) ? (rawLevel as string) : "all"
  );
  const [tag, setTag] = useState(params.get("tag") ?? "all");
  const [prog, setProg] = useState(params.get("prog") ?? "all");
  const [shown, setShown] = useState(PAGE);

  /* every filter change rewrites the whole query, so stacked facets
     survive and the sync effect below never sees a partial URL */
  const write = (over: Partial<{ q: string; level: string; tag: string; prog: string }>) => {
    const m = { q, level, tag, prog, ...over };
    const rec: Record<string, string> = {};
    if (m.q) rec.q = m.q;
    if (m.level !== "all") rec.level = m.level;
    if (m.tag !== "all") rec.tag = m.tag;
    if (m.prog !== "all") rec.prog = m.prog;
    setParams(rec);
  };
  const setQUrl = (v: string) => { setQ(v); write({ q: v }); };
  const setLevelUrl = (v: string) => { setLevel(v); write({ level: v }); };
  const setTagUrl = (v: string) => { setTag(v); write({ tag: v }); };
  const setProgUrl = (v: string) => { setProg(v); write({ prog: v }); };
  const clearUrl = () => { setQ(""); setLevel("all"); setTag("all"); setProg("all"); setParams({}); };

  /* the router's search arrives one effect after mount, so a deep link
     (?prog=gsoc) is invisible to the useState initialisers above - mirror
     the URL into state whenever it changes, the way the issue finder does */
  useEffect(() => {
    setQ(params.get("q") ?? "");
    setLevel(["all", "beginner", "intermediate", "advanced"].includes(params.get("level") ?? "") ? params.get("level")! : "all");
    setTag(params.get("tag") ?? "all");
    setProg(params.get("prog") ?? "all");
  }, [params]);

  const allTags = useMemo(() => {
    const c: Record<string, number> = {};
    ORGS.forEach((o) => o.tags.forEach((t) => { c[t] = (c[t] ?? 0) + 1; }));
    return Object.entries(c).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);
  }, []);

  /* program options that at least one tracked org really runs */
  const progOptions = useMemo(() => {
    const seen = new Map<string, string>();
    ORGS.forEach((o) => programsOf(o.login).forEach((a) => seen.set(a.id, a.label)));
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, []);

  const list = useMemo(() => ORGS.filter((o) =>
    (level === "all" || o.level === level) &&
    (tag === "all" || o.tags.includes(tag)) &&
    (prog === "all" || programsOf(o.login).some((a) => a.id === prog)) &&
    (!q.trim() || (o.login + " " + o.name + " " + o.tagline + " " + o.tags.join(" ")).toLowerCase().includes(q.trim().toLowerCase()))
  ).sort(byStars), [q, level, tag, prog]);

  /* any filter change goes back to the first page of results */
  useEffect(() => { setShown(PAGE); }, [q, level, tag, prog]);

  const fin = "w-full bg-paper border border-line rounded-xl px-3.5 py-2.5 text-[14px] outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_rgba(34, 197, 94,.12)]";

  return (
    <>
      <PageHead />

      <section className={`${W} pt-6`}>
        <div className="grid grid-cols-[1fr_190px_190px_190px] gap-3.5 max-[760px]:grid-cols-1">
          <input className={fin} placeholder="Search organizations - “google”, “ai”, “infra”…" value={q} onChange={(e) => setQUrl(e.target.value)} />
          <select className={`${fin} select-warm pr-8`} value={level} onChange={(e) => setLevelUrl(e.target.value)} aria-label="Difficulty level">
            <option value="all">Any level</option>
            <option value="beginner">Beginner-friendly</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <select className={`${fin} select-warm pr-8`} value={tag} onChange={(e) => setTagUrl(e.target.value)} aria-label="Focus tag">
            <option value="all">Any focus</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={`${fin} select-warm pr-8`} value={prog} onChange={(e) => setProgUrl(e.target.value)} aria-label="Program participation">
            <option value="all">Any program</option>
            {progOptions.map(([id, label]) => <option key={id} value={id}>{label} orgs</option>)}
          </select>
        </div>
        <PillRail />
      </section>

      <section className={`${W} pt-10 pb-4`}>
        <p className="font-mono text-[11.5px] tracking-[.1em] uppercase text-cocoa mb-5">
          <b className="text-accent">{list.length}</b> organization{list.length === 1 ? "" : "s"} found
        </p>
        {list.length ? (
          <>
            <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-3 max-[840px]:grid-cols-2 max-[540px]:grid-cols-1">
              {list.slice(0, shown).map((o) => <OrgCard key={o.login} org={o} />)}
            </div>
            {list.length > shown && (
              <div className="flex justify-center mt-8">
                <button type="button" onClick={() => setShown((s) => s + PAGE * 2)} className={btn("outline", "md")}>
                  Show more organizations · {fmt(list.length - shown)} left
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-dim">
            No organizations match those filters. <button className="text-accent font-semibold hover:underline cursor-pointer" onClick={clearUrl}>Clear filters</button>
          </div>
        )}
      </section>

      <RosterBand />

      {/* the full program directory moved to /programs - this band is the bridge */}
      <section className={`${W} pt-14 pb-6`}>
        <div className="bg-gradient-to-br from-clay to-peach/60 border border-line rounded-[22px] px-8 py-8 max-[700px]:px-5">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="min-w-[280px] flex-1">
              <h2 className="card-title-xl">Looking for a <Word>season</Word>, not just a repo?</h2>
              <p className="text-cocoa text-[13.5px] leading-[1.6] mt-2 max-w-[620px]">
                {PROGRAMS.length} mentored programs - stipends, calendars, eligibility and a five-year
                archive of accepted projects - live on their own page. The orgs above show which of them
                they actually run, straight from their repos' GitHub topics.
              </p>
            </div>
            <div className="flex gap-2.5 flex-wrap items-center shrink-0">
              {PROGRAMS.filter((p) => p.status === "live").slice(0, 3).map((p) => (
                <Link key={p.id} to={`/programs/${p.id}`}
                  className="font-mono text-[10.5px] font-bold uppercase tracking-[.1em] px-3 py-2 rounded-full border border-leaf/40 bg-leaf/8 text-leaf hover:bg-leaf/15 transition-colors">
                  {p.name} · live
                </Link>
              ))}
              <Link to="/programs" className={btn("primary", "lg")}>All programs</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
