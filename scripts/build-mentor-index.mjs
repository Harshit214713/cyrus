/* ══ scripts/build-mentor-index.mjs — the mentors our archive actually names.
   node scripts/build-mentor-index.mjs

   Every project row in public/data/gsoc-projects.json and
   public/data/otherProjects.json carries an "m" field: the comma-separated list
   of mentor names the program published alongside that project. Splitting those
   gives a real, countable mentor record - not an estimate of how many mentors a
   program has ever had, but the names attached to accepted projects we hold.

   Two honest limits, both stated on the page that shows them:
   - the window is what we archived (GSoC 2022-2026, the others 2022-2026), while
     the organizer's own headline totals cover every year since 2005;
   - a name is a string, not a person. "Kris Stern" appearing twice is counted
     once, and two different people called "Ravi Sahita" would be counted as one.
     Distinct names, therefore, never distinct humans.

   Output lands in public/data/mentor-index.json because a few thousand names
   have no business being in the JavaScript bundle.                          ═ */
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public/data/mentor-index.json");

const PROGRAM_OF_FILE = { "gsoc-projects.json": "Google Summer of Code" };
const TOP = 240;

/** "A. Bee, C. Dee" -> ["A. Bee", "C. Dee"]; fragments too short to be a name go */
const splitNames = (m) => (Array.isArray(m) ? m.join(",") : String(m ?? ""))
  .split(",")
  .map((s) => s.replace(/\s+/g, " ").trim())
  .filter((s) => s.length >= 3 && /[a-zà-ÿ]/i.test(s));

const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N} .'-]/gu, "").trim();
/** "Machine Learning for Science (ML4SCI)" -> the short forms it spells out */
const parenTokens = (s) => (String(s ?? "").match(/\(([^()]{2,20})\)/g) ?? [])
  .map((t) => norm(t.slice(1, -1)));
const compact = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** program -> lowercase name -> record */
const index = new Map();
const LABEL = new Map();
const ROWS = new Map();

function absorb(rows, program, id) {
  LABEL.set(id, program);
  ROWS.set(id, [...(ROWS.get(id) ?? []), ...rows]);
  let bucket = index.get(id);
  if (!bucket) { bucket = new Map(); index.set(id, bucket); }
  for (const p of rows) {
    const years = new Set([p.y].flat().map(Number).filter(Boolean));
    /* the archive occasionally puts the organization itself in the mentor list.
       Two shapes of that: the org's full name, and the short form it spells out
       in parentheses - "ML4SCI" for "Machine Learning for Science (ML4SCI)".
       Neither is a person, so neither belongs in a mentor count. */
    const orgName = norm(p.o ?? "");
    const orgCompact = compact(p.o ?? "");
    const shorts = parenTokens(p.o);
    for (const raw of splitNames(p.m)) {
      const key = norm(raw);
      if (!key || key === orgName) continue;
      const kc = compact(raw);
      if (shorts.some((s) => compact(s) === kc)) continue;
      if (kc.length >= 6 && kc === orgCompact) continue;
      const rec = bucket.get(key) ?? { name: raw, programs: {}, projects: 0, years: [], orgs: [] };
      /* keep the prettiest spelling seen */
      if (rec.name.length && raw.length > rec.name.length && norm(raw) === norm(rec.name)) rec.name = raw;
      const seen = rec.programs[id]?.projects ?? 0;
      rec.programs[id] = { label: program, projects: seen + 1 };
      rec.projects += 1;
      for (const y of years) if (!rec.years.includes(y)) rec.years.push(y);
      if (p.o && !rec.orgs.includes(p.o)) rec.orgs.push(p.o);
      bucket.set(key, rec);
    }
  }
}

const gsoc = JSON.parse(readFileSync(join(ROOT, "public/data/gsoc-projects.json"), "utf8"));
absorb(gsoc.projects, PROGRAM_OF_FILE["gsoc-projects.json"], "gsoc");

const other = JSON.parse(readFileSync(join(ROOT, "public/data/otherProjects.json"), "utf8"));
const byProgram = new Map();
for (const p of other.projects) {
  const label = p.program || "Other";
  if (!byProgram.has(label)) byProgram.set(label, []);
  byProgram.get(label).push(p);
}
const ID_OF = { "LFX Mentorship": "lfx", "Outreachy": "outreachy", "Summer of Bitcoin": "sob" };
for (const [label, rows] of byProgram) absorb(rows, label, ID_OF[label] ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-"));

const programs = {};
for (const [id, bucket] of index) {
  const all = [...bucket.values()];
  const projectsWithMentors = (ROWS.get(id) ?? []).filter((p) => splitNames(p.m).length).length;
  const years = [...new Set((ROWS.get(id) ?? []).flatMap((p) => [p.y].flat().map(Number).filter(Boolean)))].sort();
  all.sort((a, b) => b.projects - a.projects || a.name.localeCompare(b.name));
  programs[id] = {
    label: LABEL.get(id) ?? id,
    years,
    mentors: all.length,
    projectsWithMentors,
    top: all.slice(0, TOP).map((r) => ({
      name: r.name,
      projects: r.projects,
      years: r.years.sort(),
      orgs: r.orgs.slice(0, 4),
      orgCount: r.orgs.length,
    })),
  };
}

const file = {
  generated: new Date().toISOString().slice(0, 10),
  note: "Names are the mentors published alongside accepted projects in the archive we hold. Distinct spellings, not distinct people, and an organization that listed itself as mentor is dropped.",
  programs,
};
const tmp = OUT + ".tmp";
writeFileSync(tmp, JSON.stringify(file, null, 1));
renameSync(tmp, OUT);

for (const [id, p] of Object.entries(programs)) {
  console.log(`${id.padEnd(12)} ${String(p.mentors).padStart(5)} distinct mentor names across ${String(p.projectsWithMentors).padStart(5)} archived projects`);
}
