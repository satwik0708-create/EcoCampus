"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ADMIN_NAV, STUDENT_NAV, type NavSection } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type ShellUser = {
  name: string;
  displayName: string;
  email: string;
  role: "STUDENT" | "ADMIN";
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/student" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  sections,
  pathname,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Main">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="text-muted-foreground px-3 text-[11px] font-semibold tracking-wider uppercase">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * The signed-in application shell.
 *
 * Desktop gets a persistent sidebar; below `lg` the same navigation moves
 * into a full-height dialog opened from the header, so the mobile experience
 * is a real navigation pattern rather than a squashed sidebar.
 *
 * The navigation definition is imported here rather than passed in as a prop.
 * That is deliberate: the nav items carry Lucide icon *components*, and React
 * cannot serialise a function across the server/client boundary — handing
 * these in from a server layout throws at render time. The server passes the
 * role; this client component resolves it to the right menu.
 */
export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const sections: NavSection[] = user.role === "ADMIN" ? ADMIN_NAV : STUDENT_NAV;

  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const home = user.role === "ADMIN" ? "/admin" : "/student";

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar border-sidebar-border hidden w-64 shrink-0 border-r lg:flex lg:flex-col">
        <div className="border-sidebar-border flex h-14 items-center border-b px-4">
          <Brand href={home} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <NavLinks sections={sections} pathname={pathname} />
        </div>
        <div className="border-sidebar-border border-t p-3">
          <Badge variant={user.role === "ADMIN" ? "info" : "success"} className="w-full justify-center">
            {user.role === "ADMIN" ? "Administrator" : "Student"}
          </Badge>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/85 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur-sm lg:px-6">
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden">
                <MenuIcon className="size-5" />
                <span className="sr-only">Open navigation menu</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="top-0 left-0 h-dvh max-h-dvh w-[min(20rem,88vw)] max-w-none translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0">
              <DialogTitle className="sr-only">Navigation</DialogTitle>
              <div className="flex h-14 items-center border-b px-4">
                <Brand href={home} />
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-5">
                <NavLinks
                  sections={sections}
                  pathname={pathname}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </DialogContent>
          </Dialog>

          <div className="lg:hidden">
            <Brand href={home} />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </header>

        <main id="main" className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
