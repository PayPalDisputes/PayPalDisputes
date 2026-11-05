import Link from "next/link";
import { landingWrap } from "@/components/landing/container";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Logo } from "@/components/ui/Logo";
import { footer, site } from "@/data/site";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Disputes", href: "/disputes" },
      { label: "Shipping proof", href: "/evidence" },
    ],
  },
];

/** Shell for the landing page: a nav that floats over the hero, warm off-white page (as in the dashboard), mono digits and a column footer. Always light. */
export default function LandingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#fafaf7] text-[#141312] [color-scheme:light] [font-family:var(--font-digits),var(--font-geist-sans),system-ui,sans-serif]">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-[#141312] px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SmoothScroll />
      <LandingHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className={`${landingWrap} pt-16 pb-10`}>
        <div className="grid gap-10 sm:grid-cols-[2fr_1fr]">
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
