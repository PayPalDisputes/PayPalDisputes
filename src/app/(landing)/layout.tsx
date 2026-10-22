import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";
import { footer, site } from "@/data/site";

/**
 * Shell for the landing page: plain chrome over a faint 12px grid, the same pitch as the dot
 * canvases, so the animated dots sit exactly on the page's grid.
 */
export default function LandingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="landing-grid flex min-h-full flex-1 flex-col text-[#141312] [color-scheme:light]">
      <a
        href="#main"
        className="sr-only z-[60] bg-[#141312] px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2" aria-label={`${site.name} home`}>
          <LogoMark className="size-5" />
          <span className="font-mono text-[13px] tracking-[0.14em] uppercase">{site.name}</span>
        </Link>
        <nav className="flex items-center gap-5 font-mono text-[12px] tracking-[0.12em] uppercase">
          <Link href="/pricing" className="hidden text-[#6c6862] hover:text-[#141312] sm:inline">
            Pricing
          </Link>
          <Link href="/signin" className="text-[#6c6862] hover:text-[#141312]">
            Sign in
          </Link>
          <Link href={site.appHref} className="border border-[#141312] px-3 py-1.5 hover:bg-[#141312] hover:text-white">
            Dashboard
          </Link>
        </nav>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-[#141312]/15 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 font-mono text-[11px] tracking-[0.12em] text-[#6c6862] uppercase sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {site.name}
          </span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/dashboard" className="hover:text-[#141312]">Dashboard</Link>
            <Link href="/pricing" className="hover:text-[#141312]">Pricing</Link>
            {footer.legal.map((l) => (
              <Link key={l.label} href={l.href} className="hover:text-[#141312]">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-6 max-w-2xl text-[12px] leading-relaxed text-[#a9a59c]">{footer.disclaimer}</p>
      </footer>
    </div>
  );
}
