"use client";

import * as React from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PUBLIC_NAV } from "@/lib/navigation";

export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Brand />

        <nav
          className="ml-6 hidden items-center gap-1 md:flex"
          aria-label="Site sections"
        >
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Button size="sm" asChild>
              <Link href="/redirect">Open EcoCampus</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden">
                <MenuIcon className="size-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogTitle>Explore EcoCampus</DialogTitle>
              <nav className="flex flex-col gap-1" aria-label="Site sections">
                {PUBLIC_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="hover:bg-accent flex items-start gap-3 rounded-md px-3 py-2.5 text-sm"
                  >
                    <item.icon className="text-primary mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="block font-medium">{item.label}</span>
                      <span className="text-muted-foreground block text-xs leading-relaxed">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-2 border-t pt-4">
                <Button asChild onClick={() => setOpen(false)}>
                  <Link href={signedIn ? "/redirect" : "/register"}>
                    {signedIn ? "Open EcoCampus" : "Create an account"}
                  </Link>
                </Button>
                {!signedIn ? (
                  <Button variant="outline" asChild onClick={() => setOpen(false)}>
                    <Link href="/login">Sign in</Link>
                  </Button>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
