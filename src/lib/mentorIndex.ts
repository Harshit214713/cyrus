/* ══ mentorIndex.ts — the mentors each program named on its own project records.
   Built by scripts/build-mentor-index.mjs from public/data/mentor-index.json,
   which splits the mentor field of every archived project. Loaded on demand and
   cached for the session, because a few thousand names have no business being in
   the bundle.

   What this is not: a headcount of people. The archive publishes names as strings
   for a window we chose (2022-2026), so two spellings of one person count twice
   and one person across two programs counts once per program. The page says so. ═ */
import { useEffect, useState } from "react";

export type MentorRow = {
  name: string;
  projects: number;
  years: number[];
  orgs: string[];
  orgCount: number;
};

export type MentorProgram = {
  label: string;
  /** the years our project archive covers for this program, e.g. [2022, 2026] */
  years: number[];
  mentors: number;
  projectsWithMentors: number;
  top: MentorRow[];
};

export type MentorFile = {
  generated: string;
  note: string;
  programs: Record<string, MentorProgram>;
};

export type Mentors = {
  ready: boolean;
  program: MentorProgram | null;
  generated: string;
  note: string;
};

let cache: Promise<MentorFile | null> | null = null;

export function loadMentors(): Promise<MentorFile | null> {
  if (!cache) {
    cache = fetch("/data/mentor-index.json")
      .then((r) => (r.ok ? (r.json() as Promise<MentorFile>) : null))
      .catch(() => null);
  }
  return cache;
}

const EMPTY: Mentors = { ready: false, program: null, generated: "", note: "" };

export function useMentors(id: string): Mentors {
  const [state, setState] = useState<Mentors>(EMPTY);
  useEffect(() => {
    let go = true;
    loadMentors().then((file) => {
      if (!go) return;
      setState({
        ready: true,
        program: file?.programs?.[id] ?? null,
        generated: file?.generated ?? "",
        note: file?.note ?? "",
      });
    });
    return () => { go = false; };
  }, [id]);
  return state;
}

/** the four programs whose archives name mentors at all */
export const MENTOR_IDS = ["gsoc", "lfx", "sob"] as const;
