import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { LEGAL_DOCS } from "@/lib/legal";

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const doc = LEGAL_DOCS[(await params).doc];
  return doc ? { title: doc.title, alternates: { canonical: `/legal/${(await params).doc}` } } : { title: "Not found" };
}

export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const doc = LEGAL_DOCS[(await params).doc];
  if (!doc) notFound();
  return (
    <article className="container-page max-w-3xl py-10">
      <h1 className="heading-display text-4xl">{doc.title}</h1>
      {doc.template && (
        <p className="mt-4 flex items-start gap-2 rounded-[8px] border border-gold-500/40 bg-gold-100/60 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold-text" aria-hidden />
          <span>
            <strong>Template — review with a lawyer before launch.</strong> This text is a starting point and is not legal advice.
          </span>
        </p>
      )}
      <div className="prose-marqova mt-6">
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
