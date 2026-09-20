"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRangeIcon } from "lucide-react";
import { ChartFrame } from "@/components/charts/chart-frame";
import { ChartTooltip } from "@/components/charts/tooltip";
import { AXIS_STYLE, GRID_COLOR, seriesColor } from "@/components/charts/palette";

export type ActivityDatum = {
  label: string;
  waste: number;
  food: number;
  total: number;
};

/** Stacked daily activity: waste records vs food waste records. */
export function ActivityBarChart({
  data,
  title,
  description,
  height = 260,
}: {
  data: ActivityDatum[];
  title: string;
  description?: string;
  height?: number;
}) {
  const isEmpty = data.every((d) => d.total === 0);

  return (
    <ChartFrame
      title={title}
      description={description}
      isEmpty={isEmpty}
      emptyIcon={CalendarRangeIcon}
      emptyTitle="No activity in this period"
      emptyDescription="Record a waste or food waste entry and your daily activity will appear here."
      height={height}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={{ stroke: GRID_COLOR }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={<ChartTooltip />}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="waste"
            name="Waste records"
            stackId="activity"
            fill={seriesColor(0)}
            radius={[0, 0, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            dataKey="food"
            name="Food waste records"
            stackId="activity"
            fill={seriesColor(1)}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
