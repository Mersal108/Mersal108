// Draws the top languages of your public repos as koi in a pond: each koi
// wears its language's GitHub colour and its size follows its share.
//
//   GITHUB_TOKEN=... node scripts/language-koi.mjs <user> <out.svg>
//   node scripts/language-koi.mjs --data languages.json <out.svg>
//
// languages.json: [{ "name": "Python", "color": "#3572A5", "size": 12345 }, ...]

import { writeFileSync, readFileSync } from "node:fs";
import { graphql, koiBase, koi, lighten, luminance, FONT } from "./lib.mjs";

async function fetchLanguages(user) {
  const data = await graphql(
    `query($login: String!) { user(login: $login) {
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
        nodes { languages(first: 20, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name color } } } } } } }`,
    { login: user },
  );
  const totals = new Map();
  for (const repo of data.user.repositories.nodes) {
    for (const { size, node } of repo.languages.edges) {
      const t = totals.get(node.name) ?? { name: node.name, color: node.color ?? "#94a3b8", size: 0 };
      t.size += size;
      totals.set(node.name, t);
    }
  }
  return [...totals.values()];
}

// Patch colours taken from a language's logo, where that tells two
// similar colours apart; others get white (or orange on a light koi).
const PATCHES = { Python: "#ffd43b", JavaScript: "#1e293b" };

const SWIMS = [
  "M60 100C60 40 240 30 300 100C360 170 540 160 540 100C540 40 360 30 300 100C240 170 60 160 60 100Z",
  "M120 50C260 10 470 30 520 80C570 140 380 185 240 160C110 140 40 80 120 50Z",
  "M480 150C360 190 120 180 70 130C30 85 200 30 340 50C480 70 560 110 480 150Z",
  "M40 40C150 60 200 170 320 145C440 120 450 40 540 60C600 75 560 180 430 175C300 170 220 40 40 40Z",
  "M300 30C450 30 560 90 500 140C440 185 160 190 90 140C30 95 150 30 300 30Z",
];

function render(langs) {
  const W = 800, H = 210, split = 570;
  const total = langs.reduce((s, l) => s + l.size, 0);
  const top = [...langs].sort((a, b) => b.size - a.size).slice(0, 5);
  const max = top[0]?.size ?? 1;

  const defs = top.map((l, i) => {
    // Very dark language colours would vanish into the water, so lift them.
    const color = luminance(l.color) < 0.08 ? lighten(l.color, 0.35) : l.color;
    const light = luminance(color) > 0.45;
    const patch = PATCHES[l.name] ?? (light ? "#f97316" : "#f8fafc");
    return koi(`koi${i}`, {
      body: color,
      fins: lighten(color, 0.45),
      tail: lighten(color, 0.3),
      eye: light ? "#0f172a" : "#f8fafc",
      patches: [
        { cx: 13, cy: -2, rx: 8, ry: 5, fill: patch },
        { cx: -9, cy: 3, rx: 7, ry: 4, fill: patch },
      ],
    });
  }).join("");

  const swimmers = top.map((l, i) => {
    const scale = (0.6 + 0.7 * (l.size / max)).toFixed(2);
    const dur = 20 + i * 4;
    return `<use href="#koi${i}" xlink:href="#koi${i}" transform="scale(${scale})">
      <animateMotion dur="${dur}s" begin="-${i * 5}s" repeatCount="indefinite" rotate="auto"><mpath href="#swim${i}" xlink:href="#swim${i}"/></animateMotion>
    </use>`;
  }).join("\n    ");

  const rowH = 30, legendTop = (H - top.length * rowH) / 2 + 22;
  const legend = top.map((l, i) => {
    const y = legendTop + i * rowH;
    const pct = ((l.size / total) * 100).toFixed(1);
    return `<use href="#koi${i}" xlink:href="#koi${i}" transform="translate(${split + 34} ${y}) scale(0.42)"/>
      <text x="${split + 62}" y="${y + 4.5}" font-family="${FONT}" font-size="13" font-weight="600" fill="#e2e8f0">${l.name}</text>
      <text x="${W - 24}" y="${y + 4.5}" text-anchor="end" font-family="${FONT}" font-size="12" fill="#94a3b8">${pct}%</text>`;
  }).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="title">
  <title id="title">My top languages as koi: ${top.map((l) => `${l.name} ${((l.size / total) * 100).toFixed(1)}%`).join(", ")}</title>
  <defs>
    <radialGradient id="water" cx="38%" cy="50%" r="70%">
      <stop offset="0" stop-color="#1e3a8a"/>
      <stop offset="0.6" stop-color="#172554"/>
      <stop offset="1" stop-color="#0f172a"/>
    </radialGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <clipPath id="pondArea"><rect width="${split}" height="${H}"/></clipPath>
    <path id="pad" d="M0 0L21.25 -5.69A22 22 0 1 0 21.25 5.69Z"/>
    ${koiBase}
    ${defs}
    ${top.map((_, i) => `<path id="swim${i}" d="${SWIMS[i]}"/>`).join("\n    ")}
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#water)"/>
    <g clip-path="url(#pondArea)">
    ${swimmers}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0;1.5 -1;0 0" dur="7s" repeatCount="indefinite"/>
        <use href="#pad" xlink:href="#pad" fill="#15803d" transform="translate(46 34) rotate(40) scale(0.9)"/>
        <use href="#pad" xlink:href="#pad" fill="#166534" transform="translate(500 178) rotate(-60) scale(0.8)"/>
        <use href="#pad" xlink:href="#pad" fill="#14532d" transform="translate(530 150) rotate(270) scale(0.45)"/>
      </g>
    </g>
    <rect x="${split}" width="${W - split}" height="${H}" fill="#0f172a" opacity="0.55"/>
    <line x1="${split}" y1="0" x2="${split}" y2="${H}" stroke="#1e3a8a" stroke-width="1"/>
    <text x="${split + 24}" y="${legendTop - 24}" font-family="${FONT}" font-size="11" font-weight="600" letter-spacing="1.5" fill="#64748b">TOP LANGUAGES</text>
    ${legend}
  </g>
</svg>
`;
}

const args = process.argv.slice(2);
let langs, out;
if (args[0] === "--data") {
  langs = JSON.parse(readFileSync(args[1], "utf8"));
  out = args[2];
} else {
  langs = await fetchLanguages(args[0]);
  out = args[1];
}
writeFileSync(out, render(langs));
console.log(`wrote ${out}: ${langs.length} languages`);
