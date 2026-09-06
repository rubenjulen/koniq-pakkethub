// Maakt echte schermafbeeldingen voor de in-app handleiding + PDF.
// Draait tegen een lokale dev-server met demo-data (poort via BASE),
// logt in als de demo-accounts en legt de kernschermen vast in public/help/.
//   BASE=http://localhost:3071 node scripts/gen-help-screenshots.mjs
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "help");
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE || "http://localhost:3071";
const EDGE = process.env.EDGE || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PW = "demo12345";

// [pad, bestandsnaam, account|null(publiek)]
const SHOTS = [
  ["/", "home", null],
  ["/verzenden", "check", null],
  ["/ontdek", "ontdek", null],
  ["/app", "overview", "sender@pakkethub.com"],
  ["/app/marketplace", "marketplace", "sender@pakkethub.com"],
  ["/app/shipments/14000000-0000-0000-0000-0000000000d2", "shipment", "sender@pakkethub.com"],
  ["/app/messages", "messages", "sender@pakkethub.com"],
  ["/app/trips", "trips", "traveler@pakkethub.com"],
  ["/app/wallet", "wallet", "traveler@pakkethub.com"],
  ["/app/control", "control", "admin@pakkethub.com"],
  ["/app/insights", "insights", "admin@pakkethub.com"],
  ["/app/ops", "ops_intake", "hub@pakkethub.com"],
  ["/app/manifests", "ops_manifests", "hub@pakkethub.com"],
  ["/app/lockers", "ops_lockers", "hub@pakkethub.com"],
];
// ONLY=bestand1,bestand2 → leg alleen die vast (rest overslaan).
const ONLY = (process.env.ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
const PICK = ONLY.length ? SHOTS.filter(([, f]) => ONLY.includes(f)) : SHOTS;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser;
if (process.env.BROWSER_URL) {
  // Edge is los gestart met --remote-debugging-port; verbind daarop (robuust op Windows).
  browser = await puppeteer.connect({ browserURL: process.env.BROWSER_URL, defaultViewport: null, protocolTimeout: 120000 });
} else {
  const PROFILE = join(process.env.TEMP || ROOT, "pkh-edge-profile-" + Date.now());
  mkdirSync(PROFILE, { recursive: true });
  browser = await puppeteer.launch({
    executablePath: EDGE, headless: false, pipe: false, userDataDir: PROFILE,
    args: ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check"],
  });
}
const page = (await browser.pages())[0] || await browser.newPage();
page.setDefaultNavigationTimeout(60000);
page.setDefaultTimeout(60000);
await page.setViewport({ width: 1320, height: 900, deviceScaleFactor: 1.5 });
await page.setCookie(
  { name: "locale", value: "nl", domain: "localhost", path: "/" },
  { name: "theme", value: "light", domain: "localhost", path: "/" },
);

const go = async (path) => { await page.goto(BASE + path, { waitUntil: "domcontentloaded" }); await sleep(1400); };

async function resetCookies() {
  const cs = await page.cookies(BASE).catch(() => []);
  for (const c of cs) await page.deleteCookie({ name: c.name, domain: c.domain, path: c.path }).catch(() => {});
  await page.setCookie(
    { name: "locale", value: "nl", domain: "localhost", path: "/" },
    { name: "theme", value: "light", domain: "localhost", path: "/" },
  );
}

let current = null;
async function login(email) {
  await resetCookies(); // anders stuurt /login door naar /app als er nog een sessie is
  await go("/login");
  // Waarden zetten én formulier versturen in één evaluate (voorkomt race met navigatie).
  await page.evaluate((e, p) => {
    const em = document.querySelector("input[name=email]");
    const pw = document.querySelector("input[name=password]");
    if (em) em.value = e;
    if (pw) pw.value = p;
    (em && em.closest("form"))?.requestSubmit();
  }, email, PW);
  await sleep(3500); // server-action + navigatie
  current = email;
}

for (const [path, file, account] of PICK) {
  if (account && account !== current) await login(account);
  await go(path);
  await page.screenshot({ path: join(OUT, `${file}.png`) });
  console.log("geschreven:", `public/help/${file}.png`);
}

if (process.env.BROWSER_URL) await browser.disconnect(); else await browser.close();
console.log("klaar.");
