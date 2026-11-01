import Image from "next/image";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";

/**
 * Sira's logo: the "Sira" wordmark between two hand-drawn olive branches, the hanging one above
 * and the upright one below. Composed from the brand files in public/brand (Sira.png,
 * Left-hanging-olive-branch.png, Right-upright-olive-branch.png) into one transparent image,
 * sira-logo.png (630×580).
 */
const LOGO = { src: "/brand/sira-logo.png", width: 630, height: 580 };

/** The logo on its own, sized by height (width follows). */
export function LogoMark({ className }: { className?: string }) {
  return <Image src={LOGO.src} width={LOGO.width} height={LOGO.height} alt="" aria-hidden className={cn("h-10 w-auto", className)} />;
}

/** The logo as the site's name, for headers and the sidebar. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image src={LOGO.src} width={LOGO.width} height={LOGO.height} alt={site.name} priority className="h-12 w-auto" />
    </span>
  );
}
