// Genera stats.svg con i contributi (anche privati) dell'ultimo anno.
import { writeFileSync } from "node:fs";

const user = process.env.GH_USER || "antoniodigilio";
const token = process.env.GH_TOKEN;
if (!token) throw new Error("GH_TOKEN mancante");

const query = `query($login:String!){user(login:$login){contributionsCollection{
  totalCommitContributions totalPullRequestContributions totalIssueContributions
  contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login: user } }),
});
const json = await res.json();
if (json.errors || !json.data?.user) throw new Error(JSON.stringify(json));

const cc = json.data.user.contributionsCollection;
const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
const today = new Date().toISOString().slice(0, 10);

let longest = 0, run = 0;
for (const d of days) {
  run = d.contributionCount > 0 ? run + 1 : 0;
  longest = Math.max(longest, run);
}
let current = 0;
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].date > today) continue;
  if (days[i].contributionCount > 0) current++;
  else if (days[i].date !== today) break;
}
const activeDays = days.filter((d) => d.contributionCount > 0).length;

const fmt = (n) => n.toLocaleString("it-IT");
const items = [
  [fmt(cc.contributionCalendar.totalContributions), "Contributi (12 mesi)"],
  [fmt(activeDays), "Giorni attivi"],
  [fmt(current), "Streak attuale"],
  [fmt(longest), "Streak record"],
];
const cell = 190;
const cards = items.map(([v, l], i) => {
  const x = 20 + i * cell + cell / 2;
  return `<text x="${x}" y="68" text-anchor="middle" font-size="34" font-weight="700" fill="#70a5fd">${v}</text>
  <text x="${x}" y="96" text-anchor="middle" font-size="13" fill="#38bdae">${l}</text>`;
}).join("\n  ");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="130" viewBox="0 0 800 130" font-family="Segoe UI, Ubuntu, sans-serif">
  <rect x="0.5" y="0.5" width="799" height="129" rx="10" fill="#1a1b27"/>
  ${cards}
  <text x="400" y="121" text-anchor="middle" font-size="10" fill="#6b7089">Aggiornato il ${today}</text>
</svg>
`;
writeFileSync("stats.svg", svg);
console.log("stats.svg generato:", items.map((i) => i.join(" ")).join(" | "));
