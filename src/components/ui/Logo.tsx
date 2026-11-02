import Image from "next/image";
import { site } from "@/data/site";
import { cn } from "@/lib/cn";

/**
 * Sira's logo: two hand-drawn olive branches, overlapping, stacked above the "Sira" wordmark (the
 * hanging branch on top, the upright one under it, shifted right). Composed from the brand files in
 * public/brand (Sira.png, Left-hanging-olive-branch.png, Right-upright-olive-branch.png) into one
 * transparent image, sira-logo-stacked-2.png (919×736), following the design mockup with a small gap between the branches.
 */
const LOGO = { src: "/brand/sira-logo-stacked-2.png", width: 919, height: 736 };

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
