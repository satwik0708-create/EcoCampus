"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterXIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

/**
 * Filter bar for the admin record tables.
 *
 * Filters are written to the URL, so a filtered view is shareable and
 * survives a refresh — and the actual filtering happens in SQL on the server,
 * not by loading every record into the browser.
 */
export function RecordFilters({
  categories,
  departments,
  searchLabel,
}: {
  categories: Array<{ value: string; label: string }>;
  departments: Array<{ id: string; name: string }>;
  searchLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = React.useState(searchParams.get("q") ?? "");

  const category = searchParams.get("category") ?? ALL;
  const departmentId = searchParams.get("departmentId") ?? ALL;
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const hasFilters =
    !!searchParams.get("q") ||
    category !== ALL ||
    departmentId !== ALL ||
    !!from ||
    !!to;

  const update = React.useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === ALL) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Any filter change resets pagination — page 3 of the old result set is
      // meaningless against the new one.
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  function onSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update("q", query.trim());
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <form onSubmit={onSearchSubmit} className="xl:col-span-2">
          <Field label={searchLabel} htmlFor="q">
            <div className="relative">
              <SearchIcon
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                id="q"
                name="q"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Item or student display name"
                className="pl-9"
                maxLength={60}
              />
            </div>
          </Field>
        </form>

        <Field label="Category" htmlFor="category">
          <Select value={category} onValueChange={(value) => update("category", value)}>
            <SelectTrigger id="category" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="From" htmlFor="from">
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(event) => update("from", event.target.value)}
          />
        </Field>

        <Field label="To" htmlFor="to">
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(event) => update("to", event.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {departments.length > 0 ? (
          <Field label="Department" htmlFor="departmentId" className="min-w-56">
            <Select
              value={departmentId}
              onValueChange={(value) => update("departmentId", value)}
            >
              <SelectTrigger id="departmentId" aria-label="Filter by department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}

        {hasFilters ? (
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              router.push(pathname, { scroll: false });
            }}
          >
            <FilterXIcon />
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
