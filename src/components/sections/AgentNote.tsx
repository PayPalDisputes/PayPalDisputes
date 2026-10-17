"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { agentNotes } from "@/data/home";
import { site } from "@/data/site";
import { Section } from "../layout/Container";
import { Reveal } from "../motion/Reveal";
import { LogoMark } from "../ui/Logo";
import { Badge } from "../ui/primitives";

/**
 * Pull-quote band in the spot a testimonial would go, quoting the agent's own reasoning
 * on example cases instead of an invented customer.
 */
export function AgentNote() {
  const [index, setIndex] = useState(0);
  const note = agentNotes[index];
  const go = (d: number) => setIndex((i) => (i + d + agentNotes.length) % agentNotes.length);

  return (
    <Section className="bg-canvas" innerClassName="px-5 py-16 sm:px-8 md:px-14 md:py-24" aria-roledescription="carousel" aria-label="Agent notes">
      <Reveal className="grid gap-10 md:grid-cols-[180px_1fr] md:gap-14">
        <div className="flex items-start gap-4 md:flex-col">
          <div className="relative">
            <LogoMark className="size-16 md:size-[120px]" />
            <span className="absolute -right-1 -bottom-1 rounded-full border-2 border-canvas bg-ok px-1.5 text-[10px] font-medium leading-4 text-white">AI</span>
          </div>
          <p className="t-eyebrow md:mt-2">Case note</p>
        </div>

        <figure key={index} className="animate-fade-up min-w-0" aria-live="polite">
          <blockquote className="font-serif text-[28px] leading-[1.18] text-fg-heading sm:text-[34px] md:text-[40px]">
            “{note.quote}”
          </blockquote>
          <figcaption className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="flex items-center gap-2 text-[15px] font-medium text-fg">
                {site.name} agent
                <Badge tone={note.decision === "Fight" ? "outline" : note.decision === "Settle" ? "warn" : "neutral"}>{note.decision}</Badge>
              </p>
              <p className="mt-1 font-mono text-[12.5px] text-fg-muted">
                {note.caseId} · {note.meta}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="mr-2 font-mono text-[12px] tabular-nums text-fg-muted">
                {index + 1} / {agentNotes.length}
              </span>
              <NavButton label="Previous note" onClick={() => go(-1)}>
                <ChevronLeft strokeWidth={1.75} className="size-4" />
              </NavButton>
              <NavButton label="Next note" onClick={() => go(1)}>
                <ChevronRight strokeWidth={1.75} className="size-4" />
              </NavButton>
            </div>
          </figcaption>
        </figure>
      </Reveal>
    </Section>
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-full border border-line-strong bg-canvas text-fg-heading transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
    >
      {children}
    </button>
  );
}
