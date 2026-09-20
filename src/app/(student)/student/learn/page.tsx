import { Suspense } from "react";
import { requirePageStudent } from "@/lib/auth/guards";
import { listArticles } from "@/lib/services/content";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ArticleBrowser } from "@/components/guide/article-browser";

export const metadata = { title: "Learn" };

export default async function LearnPage() {
  await requirePageStudent();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learn"
        description="Short reads on segregation, reuse, recycling, food waste and responsible consumption — written and published by your campus team."
      />

      <Suspense fallback={<LearnSkeleton />}>
        <ArticleList />
      </Suspense>
    </div>
  );
}

async function ArticleList() {
  const articles = await listArticles();
  return <ArticleBrowser articles={articles} />;
}

function LearnSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-8 w-2/3" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-48" />
        ))}
      </div>
    </div>
  );
}
