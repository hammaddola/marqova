import { db } from "@/lib/db";
import { requireSeller } from "@/server/session";
import { PageHeader } from "@/components/layout/console-shell";
import { EmptyState } from "@/components/ui/primitives";
import { ConversationThread } from "@/components/account/conversation-thread";

export const metadata = { title: "Customer messages" };

export default async function SellerMessagesPage() {
  const { store, user } = await requireSeller();
  const convos = await db.conversation.findMany({
    where: { storeId: store.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: { user: { select: { name: true } }, messages: { orderBy: { createdAt: "asc" }, take: 50, include: { sender: { select: { id: true, name: true } } } } },
  });
  return (
    <div className="space-y-4">
      <PageHeader title="Customer messages" subtitle="Your median response time feeds your Trust Score." />
      {!convos.length && <EmptyState title="No messages" body="Shoppers can message you from your store page." />}
      {convos.map((c) => (
        <ConversationThread
          key={c.id}
          id={c.id}
          title={`${c.user.name ?? "Shopper"} — ${c.subject}`}
          messages={c.messages.map((m) => ({ id: m.id, body: m.body, mine: m.sender.id === user.id, author: m.sender.name ?? "", at: m.createdAt.toISOString() }))}
        />
      ))}
    </div>
  );
}
