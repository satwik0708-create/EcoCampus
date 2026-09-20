import { Suspense } from "react";
import { FileTextIcon } from "lucide-react";
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
import { ContentEditor } from "@/components/admin/content-editor";
import { DeleteButton } from "@/components/admin/delete-button";
import { CONTENT_CATEGORY_META } from "@/lib/rules/catalog";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Educational Content" };

export default async function AdminContentPage() {
  await requirePageAdmin();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Educational Content"
        description="The learning library students read. Everything here is stored in the database and editable without a deployment."
        actions={<ContentEditor />}
      />

      <Suspense fallback={<Skeleton className="h-96" />}>
        <ContentTable />
      </Suspense>
    </div>
  );
}

async function ContentTable() {
  const articles = await prisma.educationalContent.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  if (articles.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={FileTextIcon}
            title="No articles yet"
            description="Publish your first short read to give students something to learn from between activities."
            action={<ContentEditor />}
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
              <TableHead>Title</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead className="text-right">Read time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Updated</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article) => (
              <TableRow key={article.id}>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium">{article.title}</p>
                    <p className="text-muted-foreground line-clamp-1 max-w-md text-xs">
                      {article.description}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {CONTENT_CATEGORY_META[article.category].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  {article.readMinutes} min
                </TableCell>
                <TableCell>
                  {article.published ? (
                    <Badge variant="success">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                  {formatDateTime(article.updatedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <ContentEditor article={article} trigger="icon" />
                    <DeleteButton
                      endpoint={`/api/admin/content/${article.id}`}
                      itemLabel={article.title}
                      consequence="This article will be removed from the learning library. Student records and points are not affected."
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
