import { Suspense } from "react";
import { RecycleIcon } from "lucide-react";
import { requirePageAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { GuideEditor } from "@/components/admin/guide-editor";
import { DeleteButton } from "@/components/admin/delete-button";
import {
  DISPOSAL_ACTION_META,
  WASTE_CATEGORY_META,
  isRecoveryAction,
} from "@/lib/rules/catalog";

export const metadata = { title: "Manage Waste Guide" };

export default async function AdminGuidePage() {
  await requirePageAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waste Guide"
        description="The item-level guidance students search. Reduce, reuse, recycle and dispose for every entry."
        actions={<GuideEditor />}
      />

      <Suspense fallback={<Skeleton className="h-96" />}>
        <GuideTable />
      </Suspense>
    </div>
  );
}

async function GuideTable() {
  const guides = await prisma.disposalGuide.findMany({
    orderBy: [{ category: "asc" }, { item: "asc" }],
  });

  if (guides.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={RecycleIcon}
            title="No guide entries yet"
            description="Add the items students ask about most — bottles, batteries, notebooks, food containers."
            action={<GuideEditor />}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden lg:table-cell">Summary</TableHead>
              <TableHead>Recommended</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guides.map((guide) => (
              <TableRow key={guide.id}>
                <TableCell className="font-medium">{guide.item}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {WASTE_CATEGORY_META[guide.category].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground hidden max-w-sm text-xs lg:table-cell">
                  <span className="line-clamp-2">{guide.summary}</span>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      isRecoveryAction(guide.recommendedAction)
                        ? "success"
                        : "secondary"
                    }
                  >
                    {DISPOSAL_ACTION_META[guide.recommendedAction].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {guide.published ? (
                    <Badge variant="success">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <GuideEditor guide={guide} trigger="icon" />
                    <DeleteButton
                      endpoint={`/api/admin/guides/${guide.id}`}
                      itemLabel={guide.item}
                      consequence="This entry will be removed from the waste guide. Student records are not affected."
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
