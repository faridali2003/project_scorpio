/**
 * Capture portfolio screenshots via Microsoft Edge at 1920x1080.
 * Run: node tools/capture-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outMain = path.join(root, 'docs', 'screenshots');
const outAim = path.join(root, '..', 'project_scorpio-aim-lab', 'docs', 'screenshots');
const outSoccer = path.join(root, '..', 'project_scorpio-soccer', 'docs', 'screenshots');

for (const dir of [outMain, outAim, outSoccer]) {
  fs.mkdirSync(dir, { recursive: true });
}

const VIEWPORT = { width: 1920, height: 1080 };

async function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function capture() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // ── Auth login (new mascot UI) ──
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await wait(1200);
  await page.screenshot({ path: path.join(outMain, '01-auth-login.png') });
  await page.screenshot({ path: path.join(outMain, '00-auth-mascots-hero.png') });

  // ── Login → store (fake demo credentials only) ──
  await page.fill('input[name="email"]', 'blorp.mcfake@totally-not-real.invalid');
  await page.fill('input[name="password"]', 'ShowcaseWin888!');
  await page.click('button[type="submit"]');
  await page.waitForSelector('text=Original titles', { timeout: 15000 });
  await wait(600);
  await page.screenshot({ path: path.join(outMain, '02-store-originals.png'), fullPage: false });

  // ── Aim Lab menu ──
  await page.goto('http://localhost:3000/?play=speedrun-shooter', { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Click to play'));
      return btn && !btn.disabled;
    },
    { timeout: 60000 }
  );
  await wait(500);
  const aimMenu = path.join(outMain, '03-aim-lab-menu.png');
  await page.screenshot({ path: aimMenu });
  fs.copyFileSync(aimMenu, path.join(outAim, '01-menu.png'));

  // ── Aim Lab gameplay ──
  await page.click('button:has-text("Click to play")');
  await wait(1200);
  await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height / 2);
  await wait(2500);
  const aimGameplay = path.join(outMain, '04-aim-lab-gameplay.png');
  await page.screenshot({ path: aimGameplay });
  fs.copyFileSync(aimGameplay, path.join(outAim, '03-gameplay-hud.png'));

  // ── Soccer pre-match / stadium ──
  await page.goto('http://localhost:3000/?play=scorpio-soccer', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Kick off', { timeout: 30000 });
  await wait(800);
  const soccerMenu = path.join(outMain, '05-soccer-menu.png');
  await page.screenshot({ path: soccerMenu });
  fs.copyFileSync(soccerMenu, path.join(outSoccer, '02-stadium.png'));

  // ── Soccer match ──
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Kick off'));
    btn?.click();
  });
  await wait(3500);
  const soccerMatch = path.join(outMain, '06-soccer-match.png');
  await page.screenshot({ path: soccerMatch });
  fs.copyFileSync(soccerMatch, path.join(outSoccer, '01-match.png'));
  fs.copyFileSync(soccerMatch, path.join(outMain, '05-soccer-match.png'));

  await browser.close();
  console.log('Screenshots saved to docs/screenshots/ (1920x1080 Edge)');
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
