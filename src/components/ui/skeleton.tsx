import { cn } from "@/lib/utils";

/**
 * Loading placeholder.
 *
 * Deliberately shows *shape*, never plausible-looking numbers — a skeleton
 * that renders fake data is worse than a spinner.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("bg-muted animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
