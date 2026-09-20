"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUpIcon } from "lucide-react";
import { ChartFrame } from "@/components/charts/chart-frame";
import { ChartTooltip } from "@/components/charts/tooltip";
import { AXIS_STYLE, GRID_COLOR, seriesColor } from "@/components/charts/palette";

export type TrendDatum = { label: string; value: number };

export function TrendAreaChart({
  data,
  title,
  description,
  seriesName,
  emptyTitle = "Nothing recorded yet",
  emptyDescription = "The trend line appears once there are records in this period.",
  colorIndex = 0,
  height = 240,
  footer,
}: {
  data: TrendDatum[];
  title: string;
  description?: string;
  seriesName: string;
  emptyTitle?: string;
  emptyDescription?: string;
  colorIndex?: number;
  height?: number;
  footer?: React.ReactNode;
}) {
  const isEmpty = data.every((d) => d.value === 0);
  const gradientId = `trend-${title.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <ChartFrame
      title={title}
      description={description}
      isEmpty={isEmpty}
      emptyIcon={TrendingUpIcon}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      height={height}
      footer={footer}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={seriesColor(colorIndex)} stopOpacity={0.3} />
              <stop offset="100%" stopColor={seriesColor(colorIndex)} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={40}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            name={seriesName}
            stroke={seriesColor(colorIndex)}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
