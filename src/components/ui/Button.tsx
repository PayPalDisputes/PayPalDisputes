import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-[background-color,color,box-shadow,opacity] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-[linear-gradient(180deg,var(--mk-btn-from)_0%,var(--mk-btn-to)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(0,0,0,0.3),0_0_0_1px_var(--mk-btn-to)] hover:bg-[linear-gradient(180deg,var(--mk-btn-hover-from)_0%,var(--mk-btn-hover-to)_100%)]",
  secondary:
    "bg-canvas text-fg shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_var(--mk-btn-edge)] hover:bg-muted",
  ghost: "text-fg-body hover:bg-muted hover:text-fg",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-11 px-6 text-[15px]",
};

type Props = {
  variant?: Variant;
  size?: Size;
  /** Adds a trailing arrow that nudges right on hover. */
  arrow?: boolean;
  className?: string;
  children: React.ReactNode;
} & (
  | ({ href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">)
  | ({ href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">)
);

export function Button({ variant = "primary", size = "md", arrow, className, children, ...rest }: Props) {
  const classes = cn(base, variants[variant], sizes[size], className);
  const content = (
    <>
      {children}
      {arrow && (
        <ArrowRight
          aria-hidden
          strokeWidth={1.75}
          className="size-3.5 transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5"
        />
      )}
    </>
  );

  if (rest.href !== undefined) {
    const { href, ...linkProps } = rest;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {content}
      </Link>
    );
  }
  const { type = "button", ...buttonProps } = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {content}
    </button>
  );
}

/** Inline text link with an arrow that slides on hover. */
export function ArrowLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/al inline-flex items-center gap-1 text-sm font-medium text-fg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg rounded-sm",
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5 transition-transform duration-200 group-hover/al:translate-x-1" />
    </Link>
  );
}
