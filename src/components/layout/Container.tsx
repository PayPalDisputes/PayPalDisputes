import { cn } from "@/lib/cn";

/** Max-width wrapper every section aligns to. */
export function Container({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mx-auto w-full max-w-[1200px] px-5 md:px-8", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * A page band: full-width top rule plus a framed column with vertical rails.
 * `hatched` adds diagonal-striped gutter strips inside the rails (desktop), framing the content.
 */
export function Section({
  id,
  className,
  innerClassName,
  rule = true,
  hatched = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { innerClassName?: string; rule?: boolean; hatched?: boolean }) {
  return (
    <section id={id} className={cn("relative scroll-mt-24", rule && "border-t border-line", className)} {...props}>
      <div className="mx-auto w-full max-w-[1200px] md:px-8">
        <div className={cn("relative border-line md:border-x", hatched && "md:px-8")}>
          {hatched && (
            <>
              <span aria-hidden className="bg-hatch absolute inset-y-0 left-0 hidden w-8 border-r border-line md:block" />
              <span aria-hidden className="bg-hatch absolute inset-y-0 right-0 hidden w-8 border-l border-line md:block" />
            </>
          )}
          <div className={cn("relative", innerClassName)}>{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Small rounded label above section titles (eyebrow chip). */
export function Eyebrow({ icon, children, className }: { icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-canvas px-3 text-[12px] font-medium text-fg-heading shadow-[0_1px_2px_rgba(55,50,47,0.06)]",
        className,
      )}
    >
      {icon && <span className="text-fg-muted [&>svg]:size-3.5">{icon}</span>}
      {children}
    </span>
  );
}

/** Standard section heading block: eyebrow, title, body. */
export function SectionHeading({
  eyebrow,
  eyebrowIcon,
  title,
  body,
  align = "center",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  eyebrowIcon?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-[680px] text-center" : "max-w-[560px]", className)}>
      {eyebrow && <Eyebrow icon={eyebrowIcon} className="mb-5">{eyebrow}</Eyebrow>}
      <Tag className={Tag === "h1" ? "t-h1" : "t-h2"}>{title}</Tag>
      {body && <p className={cn("t-body-lg mt-4", align === "center" && "mx-auto max-w-[560px]")}>{body}</p>}
    </div>
  );
}
