"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Section, SectionHeading } from "../layout/Container";
import { Reveal } from "../motion/Reveal";

type Item = { q: string; a: string };

/** Two-column FAQ: heading on the left, accordion on the right (one open at a time). */
export function Faq({ title, body, items }: { title: string; body?: string; items: Item[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <Section innerClassName="grid gap-10 px-5 py-20 sm:px-8 md:px-14 md:py-24 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
      <Reveal>
        <SectionHeading title={title} body={body} align="left" />
      </Reveal>
      <Reveal delay={80}>
        <ul className="border-t border-line">
          {items.map((item, i) => {
            const isOpen = open === i;
            const panelId = `${baseId}-panel-${i}`;
            return (
              <li key={item.q} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left text-[15.5px] font-medium text-fg-heading transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
                  >
                    {item.q}
                    <ChevronDown
                      aria-hidden
                      strokeWidth={1.75}
                      className={cn("size-4 shrink-0 text-fg-muted transition-transform duration-300 ease-out-soft", isOpen && "rotate-180")}
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out-soft",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="t-body max-w-[560px] pb-5">{item.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Reveal>
    </Section>
  );
}
