import "server-only";

export type TryOnInput = {
  garmentImageUrl: string;
  garmentTitle: string;
  personPhotoUrl?: string | null;
  avatar: { body: string; heightCm: number; weightKg: number; shape: string };
};

export type TryOnResult = { imageUrl: string; provider: string; note?: string };

export interface TryOnProvider {
  id: string;
  render(input: TryOnInput): Promise<TryOnResult>;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

/** Mock: composites the garment over the shopper photo (or a silhouette) as an SVG preview. */
export const mockTryOn: TryOnProvider = {
  id: "mock",
  async render({ garmentImageUrl, garmentTitle, personPhotoUrl, avatar }) {
    const scale = Math.min(1.15, Math.max(0.85, avatar.weightKg / 70));
    const person = personPhotoUrl
      ? `<image href="${escapeXml(personPhotoUrl)}" x="0" y="0" width="400" height="560" preserveAspectRatio="xMidYMid slice"/>`
      : `<g fill="#2b3c57"><circle cx="200" cy="90" r="42"/><rect x="${200 - 70 * scale}" y="140" width="${140 * scale}" height="220" rx="50"/><rect x="${200 - 55 * scale}" y="350" width="${50 * scale}" height="190" rx="22"/><rect x="${205}" y="350" width="${50 * scale}" height="190" rx="22"/></g>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560"><rect width="400" height="560" fill="#0E1A2B"/>${person}<image href="${escapeXml(garmentImageUrl)}" x="${200 - 85 * scale}" y="135" width="${170 * scale}" height="240" opacity="0.92" preserveAspectRatio="xMidYMid meet"/><rect x="0" y="520" width="400" height="40" fill="#0E1A2B" opacity="0.8"/><text x="200" y="545" fill="#C8A24A" font-family="Inter,Arial" font-size="13" text-anchor="middle">Preview · ${escapeXml(garmentTitle.slice(0, 40))}</text></svg>`;
    return {
      imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      provider: "mock",
      note: "Mock preview. Connect a virtual try-on API with TRYON_PROVIDER=http for photo-real results.",
    };
  },
};

/** Generic HTTP provider: POSTs the input as JSON and expects `{ imageUrl }` back. */
const httpTryOn: TryOnProvider = {
  id: "http",
  async render(input) {
    const res = await fetch(process.env.TRYON_API_URL!, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.TRYON_API_KEY ?? ""}` },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Try-on provider failed: ${res.status}`);
    const data = (await res.json()) as { imageUrl: string };
    return { imageUrl: data.imageUrl, provider: "http" };
  },
};

export function getTryOn(): TryOnProvider {
  return process.env.TRYON_PROVIDER === "http" && process.env.TRYON_API_URL ? httpTryOn : mockTryOn;
}
