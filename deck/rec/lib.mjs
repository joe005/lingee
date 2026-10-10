import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const { chromium } = require('/Users/liangpingxian/PD-Transfer/lingee-build/node_modules/.bun/playwright@1.59.1/node_modules/playwright');
export const URL0 = 'http://127.0.0.1:8765/index.html';
export async function login(page, name) {
  await page.goto(URL0); await page.waitForTimeout(800);
  await page.fill('#loginUser', name); await page.fill('#loginPass', 'lingee520');
  await page.click('#loginBtn'); await page.waitForTimeout(1200);
}
export async function dump(page, sel='a,button,[role=tab],.nav-item,.sub-item,.flat-item') {
  return page.evaluate(sel => [...document.querySelectorAll(sel)].filter(e=>e.offsetParent).map(e=>e.tagName+'#'+e.id+'.'+String(e.className).slice(0,50)+' | '+e.textContent.trim().replace(/\s+/g,' ').slice(0,30)).join('\n'), sel);
}
