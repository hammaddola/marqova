/**
 * Serialises JSON-LD for a <script type="application/ld+json"> tag. Escapes "<"
 * so user-provided strings (titles, reviews) can never close the script tag.
 */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
