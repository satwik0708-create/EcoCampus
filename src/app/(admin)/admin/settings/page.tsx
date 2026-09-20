import { Suspense } from "react";
import { CoinsIcon, InfoIcon, LightbulbIcon, SettingsIcon } from "lucide-react";
import { requirePageAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/ui/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PointsRuleRow } from "@/components/admin/points-rule-row";
import { RecommendationRuleRow } from "@/components/admin/recommendation-rule-row";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  await requirePageAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settings"
        description="Points values and recommendation rules live in the database, so they can be tuned without a deployment."
      />

      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>How these settings are applied</AlertTitle>
        <AlertDescription>
          The points engine reads these rows on every activity submission, so a
          change takes effect on the next record a student logs. Points already
          awarded are never retroactively recalculated — the ledger is an audit
          trail.
        </AlertDescription>
      </Alert>

      <Suspense fallback={<Skeleton className="h-96" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const [pointsRules, recommendationRules, settings] = await Promise.all([
    prisma.pointsRule.findMany({ orderBy: { code: "asc" } }),
    prisma.recommendationRule.findMany({
      orderBy: [{ priority: "asc" }, { code: "asc" }],
    }),
    prisma.systemSetting.findMany({ orderBy: { key: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CoinsIcon className="text-primary size-4" />
            Points rules
          </CardTitle>
          <CardDescription>
            What each action is worth. Setting a value to 0, or switching a rule
            off, stops that award immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pointsRules.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={CoinsIcon}
                title="No points rules configured"
                description="Run the database seed to install the default points configuration."
                compact
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead className="w-32">Points</TableHead>
                  <TableHead className="w-24">Enabled</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Save</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pointsRules.map((rule) => (
                  <PointsRuleRow key={rule.id} rule={rule} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LightbulbIcon className="text-primary size-4" />
            Recommendation rules
          </CardTitle>
          <CardDescription>
            Deterministic rules evaluated against each student&apos;s own recent
            activity. The lowest priority number that matches wins. No AI is
            involved at any point.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recommendationRules.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                icon={LightbulbIcon}
                title="No recommendation rules configured"
                description="Run the database seed to install the default rule set."
                compact
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Priority</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="w-24 text-right">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendationRules.map((rule) => (
                  <RecommendationRuleRow key={rule.id} rule={rule} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="text-primary size-4" />
            System configuration
          </CardTitle>
          <CardDescription>
            Read-only reference. Values marked as environment variables are set
            at deployment time, not from this console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="hidden lg:table-cell">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-xs">CAMPUS_TIMEZONE</TableCell>
                <TableCell className="font-medium">{env.campusTimeZone}</TableCell>
                <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                  Environment variable. All streak and daily-bonus calculations
                  use this zone.
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-xs">SESSION_TTL_HOURS</TableCell>
                <TableCell className="font-medium">{env.sessionTtlHours}</TableCell>
                <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                  Environment variable. How long a sign-in stays valid.
                </TableCell>
              </TableRow>
              {settings.map((setting) => (
                <TableRow key={setting.key}>
                  <TableCell className="font-mono text-xs">{setting.key}</TableCell>
                  <TableCell className="font-medium">{setting.value}</TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                    {setting.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
