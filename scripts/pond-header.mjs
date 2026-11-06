// Draws the README header pond as it looks right now in Cairo: sunrise,
// day, sunset or night, with the sun or moon moving across the sky.
// The workflow reruns it every hour.
//
//   node scripts/pond-header.mjs <out.svg> [--hour 21.5]

import { writeFileSync } from "node:fs";
import { koiBase, koi, KOHAKU, FONT } from "./lib.mjs";

const TZ = "Africa/Cairo";

function cairoHour(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", minute: "numeric", hourCycle: "h23" })
    .formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return get("hour") + get("minute") / 60;
}

const PHASES = {
  dawn: {
    label: "sunrise in Cairo", sky: ["#1e293b", "#64748b", "#fdba74"], water: ["#475569", "#1e293b"],
    stars: 0.25, clouds: "#fed7aa", cloudOpacity: 0.55, ripple: "#e2e8f0",
  },
  day: {
    label: "daytime in Cairo", sky: ["#0284c7", "#38bdf8", "#bae6fd"], water: ["#0ea5e9", "#075985"],
    stars: 0, clouds: "#ffffff", cloudOpacity: 0.85, ripple: "#e0f2fe",
  },
  dusk: {
    label: "sunset in Cairo", sky: ["#1e1b4b", "#9a3412", "#fb923c"], water: ["#1e3a8a", "#172554"],
    stars: 0.3, clouds: "#fdba74", cloudOpacity: 0.5, ripple: "#fed7aa",
  },
  night: {
    label: "night in Cairo", sky: ["#0f172a", "#1e3a8a", "#3b4fa8"], water: ["#1d4ed8", "#172554"],
    stars: 1, clouds: null, cloudOpacity: 0, ripple: "#93c5fd",
  },
};

function phaseFor(h) {
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 17) return "day";
  if (h >= 17 && h < 19.5) return "dusk";
  return "night";
}

// Where the sun (05:00 to 19:30) or the moon (19:30 to 05:00) sits on its arc.
function skyBody(h) {
  const sunUp = h >= 5 && h < 19.5;
  const t = sunUp ? (h - 5) / 14.5 : ((h - 19.5 + 24) % 24) / 9.5;
  return { sunUp, x: 90 + t * 620, y: 128 - Math.sin(Math.PI * t) * 92 };
}

const r1 = (n) => Math.round(n * 10) / 10;

function render(h) {
  const W = 800, H = 190, waterY = 140;
  const name = phaseFor(h), p = PHASES[name];
  const b = skyBody(h);

  const stars = [[320, 30, 1.4, 3], [420, 55, 1.1, 2.4], [530, 24, 1.6, 4], [580, 92, 1, 3.3], [760, 30, 1.3, 2.8],
    [270, 88, 1, 3.6], [470, 100, 1.2, 2.2], [140, 60, 1.2, 3.1], [690, 70, 1, 2.6], [60, 30, 1.3, 3.4]]
    .filter(([x, y]) => Math.hypot(x - b.x, y - b.y) > 50)
    .map(([x, y, r, d]) => `<circle cx="${x}" cy="${y}" r="${r}"><animate attributeName="opacity" values="1;0.25;1" dur="${d}s" repeatCount="indefinite"/></circle>`)
    .join("\n      ");

  const sun = name === "day"
    ? { core: "#fde047", glow: "#fef08a", glowOpacity: 0.6 }
    : { core: "#fb923c", glow: "#fdba74", glowOpacity: 0.55 };

  const body = b.sunUp
    ? `<circle cx="${r1(b.x)}" cy="${r1(b.y)}" r="80" fill="url(#glow)"/>
    <circle cx="${r1(b.x)}" cy="${r1(b.y)}" r="26" fill="${sun.core}"/>`
    : `<circle cx="${r1(b.x)}" cy="${r1(b.y)}" r="70" fill="url(#glow)"/>
    <circle cx="${r1(b.x)}" cy="${r1(b.y)}" r="30" fill="#e2e8f0"/>
    <circle cx="${r1(b.x - 10)}" cy="${r1(b.y - 8)}" r="5" fill="#cbd5e1" opacity="0.8"/>
    <circle cx="${r1(b.x + 10)}" cy="${r1(b.y + 10)}" r="3.5" fill="#cbd5e1" opacity="0.8"/>`;
  const glow = b.sunUp ? sun.glow : "#bfdbfe";
  const glowOpacity = b.sunUp ? sun.glowOpacity : 0.45;
  const reflection = b.sunUp ? sun.core : "#e2e8f0";

  const clouds = p.clouds ? `
    <g fill="${p.clouds}" opacity="${p.cloudOpacity}">
      <g>
        <animateTransform attributeName="transform" type="translate" values="-120 0;920 0" dur="90s" begin="-30s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="44" rx="42" ry="11"/><ellipse cx="-16" cy="36" rx="20" ry="11"/><ellipse cx="12" cy="34" rx="22" ry="13"/>
      </g>
      <g>
        <animateTransform attributeName="transform" type="translate" values="-120 0;920 0" dur="120s" begin="-85s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="82" rx="34" ry="9"/><ellipse cx="-10" cy="75" rx="18" ry="9"/><ellipse cx="12" cy="74" rx="16" ry="10"/>
      </g>
      <g>
        <animateTransform attributeName="transform" type="translate" values="-120 0;920 0" dur="105s" begin="-10s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="22" rx="28" ry="8"/><ellipse cx="8" cy="15" rx="16" ry="9"/>
      </g>
    </g>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="title">
  <title id="title">A koi pond as it looks now: ${p.label}</title>
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.sky[0]}"/>
      <stop offset="0.6" stop-color="${p.sky[1]}"/>
      <stop offset="1" stop-color="${p.sky[2]}"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${p.water[0]}"/>
      <stop offset="1" stop-color="${p.water[1]}"/>
    </linearGradient>
    <radialGradient id="glow">
      <stop offset="0" stop-color="${glow}" stop-opacity="${glowOpacity}"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <clipPath id="aboveWater"><rect width="${W}" height="${waterY + 2}"/></clipPath>
    <path id="pad" d="M0 0L21.25 -5.69A22 22 0 1 0 21.25 5.69Z"/>
    ${koiBase}
    ${koi("kohaku", { ...KOHAKU, shadow: false })}
    <path id="jump" d="M300 160Q370 40 440 160"/>
  </defs>

  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <g fill="#e0e7ff" opacity="${p.stars}">
      ${stars}
    </g>
    ${body}
    ${clouds}

    <rect y="${waterY}" width="${W}" height="${H - waterY}" fill="url(#water)"/>
    <g stroke="${p.ripple}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.5">
      <path d="M40 158h40M520 170h50M690 160h30M200 176h36">
        <animateTransform attributeName="transform" type="translate" values="0 0;14 0;0 0" dur="5s" repeatCount="indefinite"/>
      </path>
    </g>
    <ellipse cx="${r1(b.x)}" cy="${waterY + 12}" rx="30" ry="4" fill="${reflection}" opacity="0.35">
      <animate attributeName="rx" values="30;24;30" dur="4s" repeatCount="indefinite"/>
    </ellipse>

    <g clip-path="url(#aboveWater)">
      <use href="#kohaku" xlink:href="#kohaku" opacity="0">
        <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" keyPoints="0;0;1;1" keyTimes="0;0.55;0.8;1" calcMode="linear"><mpath href="#jump" xlink:href="#jump"/></animateMotion>
        <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.55;0.56;0.79;0.8;1" dur="7s" repeatCount="indefinite"/>
      </use>
    </g>
    <g fill="none" stroke="${p.ripple}" stroke-width="1.5">
      <ellipse cx="305" cy="146" rx="0" ry="0">
        <animate attributeName="rx" values="0;0;22;22" keyTimes="0;0.55;0.7;1" dur="7s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="0;0;5;5" keyTimes="0;0.55;0.7;1" dur="7s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0;0.9;0;0" keyTimes="0;0.55;0.56;0.7;1" dur="7s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="435" cy="146" rx="0" ry="0">
        <animate attributeName="rx" values="0;0;24;24" keyTimes="0;0.79;0.95;1" dur="7s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="0;0;5;5" keyTimes="0;0.79;0.95;1" dur="7s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;0;0.9;0;0" keyTimes="0;0.79;0.8;0.95;1" dur="7s" repeatCount="indefinite"/>
      </ellipse>
    </g>

    <g>
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -1.5;0 0" dur="4s" repeatCount="indefinite"/>
      <use href="#pad" xlink:href="#pad" fill="#22c55e" transform="translate(120 160) rotate(30) scale(1 0.45)"/>
      <use href="#pad" xlink:href="#pad" fill="#16a34a" transform="translate(560 172) rotate(160) scale(0.9 0.4)"/>
      <use href="#pad" xlink:href="#pad" fill="#15803d" transform="translate(455 183) rotate(-40) scale(0.7 0.35)"/>
      <use href="#pad" xlink:href="#pad" fill="#16a34a" transform="translate(220 180) rotate(210) scale(0.6 0.3)"/>
    </g>

    <text x="${W - 22}" y="${H - 12}" text-anchor="end" font-family="${FONT}" font-size="11" fill="#f8fafc" opacity="0.7">${p.label}</text>
  </g>
</svg>
`;
}

const args = process.argv.slice(2);
const out = args[0];
const i = args.indexOf("--hour");
const h = i >= 0 ? Number(args[i + 1]) : cairoHour();
writeFileSync(out, render(h));
console.log(`wrote ${out}: ${phaseFor(h)} (Cairo hour ${h.toFixed(2)})`);
