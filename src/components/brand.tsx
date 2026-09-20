import Link from "next/link";
import { LeafIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const TAGLINE = "Small Actions. Sustainable Campus.";

export function Brand({
  href = "/",
  showTagline = false,
  className,
}: {
  href?: string;
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group flex items-center gap-2.5 rounded-md", className)}
    >
      <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform group-hover:scale-105">
        <LeafIcon className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">EcoCampus</span>
        {showTagline ? (
          <span className="text-muted-foreground mt-0.5 text-[11px]">{TAGLINE}</span>
        ) : null}
      </span>
    </Link>
  );
}
