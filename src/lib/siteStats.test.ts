/* ══ siteStats.test.ts — the chrome cannot drift from the data ════════ */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REPOS } from "@/data/repos";
import { PROGRAMS } from "@/data/orgs";
import { CRAWL } from "@/data/crawlStats";
import { ARCHIVE_PROGRAMS, ARCHIVE_PROJECTS, ARCHIVE_ROWS, STATS, fmt, statsLine } from "./siteStats";

const archiveLength = (file: string): number => {
  const json = JSON.parse(readFileSync(new URL(`../../public/data/${file}`, import.meta.url), "utf8"));
  return (json.projects ?? []).length;
};

const INDEX_FILE = new URL("../../public/data/program-projects/index.json", import.meta.url);
type IndexEntry = { label: string; projects: number; rows?: number; capped?: boolean; file: string | null };
const readIndex = (): Record<string, IndexEntry> =>
  JSON.parse(readFileSync(INDEX_FILE, "utf8")).programs as Record<string, IndexEntry>;

/** rows a shard file actually carries. The build has shipped two shapes - rows
 *  in `projects`, or a count in `projects` with the rows in `list` - so read
 *  whichever is there and fail loudly if neither is, rather than letting the
 *  count come back `undefined` and every comparison below pass by accident. */
const shard = (id: string): number => {
  const j = JSON.parse(readFileSync(new URL(`../../public/data/program-projects/${id}.json`, import.meta.url), "utf8"));
  if (Array.isArray(j.projects)) return j.projects.length;
  if (Array.isArray(j.list)) return j.list.length;
  throw new Error(`${id}.json carries neither a projects array nor a list of rows`);
};

/* GSoC, LFX, Outreachy and Summer of Bitcoin are browsed from the two big
   exports; their shards are the same rows reshaped, so counting both would
   publish a project twice. Every other program adds its own record. */
const IN_BIG_ARCHIVES = ["gsoc", "lfx", "outreachy", "sob"];

describe("stats the footer and metadata quote", () => {
  it("counts the catalog from the data module, not a literal", () => {
    expect(STATS.repos).toBe(REPOS.length);
    expect(STATS.catalog).toBeGreaterThan(STATS.repos);
    expect(STATS.programs).toBe(PROGRAMS.length);
  });

  it("keeps the archive literal equal to the two big files plus every other shard", () => {
    const index = readIndex();
    const others = Object.entries(index).filter(([id, e]) => e.file && !IN_BIG_ARCHIVES.includes(id));
    const big = archiveLength("gsoc-projects.json") + archiveLength("otherProjects.json");
    expect(ARCHIVE_PROJECTS).toBe(big + others.reduce((s, [, e]) => s + e.projects, 0));
    /* and the listing figure for the rows those shards actually serve */
    expect(ARCHIVE_ROWS).toBe(big + others.reduce((s, [id]) => s + shard(id), 0));
    expect(ARCHIVE_PROGRAMS).toBe(Object.keys(index).length);
  });

  it("indexes rows that exist, and never reports a capped shard as the record", () => {
    const index = readIndex();
    for (const [id, e] of Object.entries(index)) {
      const carried = shard(id);
      expect(carried, `${id} shard row count`).toBe(e.rows ?? carried);
      expect(e.projects, `${id} full record is at least its shard`).toBeGreaterThanOrEqual(carried);
      expect(e.capped).toBe(carried < e.projects);
    }
    /* the four programs inside the big exports must still agree with them */
    expect(index.gsoc.projects).toBe(archiveLength("gsoc-projects.json"));
    const others = archiveLength("otherProjects.json");
    expect(index.lfx.projects + index.outreachy.projects + index.sob.projects).toBe(others);
  });

  it("quotes the crawl for every issue number", () => {
    expect(STATS.issues).toBe(CRAWL.issues);
    expect(STATS.issueRepos).toBe(CRAWL.reposWithIssues);
    expect(STATS.beginnerIssues).toBe(CRAWL.beginnerLabelled);
    expect(STATS.crawledAt).toBe(CRAWL.crawledAt);
  });

  it("never claims more issue-bearing repos than the crawl covered", () => {
    expect(STATS.issueRepos).toBeLessThanOrEqual(CRAWL.catalogRepos);
    expect(STATS.beginnerIssues).toBeLessThanOrEqual(STATS.issues);
  });
});

describe("copy helpers", () => {
  it("formats with thousands separators", () => {
    expect(fmt(1528)).toBe("1,528");
  });

  it("writes a summary line made only of live numbers", () => {
    const line = statsLine();
    expect(line).toContain(`${fmt(STATS.issues)} open issues`);
    expect(line).toContain(`${STATS.programs} tracked open-source programs`);
    expect(line).not.toMatch(/NaN|undefined|hackathon/i);
  });
});
