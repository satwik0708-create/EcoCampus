import Link from "next/link";
import { CompassIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center px-4 sm:px-6">
        <Brand />
      </header>
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-4 py-16 text-center"
      >
        <div className="max-w-md space-y-4">
          <span className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
            <CompassIcon className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
          <p className="text-muted-foreground leading-relaxed">
            That page does not exist, or you do not have access to it. If you
            followed a link from inside EcoCampus, the item may have been
            removed.
          </p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/redirect">Go to my dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Back to the homepage</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
