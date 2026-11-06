// Shared pieces for the generated pond pictures: the GitHub GraphQL call
// and the koi drawing (head pointing +x, centred on the origin).

export async function graphql(query, variables) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "koi-pond" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub API: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  return json.data;
}

export const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

// Shapes every koi uses; put once inside <defs>.
export const koiBase = `
    <path id="body" d="M26 0C25-6 14-8.5 2-8C-10-7.5-20-4-26 0C-20 4-10 7.5 2 8C14 8.5 25 6 26 0Z"/>
    <clipPath id="bodyClip"><use href="#body" xlink:href="#body"/></clipPath>
    <g id="tail"><path d="M-23 0Q-33-2-43-11Q-38 0-43 11Q-33 2-23 0Z">
      <animateTransform attributeName="transform" type="rotate" values="-14 -23 0;14 -23 0;-14 -23 0" dur="0.9s" repeatCount="indefinite"/></path></g>
    <g id="fins"><path d="M12-6Q4-17-3-15Q3-10 8-6Z"/><path d="M12 6Q4 17-3 15Q3 10 8 6Z"/></g>`;

// One koi variety. patches: [{cx, cy, rx, ry, fill}], clipped to the body.
export function koi(id, { body, fins, tail, patches = [], eye = "#0f172a", shadow = true }) {
  return `
    <g id="${id}">
      ${shadow ? `<g fill="#020617" opacity="0.3" transform="translate(3 5)"><use href="#body" xlink:href="#body"/><use href="#tail" xlink:href="#tail"/></g>` : ""}
      <use href="#tail" xlink:href="#tail" fill="${tail}" opacity="0.85"/>
      <use href="#fins" xlink:href="#fins" fill="${fins}" opacity="0.8"/>
      <use href="#body" xlink:href="#body" fill="${body}"/>
      <g clip-path="url(#bodyClip)">${patches.map((p) => `<ellipse cx="${p.cx}" cy="${p.cy}" rx="${p.rx}" ry="${p.ry}" fill="${p.fill}"/>`).join("")}</g>
      <circle cx="20" cy="-3.6" r="1.3" fill="${eye}"/><circle cx="20" cy="3.6" r="1.3" fill="${eye}"/>
    </g>`;
}

export const KOHAKU = { body: "#f8fafc", fins: "#fef3ee", tail: "#fde2d4", patches: [
  { cx: 15, cy: -1, rx: 9, ry: 6, fill: "#ef4444" }, { cx: -6, cy: 3, rx: 9, ry: 5, fill: "#ef4444" }] };

// Mix a hex colour with white (t = 0 keeps it, 1 is white).
export function lighten(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
