import Link from "next/link";
import { footer, site } from "@/data/site";
import { Logo } from "../ui/Logo";
import { SystemStatus } from "./SystemStatus";

export function AnnouncementBar() {
  const a = site.announcement;
  if (!a.enabled) return null;
  return (
    <div className="border-b border-line bg-muted/70">
      <Link
        href={a.href}
        className="group/ab mx-auto flex h-9 max-w-[1200px] items-center justify-center gap-2 px-5 text-[13px] text-fg-body transition-colors hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fg"
      >
        <span className="hidden rounded-[5px] border border-line bg-canvas px-1.5 py-px text-[11px] font-medium text-fg sm:inline">
          {a.label}
        </span>
        <span className="truncate">{a.text}</span>
        <span aria-hidden className="transition-transform duration-200 group-hover/ab:translate-x-0.5">
          →
        </span>
      </Link>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-subtle">
      <div className="mx-auto w-full max-w-[1200px] md:px-8">
        <div className="grid gap-10 border-line px-5 pt-14 pb-12 md:border-x md:px-10 lg:grid-cols-[1.3fr_2fr] lg:gap-16">
          <div className="max-w-xs">
            <Logo />
            <p className="t-small mt-4">{site.tagline}</p>
            <SystemStatus className="mt-6" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {footer.columns.map((col) => (
              <div key={col.title}>
                <h2 className="t-label mb-3.5">{col.title}</h2>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-[13.5px] text-fg-body transition-colors hover:text-fg">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-line px-5 py-6 md:border-x md:px-10">
          <p className="text-[12px] leading-5 text-fg-muted">{footer.disclaimer}</p>
          <div className="mt-4 flex flex-col gap-3 text-[12.5px] text-fg-muted sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {site.name}
            </p>
            <ul className="flex gap-5">
              {footer.legal.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition-colors hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
