"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChartIcon } from "lucide-react";
import { ChartFrame } from "@/components/charts/chart-frame";
import { ChartTooltip } from "@/components/charts/tooltip";
import { seriesColor } from "@/components/charts/palette";
import { formatNumber } from "@/lib/utils";

export type CategoryDatum = {
  key: string;
  label: string;
  records: number;
};

/**
 * Distribution by category, as a donut plus an explicit legend list.
 *
 * The legend carries the numbers, so the information is available to
 * keyboard and screen-reader users who never hover a slice.
 */
export function CategoryPieChart({
  data,
  title,
  description,
  emptyTitle = "No records yet",
  emptyDescription = "Categories appear here once activities have been recorded.",
  height = 260,
}: {
  data: CategoryDatum[];
  title: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.records, 0);

  return (
    <ChartFrame
      title={title}
      description={description}
      isEmpty={total === 0}
      emptyIcon={PieChartIcon}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      height={height}
      autoHeight
    >
      <div className="flex flex-col gap-4 sm:h-full sm:flex-row sm:items-center">
        {/* A fixed pixel height below `sm`: in a column layout the donut has
            no flex basis to grow into, and would otherwise collapse. */}
        <div className="h-48 w-full shrink-0 sm:h-full sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="records"
                nameKey="label"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.key} fill={seriesColor(index)} />
                ))}
              </Pie>
              <Tooltip
                content={
                  <ChartTooltip
                    formatter={(value) =>
                      `${formatNumber(value)} (${Math.round((value / total) * 100)}%)`
                    }
                  />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex w-full flex-col gap-1.5 sm:w-1/2">
          {data.slice(0, 8).map((entry, index) => (
            <li key={entry.key} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: seriesColor(index) }}
              />
              <span className="truncate">{entry.label}</span>
              <span className="text-muted-foreground ml-auto shrink-0 tabular-nums">
                {formatNumber(entry.records)}
                <span className="ml-1 text-xs">
                  ({Math.round((entry.records / total) * 100)}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  );
}
