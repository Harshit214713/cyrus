/* ══ sitemap.ts — every indexable URL, derived from the data ═══════════
   Nothing here is typed by hand: adding a repo, a program or an org
   automatically extends the sitemap on the next build. /dashboard and
   its tabs stay out because they are personal views behind a session,
   and the API namespace is not a page.                              ══ */
import type { MetadataRoute } from "next";
import { REPOS } from "@/data/repos";
import { PROGRAM_REPOS } from "@/data/programRepos";
import { ORGS, PROGRAMS } from "@/data/orgs";
import { SITE_ORIGIN } from "@/lib/seo";

/** same union the site resolves /repo/:id against, without pulling in the
 *  client-side helpers in lib/util (they import React hooks). */
const CATALOG = [...REPOS, ...PROGRAM_REPOS];

const HUBS: [string, number][] = [
  ["", 1],
  ["/skills", 0.9],
  ["/issues", 0.9],
  ["/leaderboard", 0.9],
  ["/projects", 0.9],
  ["/programs", 0.9],
  ["/sponsors", 0.8],
  ["/organizations", 0.8],
  ["/about", 0.5],
  ["/platform/features", 0.6],
  ["/platform/how", 0.6],
  ["/platform/trust", 0.5],
  ["/privacy", 0.2],
  ["/terms", 0.2],
  ["/cookies", 0.2],
  ["/affiliations", 0.2],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${SITE_ORIGIN}${path}`;

  return [
    ...HUBS.map(([path, priority]) => ({
      url: url(path),
      changeFrequency: "daily" as const,
      priority,
    })),
    ...CATALOG.map((r) => ({
      url: url(`/repo/${encodeURIComponent(r.repo)}`),
      lastModified: new Date(`${r.updated}T00:00:00Z`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...PROGRAMS.map((p) => ({
      url: url(`/programs/${p.id}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...ORGS.map((o) => ({
      url: url(`/organizations/${o.login}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
