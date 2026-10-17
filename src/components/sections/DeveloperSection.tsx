"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { developer, languages, steps, type Lang } from "@/data/home";
import { highlight, type Token } from "@/lib/highlight";
import { cn } from "@/lib/cn";
import { Section, SectionHeading } from "../layout/Container";
import { Reveal } from "../motion/Reveal";

/** Heading, workflow step tabs and a code window whose language and example both switch. */
export function DeveloperSection() {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<Lang>("typescript");

  return (
    <Section id={developer.id} innerClassName="px-4 py-20 sm:px-6 md:px-10 md:py-28">
      <Reveal>
        <SectionHeading eyebrow={developer.eyebrow} title={developer.title} body={developer.body} />
      </Reveal>

      <Reveal delay={100} className="mx-auto mt-12 max-w-[880px]">
        <StepTabs step={step} onChange={setStep} />
        <CodeDemo code={steps[step].code[lang]} lang={lang} onLangChange={setLang} codeKey={`${step}-${lang}`} />
      </Reveal>
    </Section>
  );
}

function StepTabs({ step, onChange }: { step: number; onChange: (i: number) => void }) {
  return (
    <div role="tablist" aria-label="Integration steps" className="mb-4 grid gap-2 sm:grid-cols-3">
      {steps.map((s, i) => {
        const selected = i === step;
        return (
          <button
            key={s.title}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(i)}
            className={cn(
              "group/step relative flex items-start gap-3 overflow-hidden rounded-xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
              selected ? "border-line-strong bg-canvas shadow-card" : "border-line bg-transparent hover:border-line-strong hover:bg-canvas/60",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] transition-colors",
                selected ? "bg-fg text-white" : "border border-line bg-canvas text-fg-muted",
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-[14px] font-medium", selected ? "text-fg" : "text-fg-heading")}>{s.title}</span>
              <span className="block text-[12.5px] leading-[18px] text-fg-muted">{s.body}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const tokenClass: Record<NonNullable<Token["kind"]>, string> = {
  comment: "text-[#a19f97] italic",
  string: "text-[#3d7a5a]",
  keyword: "text-[#8a4a8f]",
  number: "text-[#b0631a]",
  fn: "text-[#3a5fa8]",
  prop: "text-[#2f6f86]",
  flag: "text-[#8a4a8f]",
  var: "text-[#b0631a]",
};

/** Code window with language tabs, line numbers and a copy button. Exported as CodeWindow for reuse. */
export function CodeDemo({
  code,
  lang,
  onLangChange,
  codeKey,
}: {
  code: string;
  lang: Lang;
  onLangChange: (l: Lang) => void;
  codeKey: string;
}) {
  const [copied, setCopied] = useState(false);
  const lines = highlight(code);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be unavailable (insecure context); nothing useful to do.
    }
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-canvas shadow-card">
      <div className="flex items-center gap-1 border-b border-line bg-subtle/70 px-2">
        <div role="tablist" aria-label="Language" className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-1.5 [scrollbar-width:none]">
          {languages.map((l) => (
            <button
              key={l.id}
              role="tab"
              type="button"
              aria-selected={lang === l.id}
              onClick={() => onLangChange(l.id)}
              className={cn(
                "h-7 shrink-0 rounded-md px-2.5 text-[12.5px] transition-colors focus-visible:outline-2 focus-visible:outline-fg",
                lang === l.id
                  ? "bg-canvas font-medium text-fg shadow-[0_1px_2px_rgba(28,25,20,0.08),0_0_0_1px_rgba(28,25,20,0.08)]"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-fg"
        >
          {copied ? <Check strokeWidth={2} className="size-3.5 text-ok" /> : <Copy strokeWidth={1.6} className="size-3.5" />}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre key={codeKey} className="animate-fade-up min-h-[300px] py-4 font-mono text-[13px] leading-[22px] sm:text-[13.5px]">
          <code>
            {lines.map((tokens, i) => (
              <span key={i} className="flex pr-6">
                <span aria-hidden className="w-12 shrink-0 pr-4 text-right text-fg-muted/60 select-none tabular-nums">
                  {i + 1}
                </span>
                <span className="whitespace-pre text-fg-heading">
                  {tokens.length === 0 ? " " : tokens.map((t, j) => (
                    <span key={j} className={t.kind ? tokenClass[t.kind] : undefined}>
                      {t.text}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
