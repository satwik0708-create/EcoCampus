"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3Icon } from "lucide-react";
import { ChartFrame } from "@/components/charts/chart-frame";
import { ChartTooltip } from "@/components/charts/tooltip";
import { AXIS_STYLE, seriesColor } from "@/components/charts/palette";

export type RankedDatum = { key: string; label: string; value: number };

/** Ranked comparison — better than a pie when there are many categories. */
export function HorizontalBarChart({
  data,
  title,
  description,
  seriesName,
  emptyTitle = "No data yet",
  emptyDescription = "This comparison fills in as records are added.",
  height = 260,
  footer,
}: {
  data: RankedDatum[];
  title: string;
  description?: string;
  seriesName: string;
  emptyTitle?: string;
  emptyDescription?: string;
  height?: number;
  footer?: React.ReactNode;
}) {
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0);

  return (
    <ChartFrame
      title={title}
      description={description}
      isEmpty={isEmpty}
      emptyIcon={BarChart3Icon}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      height={height}
      footer={footer}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, bottom: 0, left: 4 }}
        >
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={<ChartTooltip />}
          />
          <Bar dataKey="value" name={seriesName} radius={[0, 4, 4, 0]} maxBarSize={22}>
            {data.map((entry, index) => (
              <Cell key={entry.key} fill={seriesColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
