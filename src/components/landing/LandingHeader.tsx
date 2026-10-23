"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";

/**
 * The landing page's nav. It floats over the blue hero (`#hero`) with no bar of its own, in white,
 * so the two read as one section; once the hero has scrolled out from under it, it turns into a
 * white bar with dark text for the rest of the page.
 */
export function LandingHeader() {
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    // The header is 64px tall: the hero counts as "under it" while any of it is below that line.
    const io = new IntersectionObserver(([e]) => setOverHero(e.isIntersecting), { rootMargin: "-64px 0px 0px 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const link = cn("rounded-full px-3 py-2 transition-colors duration-300", overHero ? "text-white/80 hover:text-white" : "text-[#55524d] hover:text-[#141312]");

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-300",
        overHero ? "border-transparent bg-transparent" : "border-[#141312]/[0.06] bg-white/90 backdrop-blur",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label={`${site.name} home`}>
          <Logo tone={overHero ? "light" : "dark"} />
        </Link>
        <nav className="flex items-center gap-1 text-[14px]">
          <Link href="/pricing" className={cn(link, "hidden sm:inline")}>
            Pricing
          </Link>
          <Link href="/signin" className={link}>
            Sign in
          </Link>
          <Link
            href={site.appHref}
            className={cn(
              "ml-2 inline-flex items-center gap-1 rounded-full py-2 pr-3 pl-4 transition-colors duration-300",
              overHero ? "bg-white text-[#141312] hover:bg-[#ecebe7]" : "bg-[#141312] text-white hover:bg-[#34312e]",
            )}
          >
            Open dashboard
            <ChevronRight aria-hidden className="size-3.5" strokeWidth={2} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
