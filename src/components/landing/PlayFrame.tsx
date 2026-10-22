"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Stage for an illustration that acts itself out: sets `data-play="on"` while on screen and replays
 * every `loopMs`, so CSS (`.play-item`, `.play-bar`, `.play-swap-*`, `.play-press` in globals.css)
 * can run the choreography. Sits on a faint dot grid, after ramp.com's cards.
 */
export function PlayFrame({ children, loopMs = 7000 }: { children: React.ReactNode; loopMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timers: number[] = [];
    const stop = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };
    const cycle = () => {
      setPlay(true);
      timers.push(window.setTimeout(() => setPlay(false), loopMs - 600));
      timers.push(window.setTimeout(cycle, loopMs));
    };
    const io = new IntersectionObserver(
      ([e]) => {
        stop();
        if (e.isIntersecting) cycle();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
    };
  }, [loopMs]);

  return (
    <div
      ref={ref}
      aria-hidden
      data-play={play ? "on" : "off"}
      className="dot-bg flex h-56 items-center justify-center rounded-xl bg-[#f6f6f3] px-6 sm:h-64"
    >
      {children}
    </div>
  );
}
