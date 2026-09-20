import { Suspense } from "react";
import { requirePageStudent } from "@/lib/auth/guards";
import { listGuides } from "@/lib/services/content";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { GuideBrowser } from "@/components/guide/guide-browser";

export const metadata = { title: "Waste Guide" };

export default async function WasteGuidePage() {
  await requirePageStudent();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waste Guide"
        description="Four answers for every item: how to reduce it, how to reuse it, how to recycle it, and how to dispose of it when recovery isn't possible. Maintained by your campus team."
      />

      <Suspense fallback={<GuideSkeleton />}>
        <GuideList />
      </Suspense>
    </div>
  );
}

async function GuideList() {
  const guides = await listGuides();
  return <GuideBrowser guides={guides} />;
}

function GuideSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-8 w-2/3" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-44" />
        ))}
      </div>
    </div>
  );
}
