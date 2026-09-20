import Link from "next/link";
import { Brand, TAGLINE } from "@/components/brand";

export function PublicFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Brand />
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            {TAGLINE} A campus platform for tracking waste, learning responsible
            disposal and taking part in sustainability action.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Platform</p>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>
              <Link href="/#how-it-works" className="hover:text-foreground">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/#features" className="hover:text-foreground">
                Student features
              </Link>
            </li>
            <li>
              <Link href="/#institutions" className="hover:text-foreground">
                For institutions
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Get started</p>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li>
              <Link href="/register" className="hover:text-foreground">
                Create an account
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/sdg-12" className="hover:text-foreground">
                SDG 12 alignment
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            EcoCampus — aligned with UN Sustainable Development Goal 12,
            Responsible Consumption and Production.
          </p>
          <p>Manual data entry. Predefined rules. No AI, no external data feeds.</p>
        </div>
      </div>
    </footer>
  );
}
