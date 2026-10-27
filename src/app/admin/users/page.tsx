import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/server/session";
import { setUserRole } from "@/server/actions/admin";
import { PageHeader } from "@/components/layout/console-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 31,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, email: true, name: true, role: true, createdAt: true, isSample: true, _count: { select: { orders: true } } },
  });
  const next = users.length > 30 ? users[29].id : null;
  return (
    <div>
      <PageHeader title="Users" />
      <form className="mb-4 flex gap-2">
        <label htmlFor="uq" className="sr-only">Search users</label>
        <input id="uq" name="q" defaultValue={q} placeholder="Search email or name" className="h-9 w-72 rounded-md border border-sand bg-white px-3 text-sm" />
        <Button size="sm" variant="secondary" type="submit">Search</Button>
      </form>
      <div className="overflow-x-auto rounded-[8px] border border-sand bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-sand-50 text-left text-xs text-slate uppercase">
            <tr><th scope="col" className="p-3">User</th><th scope="col" className="p-3">Role</th><th scope="col" className="p-3">Orders</th><th scope="col" className="p-3">Joined</th><th scope="col" className="p-3">Change role</th></tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {users.slice(0, 30).map((u) => (
              <tr key={u.id}>
                <td className="p-3">{u.name}<span className="block text-xs text-slate">{u.email}</span></td>
                <td className="p-3"><Badge tone={u.role === "ADMIN" ? "navy" : u.role === "SELLER" ? "gold" : "neutral"}>{u.role.toLowerCase()}</Badge>{u.isSample && <Badge tone="outline" className="ml-1">sample</Badge>}</td>
                <td className="p-3 tabular-nums">{u._count.orders}</td>
                <td className="p-3 text-xs">{formatDate(u.createdAt)}</td>
                <td className="p-3">
                  <span className="flex gap-1">
                    {(["SHOPPER", "SELLER", "ADMIN"] as const).filter((r) => r !== u.role).map((r) => (
                      <ActionButton key={r} size="sm" variant="ghost" confirm={`Make ${u.email} a ${r.toLowerCase()}?`} action={setUserRole.bind(null, u.id, r)}>{r.toLowerCase()}</ActionButton>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {next && <div className="mt-4 text-right"><Button asChild size="sm" variant="secondary"><Link href={`/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), cursor: next })}`}>Next page</Link></Button></div>}
    </div>
  );
}
