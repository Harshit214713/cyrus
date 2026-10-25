/* ══ Shell.tsx — client chrome: store, scroll, splash, nav, footer ═════ */
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { StoreProvider } from "@/lib/store";
import { useLocation } from "@/lib/router";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Palette from "@/components/Palette";
import AuthModal from "@/components/AuthModal";
import { Logo } from "@/components/ui";

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
    else setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [pathname, hash]);
  return null;
}

/* one-time intro curtain: marketing pages only, decided after mount so
   server HTML never carries it.

   The sequence is the brand, not a spinner: the mark draws itself (Logo's own
   `draw` pass - ring, then the commit dropping onto its end), the wordmark
   rises letter by letter behind it, the line of what the site is fades in
   under that, and the whole curtain lifts. Timed to about two seconds so it
   reads as an arrival and not a wait, and skipped outright for reduced-motion
   visitors and for every route inside the application shell. */
const CURSOR = 2050;                        /* curtain comes down at */
const WORD = "cyrus";
/* the same two curves the rest of the site moves on: settle, then leave */
const EASE_SILK = [0.22, 1, 0.36, 1] as const;
const EASE_LIFT = [0.76, 0, 0.24, 1] as const;

function Splash({ app }: { app: boolean }) {
  const [show, setShow] = useState(false);
  const [lift, setLift] = useState(false);
  const reduce = useReducedMotion();

  /* Deciding to play is a one-time question, answered from sessionStorage:
     StrictMode runs mount effects twice, and the second pass must not restart
     the curtain. Running the clock is a separate effect keyed on `show`, so
     the first pass's cleanup can never leave the page covered with no timers
     left to lift it. */
  useEffect(() => {
    if (app || reduce || sessionStorage.getItem("cyrus-splashed") === "1") return;
    sessionStorage.setItem("cyrus-splashed", "1");
    setShow(true);
  }, [app, reduce]);

  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = "hidden";
    const t1 = setTimeout(() => setLift(true), CURSOR);
    const t2 = setTimeout(() => setShow(false), CURSOR + 620);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.style.overflow = "";
    };
  }, [show]);

  const rise: Variants = {
    hidden: { y: 16, opacity: 0 },
    on: { y: 0, opacity: 1, transition: { duration: 0.42, ease: EASE_SILK } },
  };
  const wordParent: Variants = { hidden: {}, on: { transition: { staggerChildren: 0.05, delayChildren: 0.62 } } };

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="splash" aria-hidden="true"
          initial={{ y: 0 }} animate={{ y: lift ? "-100%" : 0 }}
          transition={{ duration: .62, ease: EASE_LIFT }}>
          <div className="flex flex-col items-center gap-4">
            {/* the mark draws its three arms and swings a third of a turn into
                place on its own (Logo's `draw`); the halo is the intro's own
                gesture - one ring expanding out from where it lands */}
            <div className="relative grid place-items-center">
              <motion.span className="absolute rounded-full border border-accent"
                initial={{ width: 78, height: 78, opacity: 0.5 }}
                animate={{ width: 190, height: 190, opacity: 0 }}
                transition={{ delay: 0.35, duration: 1.15, ease: EASE_SILK }}
              />
              <motion.div initial={{ opacity: 0, scale: 0.72 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: .7, ease: EASE_SILK }}>
                <Logo size={92} draw />
              </motion.div>
            </div>
            <motion.div className="flex font-display font-extrabold tracking-[-.03em] text-[38px] leading-none"
              variants={wordParent} initial="hidden" animate="on">
              {WORD.split("").map((ch, i) => (
                <motion.span key={i} variants={rise}>{ch}</motion.span>
              ))}
              <motion.span variants={rise} className="text-accent">.ai</motion.span>
            </motion.div>
            <motion.p className="font-mono text-[10px] uppercase tracking-[.2em] text-dim"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: .95, duration: .5 }}>
              open source · programs · skills
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  /* the board is an application: it owns its top bar and sidebar, so the
     marketing header and footer stay off those routes */
  const app = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  return (
    <StoreProvider>
      <ScrollManager />
      <Splash app={app} />
      <div className="min-h-screen flex flex-col">
        <a className="skip-link" href="#main">Skip to content</a>
        {!app && <Nav />}
        <main id="main" tabIndex={-1} className="flex-1">{children}</main>
        {!app && <Footer />}
      </div>
      <Palette />
      <AuthModal />
    </StoreProvider>
  );
}
