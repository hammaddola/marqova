import { MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/server/session";
import { EmptyState } from "@/components/ui/primitives";
import { ConversationThread } from "@/components/account/conversation-thread";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/account/messages");
  const convos = await db.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: { store: { select: { name: true } }, messages: { orderBy: { createdAt: "asc" }, take: 50, include: { sender: { select: { id: true, name: true } } } } },
  });
  return (
    <div className="space-y-6">
      <h1 className="heading-display text-3xl">Messages with sellers</h1>
      {!convos.length && <EmptyState icon={<MessageSquare />} title="No messages" body="Contact a seller from their store page. Conversations stay on Marqova so we can help if anything goes wrong." />}
      {convos.map((c) => (
        <ConversationThread
          key={c.id}
          id={c.id}
          title={`${c.store.name} — ${c.subject}`}
          messages={c.messages.map((m) => ({ id: m.id, body: m.body, mine: m.sender.id === user.id, author: m.sender.name ?? "", at: m.createdAt.toISOString() }))}
        />
      ))}
    </div>
  );
}
