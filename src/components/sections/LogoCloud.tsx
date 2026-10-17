import { logos } from "@/data/home";
import { Section } from "../layout/Container";
import { Reveal } from "../motion/Reveal";

/** Simple geometric marks so the placeholder wordmarks don't all look the same. */
const marks = [
  <circle key="c" cx="8" cy="8" r="6" />,
  <rect key="r" x="2" y="2" width="12" height="12" rx="3" />,
  <path key="t" d="M8 2 14 13H2z" />,
  <path key="d" d="M8 1.5 14.5 8 8 14.5 1.5 8z" />,
  <path key="h" d="M2 8a6 6 0 0 1 12 0z" />,
  <path key="p" d="M3 3h10v4H7v6H3z" />,
  <path key="s" d="M2 5h12M2 8h12M2 11h12" stroke="currentColor" strokeWidth="2" fill="none" />,
  <path key="o" d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" fillRule="evenodd" />,
];

/**
 * Grayscale "customer" strip. These are placeholder names; swap in licensed logos in data/home.ts.
 * Desktop shows a static bordered grid; small screens get a very slow marquee.
 */
export function LogoCloud({ title = "Built for independent stores and the teams that run them" }: { title?: string }) {
  const items = logos.map((name, i) => (
    <span key={name} className="inline-flex items-center gap-2 whitespace-nowrap text-fg-muted">
      <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current opacity-80">
        {marks[i % marks.length]}
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.02em]">{name}</span>
    </span>
  ));

  return (
    <Section hatched innerClassName="py-0">
      <Reveal>
        <p className="border-b border-line px-5 py-8 text-center text-[14px] text-fg-body md:py-10">{title}</p>
        {/* desktop grid */}
        <ul className="hidden grid-cols-4 md:grid">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex h-[104px] items-center justify-center border-line transition-colors duration-300 hover:bg-canvas [&:nth-child(-n+4)]:border-b [&:not(:nth-child(4n))]:border-r"
            >
              {item}
            </li>
          ))}
        </ul>
        {/* mobile marquee */}
        <div
          className="overflow-hidden py-8 md:hidden"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
          }}
        >
          <div className="animate-marquee flex w-max gap-10 pr-10">
            {items}
            <span aria-hidden className="contents">
              {items}
            </span>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
