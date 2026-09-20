"use client";

import * as React from "react";
import { WasteCategory, type DisposalGuide } from "@prisma/client";
import {
  RecycleIcon,
  Repeat2Icon,
  SearchIcon,
  Trash2Icon,
  TrendingDownIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  DISPOSAL_ACTION_META,
  WASTE_CATEGORY_META,
  isRecoveryAction,
} from "@/lib/rules/catalog";
import { cn } from "@/lib/utils";

/**
 * Searchable waste guide.
 *
 * The entries are loaded from the database by the server component that
 * renders this; filtering happens in the browser because the full published
 * guide is a small, bounded set and instant feedback matters more here than
 * a round trip. Nothing about the content is hardcoded in this file.
 */
export function GuideBrowser({ guides }: { guides: DisposalGuide[] }) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<WasteCategory | "ALL">("ALL");
  const [selected, setSelected] = React.useState<DisposalGuide | null>(null);

  const categories = React.useMemo(() => {
    const present = new Set(guides.map((guide) => guide.category));
    return (Object.keys(WASTE_CATEGORY_META) as WasteCategory[]).filter((key) =>
      present.has(key),
    );
  }, [guides]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return guides.filter((guide) => {
      if (category !== "ALL" && guide.category !== category) return false;
      if (!needle) return true;
      return (
        guide.item.toLowerCase().includes(needle) ||
        guide.summary.toLowerCase().includes(needle) ||
        guide.keywords.some((keyword) => keyword.includes(needle))
      );
    });
  }, [guides, query, category]);

  if (guides.length === 0) {
    return (
      <EmptyState
        icon={RecycleIcon}
        title="No guidance published yet"
        description="Your campus team has not published any waste guide entries. Check back soon."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* --------------------------------------------------------- Controls */}
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for an item — bottle, battery, notebook…"
            aria-label="Search the waste guide"
            className="pl-9"
          />
          {query ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <XIcon className="size-4" />
            </Button>
          ) : null}
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by category"
        >
          <FilterChip
            active={category === "ALL"}
            onClick={() => setCategory("ALL")}
            label={`All (${guides.length})`}
          />
          {categories.map((key) => (
            <FilterChip
              key={key}
              active={category === key}
              onClick={() => setCategory(key)}
              label={WASTE_CATEGORY_META[key].label}
            />
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------- Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No matching items"
          description={`Nothing in the guide matches "${query}". Try a broader term, or clear the category filter.`}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQuery("");
                setCategory("ALL");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            Showing {filtered.length} of {guides.length} items
          </p>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((guide) => (
              <li key={guide.id}>
                <Card className="h-full transition-shadow hover:shadow-sm">
                  <CardContent className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium">{guide.item}</h3>
                      <Badge variant="outline" className="shrink-0">
                        {WASTE_CATEGORY_META[guide.category].label}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
                      {guide.summary}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={
                          isRecoveryAction(guide.recommendedAction)
                            ? "success"
                            : "secondary"
                        }
                      >
                        {DISPOSAL_ACTION_META[guide.recommendedAction].label}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelected(guide)}
                      >
                        View guidance
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <GuideDialog guide={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border hover:bg-accent text-muted-foreground hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  );
}

const SECTIONS = [
  {
    key: "reduceGuidance" as const,
    label: "Reduce",
    icon: TrendingDownIcon,
    tone: "text-success",
  },
  {
    key: "reuseGuidance" as const,
    label: "Reuse",
    icon: Repeat2Icon,
    tone: "text-info",
  },
  {
    key: "recycleGuidance" as const,
    label: "Recycle",
    icon: RecycleIcon,
    tone: "text-primary",
  },
  {
    key: "disposeGuidance" as const,
    label: "Dispose",
    icon: Trash2Icon,
    tone: "text-muted-foreground",
  },
];

function GuideDialog({
  guide,
  onClose,
}: {
  guide: DisposalGuide | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!guide} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {guide ? (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {WASTE_CATEGORY_META[guide.category].label}
                </Badge>
                <Badge
                  variant={
                    isRecoveryAction(guide.recommendedAction) ? "success" : "secondary"
                  }
                >
                  Recommended: {DISPOSAL_ACTION_META[guide.recommendedAction].label}
                </Badge>
              </div>
              <DialogTitle className="mt-2">{guide.item}</DialogTitle>
              <DialogDescription>{guide.summary}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {SECTIONS.map((section) => (
                <div key={section.key} className="space-y-1">
                  <h4 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                    <section.icon
                      className={cn("size-4", section.tone)}
                      aria-hidden="true"
                    />
                    {section.label}
                  </h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {guide[section.key]}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
