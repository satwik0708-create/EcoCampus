import Link from "next/link";
import { Brand, TAGLINE } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm font-medium"
          >
            Back to site
          </Link>
        </div>
      </header>

      <main
        id="main"
        className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6"
      >
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="text-muted-foreground px-4 py-6 text-center text-xs sm:px-6">
        {TAGLINE}
      </footer>
    </div>
  );
}
