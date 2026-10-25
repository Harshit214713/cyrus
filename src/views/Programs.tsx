"use client"
/* ══ Programs.tsx — the program directory.
   All tracked mentored seasons as cards (status, stipend, window, scale),
   plus the five-year archive band: accepted-project counts pulled at
   runtime from the same /data/*.json files the /projects listing reads,
   so every cell is a real number and every cell deep-links into that
   listing with the program and year pre-filtered.                     ═ */
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { PROGRAMS } from "../data/orgs";
import { avatarOf, fmt } from "../lib/util";
import { useRosterIndex } from "../lib/programRoster";
import type { Evidence, RosterIndex } from "../lib/programRoster";
import { btn, Chip, OrgImg, Word } from "../components/ui";
import type { Program } from "../lib/types";

const W = "max-w-[1240px] mx-auto px-6";

/* which programs have a real project archive in /data, and the exact
   program string the /projects filter matches on */
const ARCHIVE_OF: Record<string, string> = {
  gsoc: "GSoC",
  lfx: "LFX",
  outreachy: "Outreachy",
  sob: "Summer of Bitcoin",
};

const STATUS_FILTERS: [string, string][] = [
  ["all", "Everything"], ["live", "Live now"], ["upcoming", "Opening soon"], ["closed", "Closed this cycle"],
];

const STATUS_PILL: Record<Program["status"], string> = {
  live: "text-leaf border-leaf/40 bg-leaf/8",
  upcoming: "text-honey border-honey/45 bg-honey/8",
  closed: "text-dim border-line bg-cream",
};

const EVIDENCE_WORD: Record<Evidence, string> = {
  archive: "from its project archive", api: "from its open API",
  listing: "from its published list", topics: "from GitHub topics",
};

/* ── one program card ─────────────────────────────────────────── */
function ProgCard({ p, roster }: { p: Program; roster?: RosterSlot }) {
  const archived = ARCHIVE_OF[p.id];
  return (
    <article className="group bg-card border border-line rounded-[20px] overflow-hidden flex flex-col shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-lift hover:border-accent/45">
      <Link to={`/programs/${p.id}`} className="relative block aspect-[16/7] bg-clay">
        <OrgImg src={p.img} name={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        <span className={`absolute top-3 left-3 font-mono text-[9.5px] font-bold uppercase tracking-[.1em] px-2.5 py-1 rounded-full border backdrop-blur-[2px] ${STATUS_PILL[p.status]}`}>
          {p.status}
        </span>
      </Link>
      <div className="p-[18px] flex flex-col gap-2.5 flex-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <OrgImg src={avatarOf(p.owner, 64)} name={p.owner} className="w-7 h-7 rounded-[8px] object-cover bg-white border border-line shrink-0" />
          <h3 className="card-title text-[15.5px] truncate">{p.name}</h3>
        </div>
        <p className="text-cocoa text-[12.5px] leading-[1.55] line-clamp-2">{p.tag}</p>
        <div className="flex gap-1.5 flex-wrap">
          <Chip tone="green">{p.pay}</Chip>
          <Chip tone="cat">{p.orgs}</Chip>
          <Chip tone="blue">{p.slots}</Chip>
        </div>
        <p className="font-mono text-[10px] tracking-[.09em] uppercase text-dim">{p.window}</p>
        <p className="font-mono text-[10px] tracking-[.09em] uppercase -mt-1.5 text-accent/80">
          {roster ? `${fmt(roster.orgs)} orgs · ${EVIDENCE_WORD[roster.source]}` : "Roster not published"}
        </p>
        <div className="flex items-center gap-3 mt-auto pt-3 border-t border-liness">
          <Link to={`/programs/${p.id}`} className="text-[12.5px] font-bold text-accent hover:text-rust transition-colors">Program page</Link>
          <Link to={archived ? `/projects?prog=${encodeURIComponent(archived)}` : "/projects"}
            className="ml-auto text-[12px] font-semibold text-cocoa border-b border-dashed border-dim pb-0.5 hover:text-accent hover:border-accent transition-colors">
            {archived ? "Project archive" : "Related projects"}
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ── the participation record for all thirteen programs ─────── */
type YearGrid = Map<string, Map<number, number>>;
type RosterSlot = { orgs: number; projects: number; source: Evidence };

function ArchiveBand({ grid, loading, roster, idx }: { grid: YearGrid | null; loading: boolean; roster: Record<string, RosterSlot>; idx: RosterIndex }) {
  const years = useMemo(() => {
    if (!grid) return [2026, 2025, 2024, 2023, 2022];
    const set = new Set<number>();
    for (const byYear of grid.values()) for (const y of byYear.keys()) set.add(y);
    return [...set].sort((a, b) => b - a);
  }, [grid]);

  const total = (name: string) =>
    grid ? [...(grid.get(name)?.values() ?? [])].reduce((a, b) => a + b, 0) : 0;

  const orgTotal = Object.values(roster).reduce((s, r) => s + r.orgs, 0);

  return (
    <section className="bg-card border border-line rounded-[22px] p-[22px] shadow-soft overflow-x-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <h2 className="panel-h text-[18px]">The <Word>participation record</Word></h2>
          <p className="text-cocoa text-[12.5px] mt-1.5 max-w-[680px] leading-[1.6]">
            Every program we track, with the organizations it actually named and the projects it
            actually accepted. Pick a number to open that slice - the org count opens the roster on
            the program page, where each list says whether it came from an archive, an API or a
            published roster. Where an organizer publishes nothing, the row says so.
          </p>
        </div>
        <Link to="/projects" className={btn("outline", "sm")}>Browse the whole archive</Link>
      </div>
      <table className="w-full border-collapse min-w-[680px]">
        <thead>
          <tr>
            <th className="text-left font-mono text-[9.5px] uppercase tracking-[.12em] text-dim pb-2.5 font-medium">Program</th>
            <th className="font-mono text-[9.5px] uppercase tracking-[.12em] text-accent pb-2.5 font-medium text-right">Orgs</th>
            {years.map((y) => (
              <th key={y} className="font-mono text-[9.5px] uppercase tracking-[.12em] text-dim pb-2.5 font-medium text-right">
                {loading ? "…" : y}
              </th>
            ))}
            <th className="font-mono text-[9.5px] uppercase tracking-[.12em] text-dim pb-2.5 font-medium text-right">Projects</th>
          </tr>
        </thead>
        <tbody>
          {PROGRAMS.map((p) => {
            const name = ARCHIVE_OF[p.id];
            const byYear = name ? grid?.get(name) : undefined;
            const r = roster[p.id];
            return (
              <tr key={p.id} className="border-t border-liness">
                <td className="py-2.5 pr-3">
                  <Link to={`/programs/${p.id}`} className="text-[13px] font-semibold text-ink hover:text-accent transition-colors">
                    {p.name}
                  </Link>
                </td>
                <td className="text-right py-2.5">
                  {r ? (
                    <Link to={`/programs/${p.id}`} title={EVIDENCE_WORD[r.source]}
                      className="font-mono text-[12.5px] font-bold text-accent hover:text-rust transition-colors tabular-nums">
                      {fmt(r.orgs)}
                    </Link>
                  ) : <span className="font-mono text-[10px] uppercase tracking-[.08em] text-dim/70">none</span>}
                </td>
                {years.map((y) => {
                  const n = byYear?.get(y) ?? 0;
                  return (
                    <td key={y} className="text-right py-2.5">
                      {n > 0 && name ? (
                        <Link to={`/projects?prog=${encodeURIComponent(name)}&year=${y}`}
                          className="font-mono text-[12.5px] text-cocoa hover:text-accent transition-colors tabular-nums">
                          {fmt(n)}
                        </Link>
                      ) : <span className="font-mono text-[12.5px] text-dim/60">–</span>}
                    </td>
                  );
                })}
                <td className="text-right py-2.5 font-mono text-[12.5px] font-bold text-cocoa tabular-nums"
                  title={r ? `${EVIDENCE_WORD[r.source]} · the program's full record, which can run wider than the listing below` : "from the browsable listing"}>
                  {r ? fmt(r.projects) : name ? (loading ? "…" : fmt(total(name))) : <span className="text-dim/60 font-normal">–</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="font-mono text-[10px] uppercase tracking-[.11em] text-dim mt-4 leading-[1.9]">
        {loading
          ? "Counting the archive…"
          : <>
            {Object.keys(roster).length} programs publish a participant list, and every one of them is on
            its own page - <b className="text-cocoa">{fmt(idx.totals?.orgRows ?? orgTotal)}</b> organization
            rows, <b className="text-cocoa">{fmt(idx.totals?.distinctOrgs ?? orgTotal)}</b> of them distinct after
            names and GitHub logins are folded together, <b className="text-cocoa">{fmt(idx.totals?.orgsInMoreThanOneProgram ?? 0)}</b>
            {" "}shared by more than one program. The{" "}
            {PROGRAMS.length - Object.keys(roster).length} programs with no public roster say so on their page
            instead of guessing. The year columns count the rows in the browsable listing; the Projects column
            is that program's own record, which can run wider - GSoC's mirror goes back to 2016, its listing
            covers 2022 onward.
            {idx.lf ? <> The Linux Foundation's own gateway adds <b className="text-cocoa">{fmt(idx.lf.memberOrgs)}</b> member
              organizations across {Object.keys(idx.lf.foundations).length} foundations - a different population,
              shown on the LFX page beside its {roster.lfx?.orgs ?? 47} mentorship hosts.</> : null}
            {" "}Roster built {idx.generated}.
          </>}
      </p>
    </section>
  );
}

export default function Programs() {
  const [status, setStatus] = useState("all");
  const [grid, setGrid] = useState<YearGrid | null>(null);
  const rst = useRosterIndex();

  useEffect(() => {
    let go = true;
    const bump = (rows: { program?: string; y: number }[], fallback: string) => {
      setGrid((prev) => {
        const next: YearGrid = new Map(prev);
        for (const r of rows) {
          const name = r.program ?? fallback;
          const byYear = next.get(name) ?? new Map<number, number>();
          byYear.set(r.y, (byYear.get(r.y) ?? 0) + 1);
          next.set(name, byYear);
        }
        return next;
      });
    };
    Promise.all([
      fetch("/data/gsoc-projects.json").then((r) => (r.ok ? r.json() : { projects: [] })),
      fetch("/data/otherProjects.json").then((r) => (r.ok ? r.json() : { projects: [] })),
    ])
      .then(([gsoc, other]) => {
        if (!go) return;
        // fold both files into one grid without clobbering each other
        setGrid(new Map());
        bump((gsoc.projects ?? []).map((p: { y: number }) => ({ ...p, program: "GSoC" })), "GSoC");
        bump(other.projects ?? [], "LFX");
      })
      .catch(() => { if (go) setGrid(new Map()); });
    return () => { go = false; };
  }, []);

  const list = useMemo(
    () => PROGRAMS.filter((p) => status === "all" || p.status === status),
    [status],
  );
  const live = PROGRAMS.filter((p) => p.status === "live").length;

  return (
    <div className={`${W} pt-14 pb-16`}>
      <p className="font-mono text-[10.5px] tracking-[.14em] uppercase text-dim">
        <Link to="/" className="hover:text-accent">Platform</Link> <span className="text-accent">›</span> <span className="text-cocoa">Programs</span>
      </p>
      <h1 className="font-display font-extrabold tracking-[-.02em] leading-[1.08] mt-3.5 mb-3 text-[clamp(33px,4.2vw,52px)]">
        Open source <Word>programs</Word>
      </h1>
      <p className="text-ink font-medium max-w-[720px] text-[16.5px] leading-[1.6]">
        Mentored seasons with real stipends and a public record - {PROGRAMS.length} tracked programs,{" "}{live} in
        session right now. Every page carries the organizations that took part and the work they recorded,
        counted from the archive, API or participant list that program actually publishes rather than estimated.
      </p>

      {/* status filter */}
      <div className="flex gap-2 flex-wrap mt-7" role="group" aria-label="Filter programs by status">
        {STATUS_FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)}
            className={`font-mono text-[10.5px] font-bold uppercase tracking-[.1em] px-3.5 py-2 rounded-full border transition-colors cursor-pointer ${
              status === v ? "bg-coffee text-foam border-coffee" : "bg-card text-cocoa border-line hover:border-accent/50 hover:text-accent"
            }`}>
            {l}
          </button>
        ))}
      </div>
      {!rst.ready && (
        <p className="font-mono text-[10.5px] uppercase tracking-[.11em] text-dim mt-3">Loading the participation record…</p>
      )}

      {/* the cards */}
      <div className="grid grid-cols-3 gap-5 mt-7 max-[1100px]:grid-cols-2 max-[680px]:grid-cols-1">
        {list.map((p) => <ProgCard key={p.id} p={p} roster={rst.byId[p.id]} />)}
      </div>
      {list.length === 0 && (
        <p className="text-cocoa text-[14px] mt-10">Nothing in that bucket this cycle - try "Everything".</p>
      )}

      {/* five-year archive */}
      <div className="mt-14">
        <ArchiveBand grid={grid} loading={grid === null} roster={rst.byId} idx={rst} />
      </div>

      {/* close */}
      <section className="mt-14 bg-gradient-to-br from-clay to-peach/60 border border-line rounded-[22px] px-8 py-8 flex items-center gap-6 flex-wrap max-[700px]:px-5">
        <div className="min-w-[280px] flex-1">
          <h2 className="card-title-xl">Pick a season, then pick the issues</h2>
          <p className="text-cocoa text-[13.5px] leading-[1.6] mt-2 max-w-[600px]">
            Programs decide the calendar; the work is still real repositories with open issues.
            The finder indexes tens of thousands of them, filterable down to one week of effort.
          </p>
        </div>
        <Link to="/issues" className={btn("primary", "lg") + " shrink-0"}>Open the issue finder</Link>
      </section>
    </div>
  );
}
