// Run against `hugo server --port 8788` after installing Playwright in .vb_mobile.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(require.resolve('playwright', {
  paths: [process.cwd(), path.resolve('.vb_mobile')],
}));

const baseURL = process.env.MOBILE_BASE_URL || 'http://localhost:8788';
const failures = [];
function check(condition, message) {
  try { assert.ok(condition, message); } catch (error) { failures.push(message); }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [width, height] of [[320, 740], [375, 812], [390, 844], [430, 932], [768, 1024], [844, 390], [1024, 768], [1440, 900]]) {
      const mobile = width <= 1024;
      const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      // Use deterministic contribution data to exercise the populated heatmap layout.
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === new URL(baseURL).origin) return route.continue();
        if (url.hostname === 'github-contributions-api.jogruber.de') {
          const year = Number(url.searchParams.get('y'));
          const contributions = [];
          for (let date = new Date(Date.UTC(year, 0, 1)); date.getUTCFullYear() === year; date.setUTCDate(date.getUTCDate() + 1)) {
            contributions.push({ date: date.toISOString().slice(0, 10), count: 2, level: 1 });
          }
          return route.fulfill({ json: { contributions } });
        }
        return route.abort();
      });
      for (const route of ['/', '/projects/', '/projects/embodied-ai-robot-arm/']) {
        await page.goto(baseURL + route);
        await page.waitForFunction(() => !document.getElementById('page-loader'));
        if (route === '/') await page.waitForFunction(() => document.querySelector('.hero-en').textContent.trim() === 'Shan Hai');
        const layout = await page.evaluate(() => {
          const rect = selector => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
          return { viewport: innerWidth, scroll: document.documentElement.scrollWidth, hero: rect('.hero-content'), nav: rect('.page-nav-main'), touchTargets: [...document.querySelectorAll('.theme-toggle, .header-socials a, .gallery-arrow, .music-btn, .music-play, .hm-year-btn, #music-progress')].map(e => { const r = e.getBoundingClientRect(); return {width:r.width, height:r.height}; }) };
        });
        const label = `${width}x${height} ${route}`;
        check(layout.viewport === width && layout.scroll <= width + 1, `${label}: viewport expands or page overflows (${layout.viewport}/${layout.scroll})`);
        if (layout.hero) check(layout.hero.x >= 0 && layout.hero.x + layout.hero.width <= width + 1, `${label}: profile extends outside viewport`);
        if (mobile) {
          check(layout.touchTargets.every(r => r.width >= 44 && r.height >= 44), `${label}: touch controls must be at least 44px`);
          check(layout.nav.width >= 44 && layout.nav.height >= 44, `${label}: navigation toggle must be at least 44px`);
          check(await page.locator('h1').first().evaluate(e => {
            const title = e.getBoundingClientRect();
            const header = document.querySelector('.site-header').getBoundingClientRect();
            return title.top >= header.bottom || title.bottom <= header.top || title.right <= header.left || title.left >= header.right;
          }), `${label}: title must clear fixed header controls`);
        }
        const toggle = page.locator('.page-nav-main');
        const menu = page.locator('.page-nav-menu');
        check(await toggle.getAttribute('aria-expanded') === 'false' && !(await menu.isVisible()), `${label}: navigation must start closed`);
        await toggle.click();
        check(await toggle.getAttribute('aria-expanded') === 'true' && await menu.isVisible(), `${label}: navigation must open on click`);
        const menuRect = await menu.boundingBox();
        check(menuRect.y >= 0 && menuRect.y + menuRect.height <= height, `${label}: open navigation must fit viewport height`);
        await toggle.click();
        check(await toggle.getAttribute('aria-expanded') === 'false' && !(await menu.isVisible()), `${label}: navigation must close on second click`);
        await toggle.focus();
        await page.keyboard.press('Enter');
        check(await menu.isVisible(), `${label}: keyboard must open navigation`);
        await page.keyboard.press('Tab');
        check(await menu.locator('a').first().evaluate(e => document.activeElement === e), `${label}: open links must be keyboard reachable`);
        await page.keyboard.press('Escape');
        check(!(await menu.isVisible()) && await toggle.evaluate(e => document.activeElement === e), `${label}: Escape must close navigation and restore focus`);
        await page.keyboard.press('Enter');
        await page.keyboard.press('Shift+Tab');
        check(!(await menu.isVisible()), `${label}: moving keyboard focus outside navigation must close it`);
        await toggle.click();
        await page.locator('h1').first().click();
        check(!(await menu.isVisible()), `${label}: outside click must close navigation`);
        if (route === '/') {
          check(await page.locator('.hm-grid').isVisible(), `${label}: populated contribution heatmap must render`);
          const counter = page.locator('.gallery-counter span');
          const before = await counter.textContent();
          await page.locator('.gallery-arrow').last().click();
          check(await counter.textContent() !== before, `${label}: gallery must respond to click`);
          await page.locator('.gallery-arrow').first().click();
          const song = await page.locator('#music-title').textContent();
          await page.locator('#music-next').click();
          check(await page.locator('#music-title').textContent() !== song, `${label}: next song must respond to click`);
          await page.locator('#music-prev').click();
          if (width <= 900) {
            check(await page.locator('.site-footer').evaluate(e => e.getBoundingClientRect().top >= document.querySelector('main').getBoundingClientRect().bottom), `${label}: footer must follow content`);
          }
        }
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: `.vb_mobile/after-${width}-${route === '/' ? 'home' : route === '/projects/' ? 'projects' : 'detail'}.png`, fullPage: true });
        const theme = await page.locator('html').getAttribute('data-theme');
        await page.locator('#theme-toggle').click();
        await page.waitForTimeout(350); // Allow the theme's color transition to finish before capturing it.
        check(await page.locator('html').getAttribute('data-theme') !== theme, `${label}: theme switch must respond to click`);
        check(await page.evaluate(() => innerWidth === document.documentElement.clientWidth && document.documentElement.scrollWidth <= innerWidth + 1), `${label}: alternate theme must fit viewport`);
        if (width === 390) await page.screenshot({ path: `.vb_mobile/light-390-${route === '/' ? 'home' : route === '/projects/' ? 'projects' : 'detail'}.png`, fullPage: true });
        await page.locator('#theme-toggle').click();
        await toggle.click();
        await menu.locator('a').last().scrollIntoViewIfNeeded();
        const lastLink = await menu.locator('a').last().boundingBox();
        check(lastLink.y >= 0 && lastLink.y + lastLink.height <= height, `${label}: last navigation link must be reachable`);
        await menu.locator('a').filter({ hasText: '项目' }).click();
        await page.waitForURL(baseURL + '/projects/');
        check(await page.locator('.page-nav-main').getAttribute('aria-expanded') === 'false', `${label}: following navigation must leave menu closed`);
        console.log(`Checked ${label}`);
      }
      await context.close();
    }
  } finally { await browser.close(); }
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else { console.log('PASS: mobile layout and navigation checks'); }
})().catch(error => { console.error(error); process.exitCode = 1; });
