"use client";

import * as React from "react";
import { AlertTriangleIcon, type LucideIcon } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Every chart in EcoCampus is wrapped in this frame, which guarantees the
 * four states the brief requires: loading, empty, error and loaded. A chart
 * can therefore never render an axis with no data behind it.
 */
export function ChartFrame({
  title,
  description,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  error,
  loading = false,
  height = 260,
  autoHeight = false,
  footer,
  className,
  children,
}: {
  title: string;
  description?: string;
  isEmpty: boolean;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  error?: string | null;
  loading?: boolean;
  height?: number;
  /**
   * Treat `height` as a minimum rather than a fixed size. Needed by charts
   * whose layout reflows to a column on small screens — a fixed height
   * squashes the plot to a few pixels once the legend wraps beneath it.
   */
  autoHeight?: boolean;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <div className="px-5 pb-5">
        {loading ? (
          <Skeleton style={{ height }} className="w-full" />
        ) : error ? (
          <EmptyState
            icon={AlertTriangleIcon}
            title="This chart could not be loaded"
            description={error}
            compact
          />
        ) : isEmpty ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            compact
          />
        ) : (
          <div
            style={autoHeight ? { minHeight: height } : { height }}
            className="w-full"
          >
            {children}
          </div>
        )}
        {footer && !loading && !error && !isEmpty ? (
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{footer}</p>
        ) : null}
      </div>
    </Card>
  );
}
