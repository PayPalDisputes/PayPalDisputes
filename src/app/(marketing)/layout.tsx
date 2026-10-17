import { AnnouncementBar, Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

/** Shell for the public marketing pages. Always light, independent of the dashboard's dark mode. */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-subtle text-fg [color-scheme:light]">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-fg px-3 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
