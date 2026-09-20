import Link from "next/link";
import { ArrowRightIcon, LightbulbIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Recommendation } from "@/lib/recommendations/engine";

/**
 * Rule-based recommendations.
 *
 * The copy shown here is written by campus administrators and stored in the
 * `RecommendationRule` table. Nothing is generated: the engine picks which
 * stored rule applies, and this component renders it.
 */
export function RecommendationPanel({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={LightbulbIcon}
            title="No guidance to show yet"
            description="Recommendations appear once you have recorded an activity, or once your campus team has configured guidance rules."
            compact
          />
        </CardContent>
      </Card>
    );
  }

  const [primary, ...secondary] = recommendations;

  return (
    <Card className="border-primary/25 bg-primary/[0.04]">
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <LightbulbIcon className="size-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium">{primary!.title}</h3>
              <Badge variant="outline" className="text-[10px]">
                Rule-based
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {primary!.message}
            </p>
            {primary!.actionHref && primary!.actionLabel ? (
              <Button size="sm" variant="outline" asChild className="mt-1">
                <Link href={primary!.actionHref}>
                  {primary!.actionLabel}
                  <ArrowRightIcon />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {secondary.length > 0 ? (
          <ul className="space-y-2 border-t pt-3">
            {secondary.map((item) => (
              <li key={item.code} className="flex items-start gap-2.5 text-sm">
                <span
                  aria-hidden="true"
                  className="bg-primary/50 mt-1.5 size-1.5 shrink-0 rounded-full"
                />
                <span>
                  <span className="font-medium">{item.title}. </span>
                  <span className="text-muted-foreground leading-relaxed">
                    {item.message}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
