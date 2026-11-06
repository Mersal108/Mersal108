// Draws the contribution graph as a koi pond: every day with contributions
// is a lily pad (bigger and brighter on busier days), the busiest days carry
// a lotus, and koi swim underneath. Nothing gets eaten.
//
//   GITHUB_TOKEN=... node scripts/contribution-pond.mjs <user> <out.svg>
//   node scripts/contribution-pond.mjs --data days.json <out.svg>
//
// days.json: { "total": 123, "days": [{ "date": "2026-01-01", "count": 3, "level": 2 }, ...] }

import { writeFileSync, readFileSync } from "node:fs";

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

async function fetchCalendar(user) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  const query = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
    totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } } } }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "contribution-pond" },
    body: JSON.stringify({ query, variables: { login: user } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub API: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  const cal = json.data.user.contributionsCollection.contributionCalendar;
  return {
    total: cal.totalContributions,
    days: cal.weeks.flatMap((w) => w.contributionDays).map((d) => ({
      date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0,
    })),
  };
}

// Small deterministic hash so each pad keeps the same turn and wobble every day.
function hash(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

const r1 = (n) => Math.round(n * 10) / 10;

function render({ total, days }) {
  const W = 800, H = 186;
  const cell = 13.6, gx = 40, gy = 52;

  const first = new Date(days[0].date + "T00:00:00Z");
  const offset = first.getUTCDay(); // weeks start on Sunday
  const busiest = [...days].sort((a, b) => b.count - a.count).filter((d) => d.count > 0).slice(0, 5).map((d) => d.date);

  const pads = [], ripples = [], lotuses = [];
  const months = [];
  let lastMonth = -1;

  days.forEach((d, i) => {
    const idx = i + offset;
    const col = Math.floor(idx / 7), row = idx % 7;
    const cx = gx + col * cell + cell / 2, cy = gy + row * cell + cell / 2;
    const date = new Date(d.date + "T00:00:00Z");
    if (date.getUTCDate() <= 7 && date.getUTCMonth() !== lastMonth && row === 0) {
      lastMonth = date.getUTCMonth();
      months.push({ x: cx - cell / 2, label: date.toLocaleString("en", { month: "short", timeZone: "UTC" }) });
    }
    const h = hash(d.date);
    if (d.level === 0) {
      ripples.push(`<circle cx="${r1(cx)}" cy="${r1(cy)}" r="1.3"/>`);
      return;
    }
    const r = [0, 4.4, 5.1, 5.7, 6.3][d.level];
    const fill = ["", "#166534", "#15803d", "#16a34a", "#22c55e"][d.level];
    const rot = Math.round(h * 360);
    pads.push(`<use href="#pad" xlink:href="#pad" fill="${fill}" transform="translate(${r1(cx)} ${r1(cy)}) rotate(${rot}) scale(${r1(r / 10)})"><title>${d.count} on ${d.date}</title></use>`);
    if (busiest.includes(d.date)) {
      lotuses.push(`<use href="#lotus" xlink:href="#lotus" transform="translate(${r1(cx)} ${r1(cy - 1)})"/>`);
    }
  });

  const gridW = Math.ceil((days.length + offset) / 7) * cell;
  const right = gx + gridW;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="title">
  <title id="title">${total} contributions in the last year, drawn as lily pads on a koi pond</title>
  <defs>
    <radialGradient id="water" cx="50%" cy="50%" r="75%">
      <stop offset="0" stop-color="#1e3a8a"/>
      <stop offset="0.6" stop-color="#172554"/>
      <stop offset="1" stop-color="#0f172a"/>
    </radialGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <path id="pad" d="M0 0L9.66-2.59A10 10 0 1 0 9.66 2.59Z"/>
    <g id="lotus">
      <path d="M0 0C-1.6-2.4-1.6-5.6 0-8C1.6-5.6 1.6-2.4 0 0Z" fill="#f8fafc"/>
      <path d="M0 0C-3.2-1.2-4.8-4-4.8-6.4C-2.4-5.2-0.8-3.2 0 0Z" fill="#e2e8f0"/>
      <path d="M0 0C3.2-1.2 4.8-4 4.8-6.4C2.4-5.2 0.8-3.2 0 0Z" fill="#e2e8f0"/>
      <circle cy="-2.4" r="1" fill="#fde047"/>
    </g>
    <path id="body" d="M26 0C25-6 14-8.5 2-8C-10-7.5-20-4-26 0C-20 4-10 7.5 2 8C14 8.5 25 6 26 0Z"/>
    <clipPath id="bodyClip"><use href="#body" xlink:href="#body"/></clipPath>
    <g id="tail"><path d="M-23 0Q-33-2-43-11Q-38 0-43 11Q-33 2-23 0Z">
      <animateTransform attributeName="transform" type="rotate" values="-14 -23 0;14 -23 0;-14 -23 0" dur="0.9s" repeatCount="indefinite"/></path></g>
    <g id="fins"><path d="M12-6Q4-17-3-15Q3-10 8-6Z"/><path d="M12 6Q4 17-3 15Q3 10 8 6Z"/></g>
    <g id="kohaku">
      <use href="#tail" xlink:href="#tail" fill="#fde2d4" opacity="0.85"/>
      <use href="#fins" xlink:href="#fins" fill="#fef3ee" opacity="0.75"/>
      <use href="#body" xlink:href="#body" fill="#f8fafc"/>
      <g clip-path="url(#bodyClip)" fill="#ef4444"><ellipse cx="15" cy="-1" rx="9" ry="6"/><ellipse cx="-6" cy="3" rx="9" ry="5"/></g>
    </g>
    <g id="ogon">
      <use href="#tail" xlink:href="#tail" fill="#fdba74" opacity="0.85"/>
      <use href="#fins" xlink:href="#fins" fill="#fed7aa" opacity="0.75"/>
      <use href="#body" xlink:href="#body" fill="#fb923c"/>
    </g>
    <g id="showa">
      <use href="#tail" xlink:href="#tail" fill="#e2e8f0" opacity="0.8"/>
      <use href="#fins" xlink:href="#fins" fill="#1e293b" opacity="0.8"/>
      <use href="#body" xlink:href="#body" fill="#111827"/>
      <g clip-path="url(#bodyClip)"><ellipse cx="13" cy="2" rx="9" ry="6" fill="#dc2626"/><ellipse cx="-8" cy="-3" rx="8" ry="5" fill="#f8fafc"/></g>
    </g>
    <path id="swim1" d="M-60 80C150 40 300 130 450 90C600 50 700 120 860 90"/>
    <path id="swim2" d="M860 130C650 170 520 70 380 110C240 150 120 80 -60 120"/>
    <path id="swim3" d="M-60 150C120 120 260 60 420 70C580 80 680 160 860 60"/>
  </defs>

  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#water)"/>

    <text x="${gx}" y="32" font-family="-apple-system,'Segoe UI',Helvetica,Arial,sans-serif" font-size="15" font-weight="600" fill="#e2e8f0">${total.toLocaleString("en")} contributions in the last year</text>

    <!-- koi swim under the pads -->
    <use href="#kohaku" xlink:href="#kohaku" opacity="0.9" transform="scale(0.42)">
      <animateMotion dur="26s" repeatCount="indefinite" rotate="auto"><mpath href="#swim1" xlink:href="#swim1"/></animateMotion>
    </use>
    <use href="#ogon" xlink:href="#ogon" opacity="0.9" transform="scale(0.42)">
      <animateMotion dur="31s" begin="-12s" repeatCount="indefinite" rotate="auto"><mpath href="#swim2" xlink:href="#swim2"/></animateMotion>
    </use>
    <use href="#showa" xlink:href="#showa" opacity="0.9" transform="scale(0.42)">
      <animateMotion dur="36s" begin="-20s" repeatCount="indefinite" rotate="auto"><mpath href="#swim3" xlink:href="#swim3"/></animateMotion>
    </use>

    <g fill="#3b82f6" opacity="0.35">
      ${ripples.join("")}
    </g>
    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0;0.6 -0.6;0 0" dur="6s" repeatCount="indefinite"/>
      ${pads.join("\n      ")}
      ${lotuses.join("\n      ")}
    </g>

    <g font-family="-apple-system,'Segoe UI',Helvetica,Arial,sans-serif" font-size="10" fill="#94a3b8">
      ${months.map((m) => `<text x="${r1(m.x)}" y="${gy + 7 * cell + 16}">${m.label}</text>`).join("")}
    </g>
    <g font-family="-apple-system,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="#94a3b8" text-anchor="end">
      <text x="${r1(right - 88)}" y="31">Less</text>
      ${[1, 2, 3, 4].map((l, k) => `<use href="#pad" xlink:href="#pad" fill="${["", "#166534", "#15803d", "#16a34a", "#22c55e"][l]}" transform="translate(${r1(right - 76 + k * 13)} 27) rotate(200) scale(${[0, 0.44, 0.51, 0.57, 0.63][l]})"/>`).join("")}
      <text x="${r1(right)}" y="31">More</text>
    </g>
  </g>
</svg>
`;
}

const args = process.argv.slice(2);
let data, out;
if (args[0] === "--data") {
  data = JSON.parse(readFileSync(args[1], "utf8"));
  out = args[2];
} else {
  data = await fetchCalendar(args[0]);
  out = args[1];
}
writeFileSync(out, render(data));
console.log(`wrote ${out}: ${data.total} contributions over ${data.days.length} days`);
