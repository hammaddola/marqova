/**
 * Generates illustrated product artwork as SVG for preview listings, so the catalog looks
 * coherent without borrowing real product photos. Real sellers upload photography instead.
 * GET /sample/shirt.svg?c=%231C2A40&v=2
 */
const SHAPES: Record<string, string> = {
  shirt: `<path d="M290 230 L350 196 Q400 236 450 196 L510 230 L590 310 L536 362 L500 330 L500 610 L300 610 L300 330 L264 362 L210 310 Z"/><path d="M350 196 Q400 270 450 196" fill="none" stroke="#C8A24A" stroke-width="6"/>`,
  dress: `<path d="M352 190 L448 190 L470 330 L572 612 L228 612 L330 330 Z"/><path d="M330 330 Q400 350 470 330" fill="none" stroke="#C8A24A" stroke-width="6"/><path d="M352 190 L360 150 M448 190 L440 150" stroke="currentColor" stroke-width="10"/>`,
  trousers: `<path d="M296 196 L504 196 L526 612 L430 612 L400 330 L370 612 L274 612 Z"/><rect x="296" y="196" width="208" height="26" fill="#C8A24A" opacity=".8"/>`,
  shoe: `<path d="M190 520 Q200 420 300 405 L366 396 Q430 452 530 470 Q620 486 628 545 L628 576 L190 576 Z"/><rect x="190" y="560" width="438" height="22" rx="8" fill="#C8A24A"/><path d="M330 420 L380 470 M360 412 L410 462" stroke="#fff" stroke-width="6" opacity=".7"/>`,
  watch: `<rect x="350" y="170" width="100" height="460" rx="28" opacity=".85"/><circle cx="400" cy="400" r="118" fill="#fff" stroke="currentColor" stroke-width="22"/><circle cx="400" cy="400" r="96" fill="none" stroke="#C8A24A" stroke-width="4"/><path d="M400 400 L400 330 M400 400 L452 420" stroke="#1A2333" stroke-width="8" stroke-linecap="round"/>`,
  glasses: `<circle cx="300" cy="400" r="92" fill="none" stroke="currentColor" stroke-width="22"/><circle cx="500" cy="400" r="92" fill="none" stroke="currentColor" stroke-width="22"/><path d="M392 395 Q400 375 408 395" fill="none" stroke="currentColor" stroke-width="16"/><circle cx="300" cy="400" r="80" fill="#C8A24A" opacity=".18"/><circle cx="500" cy="400" r="80" fill="#C8A24A" opacity=".18"/>`,
  bag: `<path d="M330 300 Q330 190 400 190 Q470 190 470 300" fill="none" stroke="#C8A24A" stroke-width="18"/><rect x="230" y="290" width="340" height="320" rx="26"/><rect x="380" y="380" width="40" height="24" rx="4" fill="#C8A24A"/>`,
  phone: `<rect x="285" y="160" width="230" height="480" rx="36"/><rect x="302" y="190" width="196" height="410" rx="20" fill="#0E1A2B" opacity=".85"/><circle cx="400" cy="176" r="6" fill="#C8A24A"/>`,
  headphones: `<path d="M260 450 L260 380 Q260 230 400 230 Q540 230 540 380 L540 450" fill="none" stroke="currentColor" stroke-width="26"/><rect x="220" y="420" width="90" height="150" rx="30"/><rect x="490" y="420" width="90" height="150" rx="30"/><rect x="236" y="450" width="20" height="90" rx="8" fill="#C8A24A"/><rect x="544" y="450" width="20" height="90" rx="8" fill="#C8A24A"/>`,
  laptop: `<rect x="230" y="230" width="340" height="230" rx="14"/><rect x="248" y="248" width="304" height="194" rx="6" fill="#0E1A2B" opacity=".85"/><path d="M180 480 L620 480 L590 530 L210 530 Z"/><rect x="370" y="486" width="60" height="8" rx="4" fill="#C8A24A"/>`,
  sofa: `<rect x="190" y="330" width="420" height="150" rx="30"/><rect x="160" y="380" width="80" height="170" rx="28"/><rect x="560" y="380" width="80" height="170" rx="28"/><rect x="220" y="450" width="360" height="100" rx="16"/><rect x="200" y="550" width="16" height="40" fill="#C8A24A"/><rect x="584" y="550" width="16" height="40" fill="#C8A24A"/>`,
  pot: `<ellipse cx="400" cy="300" rx="190" ry="34" fill="#C8A24A"/><path d="M220 310 L580 310 L560 560 Q400 610 240 560 Z"/><rect x="370" y="250" width="60" height="30" rx="10"/><rect x="150" y="360" width="80" height="22" rx="10"/><rect x="570" y="360" width="80" height="22" rx="10"/>`,
  lamp: `<path d="M300 200 L500 200 L560 400 L240 400 Z"/><rect x="390" y="400" width="20" height="170" fill="#C8A24A"/><ellipse cx="400" cy="590" rx="120" ry="24"/>`,
  bottle: `<rect x="320" y="290" width="160" height="330" rx="34"/><rect x="365" y="220" width="70" height="80"/><rect x="350" y="170" width="100" height="60" rx="10" fill="#C8A24A"/><rect x="340" y="400" width="120" height="110" rx="8" fill="#fff" opacity=".85"/>`,
  perfume: `<rect x="270" y="330" width="260" height="280" rx="30"/><rect x="370" y="270" width="60" height="70"/><rect x="330" y="200" width="140" height="80" rx="14" fill="#C8A24A"/><rect x="310" y="420" width="180" height="100" rx="6" fill="#fff" opacity=".35"/>`,
  dumbbell: `<rect x="250" y="385" width="300" height="30" rx="10" fill="#C8A24A"/><rect x="190" y="300" width="70" height="200" rx="16"/><rect x="540" y="300" width="70" height="200" rx="16"/><rect x="150" y="330" width="50" height="140" rx="14"/><rect x="600" y="330" width="50" height="140" rx="14"/>`,
  "bottle-sport": `<rect x="315" y="240" width="170" height="390" rx="70"/><rect x="345" y="170" width="110" height="80" rx="20" fill="#C8A24A"/><rect x="315" y="380" width="170" height="40" fill="#fff" opacity=".25"/>`,
  toy: `<path d="M220 470 L260 380 Q290 340 360 340 L470 340 Q520 340 560 400 L600 420 Q620 430 620 470 L620 500 L200 500 L200 480 Z"/><circle cx="300" cy="510" r="50" fill="#1A2333"/><circle cx="520" cy="510" r="50" fill="#1A2333"/><circle cx="300" cy="510" r="18" fill="#C8A24A"/><circle cx="520" cy="510" r="18" fill="#C8A24A"/><rect x="330" y="360" width="80" height="60" rx="8" fill="#fff" opacity=".7"/>`,
  stroller: `<path d="M250 260 Q250 460 450 460 L560 460 L560 300 Q560 260 520 260 Z"/><path d="M560 300 L640 220" stroke="#C8A24A" stroke-width="14" stroke-linecap="round"/><circle cx="300" cy="560" r="46" fill="none" stroke="#1A2333" stroke-width="16"/><circle cx="520" cy="560" r="46" fill="none" stroke="#1A2333" stroke-width="16"/>`,
  jar: `<rect x="280" y="270" width="240" height="340" rx="40"/><rect x="300" y="210" width="200" height="70" rx="14" fill="#C8A24A"/><rect x="310" y="380" width="180" height="120" rx="8" fill="#fff" opacity=".85"/>`,
  fruit: `<ellipse cx="400" cy="430" rx="150" ry="190"/><ellipse cx="400" cy="470" rx="70" ry="80" fill="#C8A24A"/><path d="M400 240 Q420 200 460 190" stroke="#1F7A5A" stroke-width="12" fill="none"/>`,
  car: `<path d="M170 480 L210 400 L300 340 L500 340 L580 400 L640 420 L640 500 L170 500 Z"/><rect x="310" y="355" width="90" height="50" rx="6" fill="#fff" opacity=".6"/><rect x="410" y="355" width="80" height="50" rx="6" fill="#fff" opacity=".6"/><circle cx="270" cy="510" r="48" fill="#1A2333"/><circle cx="540" cy="510" r="48" fill="#1A2333"/><rect x="600" y="430" width="30" height="18" fill="#C8A24A"/>`,
  helmet: `<path d="M220 500 Q220 240 420 240 Q600 240 600 470 L600 520 L220 520 Z"/><path d="M420 330 L600 330 L600 440 L440 440 Q410 440 410 410 Z" fill="#0E1A2B" opacity=".8"/><rect x="220" y="500" width="380" height="24" fill="#C8A24A"/>`,
  book: `<rect x="250" y="190" width="300" height="420" rx="10"/><rect x="250" y="190" width="40" height="420" fill="#0E1A2B" opacity=".35"/><rect x="320" y="260" width="190" height="10" fill="#C8A24A"/><rect x="320" y="290" width="150" height="8" fill="#fff" opacity=".7"/><rect x="320" y="520" width="190" height="10" fill="#C8A24A"/>`,
  vase: `<path d="M340 190 L460 190 L450 250 Q560 330 540 470 Q520 600 400 610 Q280 600 260 470 Q240 330 350 250 Z"/><path d="M290 400 Q400 440 510 400" fill="none" stroke="#C8A24A" stroke-width="10"/><path d="M300 470 Q400 510 500 470" fill="none" stroke="#fff" stroke-width="6" opacity=".6"/>`,
  ring: `<circle cx="400" cy="440" r="140" fill="none" stroke="#C8A24A" stroke-width="30"/><path d="M350 300 L400 220 L450 300 Z"/><path d="M350 300 L450 300 L400 350 Z" opacity=".75"/>`,
  paw: `<ellipse cx="400" cy="470" rx="110" ry="90"/><ellipse cx="280" cy="350" rx="44" ry="58"/><ellipse cx="360" cy="290" rx="44" ry="58"/><ellipse cx="440" cy="290" rx="44" ry="58"/><ellipse cx="520" cy="350" rx="44" ry="58"/><ellipse cx="400" cy="480" rx="40" ry="30" fill="#C8A24A" opacity=".7"/>`,
  boxes: `<rect x="200" y="420" width="200" height="180" rx="6"/><rect x="400" y="420" width="200" height="180" rx="6" opacity=".85"/><rect x="300" y="240" width="200" height="180" rx="6" opacity=".92"/><rect x="380" y="240" width="40" height="180" fill="#C8A24A" opacity=".8"/><rect x="280" y="420" width="40" height="180" fill="#C8A24A" opacity=".8"/><rect x="480" y="420" width="40" height="180" fill="#C8A24A" opacity=".8"/>`,
  id: `<rect x="190" y="260" width="420" height="280" rx="18"/><circle cx="290" cy="380" r="50" fill="#fff" opacity=".7"/><rect x="370" y="340" width="200" height="16" fill="#fff" opacity=".7"/><rect x="370" y="380" width="160" height="12" fill="#C8A24A"/>`,
};

function rgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mixes `hex` towards `target` by `amount` (0..1). */
function mix(hex: string, target: [number, number, number], amount: number) {
  const c = rgb(hex).map((v, i) => Math.round(v + (target[i] - v) * amount));
  return `rgb(${c.join(",")})`;
}

// Light products (white, sand, silver) disappear on a pale backdrop, so they get a darker one.
function isLight(hex: string) {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 170;
}

export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const key = kind.replace(/\.svg$/, "");
  const url = new URL(req.url);
  const raw = url.searchParams.get("c") ?? "#1C2A40";
  const color = /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : "#1C2A40";
  const v = Math.min(9, Math.max(0, Number(url.searchParams.get("v")) || 0));
  const shape = SHAPES[key] ?? SHAPES.boxes;
  const rotate = [0, -8, 8, -14, 12, 0, -4, 6, -10, 10][v];
  const scale = [1, 0.92, 0.92, 0.82, 0.82, 1.08, 0.95, 0.88, 1, 0.9][v];
  const angle = [135, 160, 110, 180, 90, 135, 200, 70, 150, 120][v];
  const light = isLight(color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
<defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="${light ? mix(color, [74, 84, 100], 0.72) : mix(color, [250, 248, 243], 0.9)}"/><stop offset="1" stop-color="${light ? mix(color, [44, 52, 66], 0.8) : mix(color, [250, 248, 243], 0.78)}"/></linearGradient>
<radialGradient id="s" cx=".5" cy=".85" r=".45"><stop offset="0" stop-color="#0E1A2B" stop-opacity=".16"/><stop offset="1" stop-color="#0E1A2B" stop-opacity="0"/></radialGradient></defs>
<rect width="800" height="800" fill="url(#g)"/>
<ellipse cx="400" cy="660" rx="260" ry="40" fill="url(#s)"/>
<g transform="translate(400 400) rotate(${rotate}) scale(${scale}) translate(-400 -400)" fill="${color}" color="${color}">${shape}</g>
</svg>`;
  return new Response(svg, {
    headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=31536000, immutable", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'" },
  });
}
