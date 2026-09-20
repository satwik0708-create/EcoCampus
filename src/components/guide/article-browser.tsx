"use client";

import * as React from "react";
import { ContentCategory, type EducationalContent } from "@prisma/client";
import { BookOpenIcon, ClockIcon, SearchIcon, XIcon } from "lucide-react";
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
import { ArticleBody } from "@/components/ui/article-body";
import { CONTENT_CATEGORY_META } from "@/lib/rules/catalog";
import { cn } from "@/lib/utils";

/** Searchable learning library, backed entirely by EducationalContent rows. */
export function ArticleBrowser({ articles }: { articles: EducationalContent[] }) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<ContentCategory | "ALL">("ALL");
  const [selected, setSelected] = React.useState<EducationalContent | null>(null);

  const categories = React.useMemo(() => {
    const present = new Set(articles.map((article) => article.category));
    return (Object.keys(CONTENT_CATEGORY_META) as ContentCategory[]).filter((key) =>
      present.has(key),
    );
  }, [articles]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((article) => {
      if (category !== "ALL" && article.category !== category) return false;
      if (!needle) return true;
      return (
        article.title.toLowerCase().includes(needle) ||
        article.description.toLowerCase().includes(needle)
      );
    });
  }, [articles, query, category]);

  if (articles.length === 0) {
    return (
      <EmptyState
        icon={BookOpenIcon}
        title="No articles published yet"
        description="Your campus team has not published any learning material. Check back soon."
      />
    );
  }

  return (
    <div className="space-y-4">
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
            placeholder="Search articles…"
            aria-label="Search learning articles"
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

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
          <button
            type="button"
            onClick={() => setCategory("ALL")}
            aria-pressed={category === "ALL"}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              category === "ALL"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-accent text-muted-foreground",
            )}
          >
            All ({articles.length})
          </button>
          {categories.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                category === key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-accent text-muted-foreground",
              )}
            >
              {CONTENT_CATEGORY_META[key].label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No matching articles"
          description={`Nothing matches "${query}". Try a different search or clear the topic filter.`}
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
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article) => (
            <li key={article.id}>
              <Card className="h-full transition-shadow hover:shadow-sm">
                <CardContent className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline">
                      {CONTENT_CATEGORY_META[article.category].label}
                    </Badge>
                    <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                      <ClockIcon className="size-3" aria-hidden="true" />
                      {article.readMinutes} min
                    </span>
                  </div>
                  <h3 className="font-medium">{article.title}</h3>
                  <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
                    {article.description}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="self-start"
                    onClick={() => setSelected(article)}
                  >
                    Read article
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {CONTENT_CATEGORY_META[selected.category].label}
                  </Badge>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <ClockIcon className="size-3" aria-hidden="true" />
                    {selected.readMinutes} minute read
                  </span>
                </div>
                <DialogTitle className="mt-2">{selected.title}</DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>
              <ArticleBody content={selected.content} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
