"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";

/**
 * The landing page's nav. At the top it sits straight on the hero with no bar of its own, so the
 * two read as one section; once the page scrolls it becomes a white, blurred bar so content passing
 * underneath stays out of the way.
 */
export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-300",
        scrolled ? "border-[#141312]/[0.06] bg-white/90 backdrop-blur" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label={`${site.name} home`}>
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 text-[14px]">
          <Link href="/pricing" className="hidden rounded-full px-3 py-2 text-[#55524d] hover:text-[#141312] sm:inline">
            Pricing
          </Link>
          <Link href="/signin" className="rounded-full px-3 py-2 text-[#55524d] hover:text-[#141312]">
            Sign in
          </Link>
          <Link
            href={site.appHref}
            className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#141312] py-2 pr-3 pl-4 text-white hover:bg-[#34312e]"
          >
            Open dashboard
            <ChevronRight aria-hidden className="size-3.5" strokeWidth={2} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
