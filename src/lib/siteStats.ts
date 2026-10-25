/* ══ siteStats.ts — the numbers the site chrome quotes ════════════════
   Counts here are computed from the data modules, so a catalog refresh
   cannot leave the footer, the header and the page metadata describing
   a site that no longer exists. One value stays a literal: the program
   archive total, which lives in public/data/*.json rather than in TS.
   siteStats.test.ts asserts that literal against the two files, and the
   crawl totals against the generated crawl module.                    ══ */
import { REPOS } from "@/data/repos";
import { PROGRAM_REPOS } from "@/data/programRepos";
import { ORGS, PROGRAMS } from "@/data/orgs";
import { CRAWL } from "@/data/crawlStats";

/** gsoc-projects.json (5,238) + otherProjects.json (1,444) */
export const ARCHIVE_PROJECTS = 6_682;

/** 1528 -> "1,528" */
export const fmt = (n: number): string => n.toLocaleString("en-US");

export const STATS = {
  /** program-project repos in the browsable catalog */
  repos: REPOS.length,
  /** catalog repos plus the flagship program projects */
  catalog: REPOS.length + PROGRAM_REPOS.length,
  /** organization profiles built from live GitHub data, every one named by a program */
  orgs: ORGS.length,
  /** tracked open-source programs */
  programs: PROGRAMS.length,
  /** mentored projects in the program archive */
  archive: ARCHIVE_PROJECTS,
  /** open issues in the GitHub crawl */
  issues: CRAWL.issues,
  /** repositories the crawl found issues in */
  issueRepos: CRAWL.reposWithIssues,
  /** of those, how many carry a beginner label */
  beginnerIssues: CRAWL.beginnerLabelled,
  /** when the crawl last ran, ISO */
  crawledAt: CRAWL.crawledAt,
};

/** One-line summary for metadata descriptions and the footer stat strip. */
export function statsLine(): string {
  return `${fmt(STATS.issues)} open issues in ${fmt(STATS.issueRepos)} repositories, ${fmt(STATS.archive)} mentored program projects and ${STATS.programs} tracked open-source programs`;
}
