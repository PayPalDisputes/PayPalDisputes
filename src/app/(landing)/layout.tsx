import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Logo } from "@/components/ui/Logo";
import { footer, site } from "@/data/site";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Disputes", href: "/disputes" },
      { label: "Evidence", href: "/evidence" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Sign in", href: "/signin" },
    ],
  },
];

/** Shell for the landing page: a nav that floats over the hero, white page and a column footer. Always light. */
export default function LandingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-[#141312] [color-scheme:light]">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-[#141312] px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <LandingHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-6xl px-5 pt-16 pb-10 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-[#77736c]">{site.tagline}</p>
          </div>
          {footerColumns.map((c) => (
            <div key={c.title}>
              <p className="text-[13px] font-medium">{c.title}</p>
              <ul className="mt-3 space-y-2 text-[13px] text-[#77736c]">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-[#141312]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-[#141312]/[0.08] pt-6 text-[12px] text-[#9a968e] sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <span className="flex gap-4">
            {footer.legal.map((l) => (
              <Link key={l.label} href={l.href} className="hover:text-[#141312]">
                {l.label}
              </Link>
            ))}
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-[12px] leading-relaxed text-[#9a968e]">{footer.disclaimer}</p>
      </footer>
    </div>
  );
}
