/**
 * Record mascot login showcase via Microsoft Edge at 1920×1080.
 * Uses obviously fake credentials (safe to show on video).
 *
 * Prereqs: backend (:5000) + my-app (:3000) running.
 * Run: node tools/record-mascot-showcase.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const videoDir = path.join(root, 'docs', 'videos', '.tmp');
const outFile = path.join(root, 'docs', 'videos', 'mascot-login-showcase.webm');

const VIEWPORT = { width: 1920, height: 1080 };

/** Obviously fake — not real account data. */
const FAKE = {
  username: 'BlorpMcFake',
  email: 'blorp.mcfake@totally-not-real.invalid',
  securityAnswer: 'purple potato wizard',
  wrongPassword: 'NopeNopeWrong999',
  goodPassword: 'ShowcaseWin888!',
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureDemoAccount() {
  try {
    const res = await fetch('http://localhost:5000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: FAKE.username,
        email: FAKE.email,
        password: FAKE.goodPassword,
        securityAnswer: FAKE.securityAnswer,
      }),
    });
    if (res.ok) console.log('Created showcase demo account.');
    else console.log('Showcase account may already exist — continuing.');
  } catch {
    console.warn('Could not reach backend at :5000 — wrong-password step may still work; success login needs API.');
  }
}

async function typeSlow(page, selector, text, delay = 95) {
  await page.click(selector);
  await page.fill(selector, '');
  for (const char of text) {
    await page.keyboard.type(char, { delay });
  }
}

async function moveMouseOverStage(page) {
  const stage = page.locator('.auth-characters-stage');
  if (!(await stage.count())) return;
  const box = await stage.boundingBox();
  if (!box) return;
  const steps = [
    [box.x + box.width * 0.35, box.y + box.height * 0.55],
    [box.x + box.width * 0.55, box.y + box.height * 0.45],
    [box.x + box.width * 0.45, box.y + box.height * 0.62],
  ];
  for (const [x, y] of steps) {
    await page.mouse.move(x, y, { steps: 18 });
    await wait(450);
  }
}

async function record() {
  fs.mkdirSync(videoDir, { recursive: true });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });

  await ensureDemoAccount();

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: videoDir,
      size: VIEWPORT,
    },
  });

  const page = await context.newPage();

  console.log('Recording… (Edge 1920×1080)');

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await wait(1200);
  await moveMouseOverStage(page);
  await wait(800);

  const emailSel = 'input[name="email"]';
  const passSel = 'input[name="password"]';

  await page.click(emailSel);
  await wait(400);
  await typeSlow(page, emailSel, FAKE.email, 110);
  await wait(1800);

  await page.click(passSel);
  await wait(350);
  await typeSlow(page, passSel, FAKE.wrongPassword, 105);
  await wait(1400);

  await page.click('button[type="submit"]');
  await wait(4800);

  await page.click(passSel, { clickCount: 3 });
  await page.keyboard.press('Backspace');
  await wait(500);
  await typeSlow(page, passSel, FAKE.goodPassword, 100);
  await wait(1200);

  await page.click('button[type="submit"]');
  await wait(2800);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (video) {
    const rawPath = await video.path();
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    fs.renameSync(rawPath, outFile);
    console.log(`Saved: ${outFile}`);
  }

  try {
    fs.rmdirSync(videoDir, { recursive: true });
  } catch {
    /* ignore */
  }
}

record().catch((err) => {
  console.error(err);
  process.exit(1);
});
