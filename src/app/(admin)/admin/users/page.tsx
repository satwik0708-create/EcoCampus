import { Suspense } from "react";
import { Role } from "@prisma/client";
import { UsersIcon } from "lucide-react";
import { requirePageAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const metadata = { title: "Users" };

const PAGE_SIZE = 25;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requirePageAdmin();
  const params = await searchParams;
  const requested = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Accounts, roles and access. Passwords are stored only as bcrypt hashes and are never retrievable from this console."
      />

      <Suspense fallback={<Skeleton className="h-96" />}>
        <UsersTable page={page} currentAdminId={admin.id} />
      </Suspense>
    </div>
  );
}

async function UsersTable({
  page,
  currentAdminId,
}: {
  page: number;
  currentAdminId: string;
}) {
  const [total, users, studentCount, adminCount, inactiveCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        department: { select: { name: true } },
        _count: { select: { wasteRecords: true, foodWasteRecords: true } },
      },
    }),
    prisma.user.count({ where: { role: Role.STUDENT } }),
    prisma.user.count({ where: { role: Role.ADMIN } }),
    prisma.user.count({ where: { active: false } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (users.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={UsersIcon}
            title="No accounts yet"
            description="Accounts appear here as students register."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Students" value={studentCount} icon={UsersIcon} />
        <StatCard
          label="Administrators"
          value={adminCount}
          icon={UsersIcon}
          tone="info"
        />
        <StatCard
          label="Deactivated"
          value={inactiveCount}
          icon={UsersIcon}
          tone={inactiveCount > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardContent className="space-y-4 p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Department</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden xl:table-cell">Joined</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {user.displayName}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden lg:table-cell">
                    {user.department?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(
                      user._count.wasteRecords + user._count.foodWasteRecords,
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === Role.ADMIN ? "info" : "secondary"}>
                      {user.role === Role.ADMIN ? "Administrator" : "Student"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Deactivated</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs xl:table-cell">
                    {formatDateTime(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserRowActions
                      user={{
                        id: user.id,
                        displayName: user.displayName,
                        role: user.role,
                        active: user.active,
                      }}
                      isSelf={user.id === currentAdminId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 ? (
            <p className="text-muted-foreground px-5 pb-4 text-sm">
              Page {page} of {totalPages} · {formatNumber(total)} accounts
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
