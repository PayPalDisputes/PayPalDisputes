import Image from "next/image";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";

/**
 * Sira's logo: the "Sira" wordmark inside a wreath of two olive branches. Composed from the brand
 * files in public/brand (Sira.png, left-olive-branch.png, right-olive-branch.png) into one
 * transparent image, sira-logo.png (1362×980), following the design mockup's proportions.
 */
const LOGO = { src: "/brand/sira-logo.png", width: 1362, height: 980 };

/** The logo on its own, sized by height (width follows). */
export function LogoMark({ className }: { className?: string }) {
  return <Image src={LOGO.src} width={LOGO.width} height={LOGO.height} alt="" aria-hidden className={cn("h-10 w-auto", className)} />;
}

/** The logo as the site's name, for headers and the sidebar. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image src={LOGO.src} width={LOGO.width} height={LOGO.height} alt={site.name} priority className="h-14 w-auto" />
    </span>
  );
}
