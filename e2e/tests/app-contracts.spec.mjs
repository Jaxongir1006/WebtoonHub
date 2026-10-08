import { test, expect } from '@playwright/test';

const api = 'http://127.0.0.1:58180';
const reader = 'http://127.0.0.1:58173';
const studio = 'http://127.0.0.1:58174';

test.beforeEach(async ({ context }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol)
      ? route.continue() : route.abort();
  });
});

async function fixtures(request) {
  return (await request.get(api + '/__e2e__/fixtures')).json();
}

async function signIn(page, request, data, kind, email) {
  const response = await request.post(api + (kind === 'studio' ? '/api/v1/staff/auth/login' : '/api/v1/auth/login'), {
    data: { email, password: data.password },
  });
  expect(response.ok()).toBeTruthy();
  const session = (await response.json()).data;
  await page.addInitScript(({ kind, session }) => {
    localStorage.setItem('webtoonhub_lang', 'en');
    if (kind === 'studio') {
      localStorage.setItem('webtoonhub_staff_token', session.access_token);
      localStorage.setItem('webtoonhub_staff_refresh_token', session.refresh_token);
      localStorage.setItem('webtoonhub_current_staff', JSON.stringify(session.staff));
    } else {
      localStorage.setItem('webtoonhub_access_token', session.access_token);
      localStorage.setItem('webtoonhub_refresh_token', session.refresh_token);
    }
  }, { kind, session });
  return { Authorization: 'Bearer ' + session.access_token };
}

test('studio edits a cosmetic with strict supported JSON and verifies persistence', async ({ page, request }) => {
  const data = await fixtures(request);
  const auth = await signIn(page, request, data, 'studio', data.admin_email);
  await page.goto(studio + '/shop');
  await expect(page.getByRole('heading', { name: 'Fixture frame', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /edit/i }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#ShopItemModal-field-1').fill('Browser edited frame');
  await dialog.locator('#ShopItemModal-field-3').fill('125');
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith('/shop/items/' + data.shop_item_id));
  await dialog.locator('button[type="submit"]').click();
  const response = await saved;
  expect(response.status()).toBe(200);
  const payload = response.request().postDataJSON();
  expect(payload.price_coins).toBe(125);
  const allowed = ['asset_url', 'character_name', 'is_available', 'name', 'price_coins', 'rarity', 'series_title', 'webtoon_id'];
  expect(Object.keys(payload).every(key => allowed.includes(key))).toBe(true);
  expect(payload).not.toHaveProperty('item_type');
  expect(payload).not.toHaveProperty('id');
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Browser edited frame', exact: true })).toBeVisible();
  const persisted = (await (await request.get(api + '/api/v1/staff/shop/items', { headers: auth })).json()).data;
  expect(persisted.find(item => item.id === data.shop_item_id).price_coins).toBe(125);
});

test('studio chapter edits roll back invalid pages and submit one reviewed atomic revision', async ({ page, request }) => {
  const data = await fixtures(request);
  const creatorAuth = await signIn(page, request, data, 'studio', data.creator_email);
  await page.goto(studio + '/webtoons/' + data.comic_work_id);
  const chapterHeading = page.getByRole('heading', { name: /^Fixture comic chapter/ });
  await expect(chapterHeading).toBeVisible();
  await chapterHeading.locator('..').locator('..').locator('..').getByRole('button', { name: /edit/i }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#ChapterEditModal-field-4').fill('Browser revised comic');
  await dialog.locator('#ChapterEditModal-field-3').fill('15');
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('invalid image bytes') });
  const failed = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/chapters/' + data.comic_chapter_id + '/images'));
  await dialog.locator('button[type="submit"]').click();
  expect((await failed).status()).toBe(422);
  await expect(dialog.getByRole('alert')).toBeVisible();
  const unchanged = (await (await request.get(api + '/api/v1/staff/chapters/' + data.comic_chapter_id, { headers: creatorAuth })).json()).data;
  expect(unchanged.title).toBe('Fixture comic chapter');
  expect(unchanged.reward_coins).toBe(5);
  expect(unchanged.images).toHaveLength(1);
  await dialog.locator('img').last().locator('..').hover();
  await dialog.getByRole('button', { name: /delete|remove/i }).last().click();
  const artwork = await (await request.get(api + '/content/covers/fixture.webp')).body();
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'page.webp', mimeType: 'image/webp', buffer: artwork });
  const saved = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/chapters/' + data.comic_chapter_id + '/images'));
  await dialog.locator('button[type="submit"]').click();
  const response = await saved;
  expect(response.status()).toBe(200);
  const result = (await response.json()).data;
  expect(result.chapter.title).toBe('Browser revised comic');
  expect(result.chapter.reward_coins).toBe(15);
  expect(result.chapter.status).toBe('pending');
  expect(result.status_changed_to_pending).toBe(true);
  expect(result.added_images).toHaveLength(1);
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: /^Browser revised comic/ })).toBeVisible();
  const anonymous = await request.get(api + '/api/v1/chapters/' + data.comic_chapter_id);
  expect(anonymous.status()).toBe(403);
});

test('reader saves profile independently of a failed password action, then signs in again', async ({ page, request }) => {
  const data = await fixtures(request);
  const auth = await signIn(page, request, data, 'reader', data.profile_reader_email);
  await page.goto(reader + '/profile');
  await expect(page.locator('#profilepage-field-1')).toBeVisible();
  await page.locator('#profilepage-field-1').fill('browser_profile_reader');
  await page.locator('#profilepage-field-2').fill('A profile saved through the real API.');
  await page.locator('#profilepage-field-3').fill('wrong password');
  await page.locator('#profilepage-field-4').fill('new-browser-password');
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith('/users/profile'));
  await page.locator('form').filter({ has: page.locator('#profilepage-field-1') }).locator('button[type="submit"]').click();
  const response = await saved;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({ username: 'browser_profile_reader', bio: 'A profile saved through the real API.' });
  const passwordForm = page.locator('form').filter({ has: page.locator('#profilepage-field-3') });
  const rejected = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith('/auth/profile'));
  await passwordForm.locator('button[type="submit"]').click();
  expect((await rejected).status()).toBe(400);
  const profile = (await (await request.get(api + '/api/v1/auth/me', { headers: auth })).json()).data;
  expect(profile.username).toBe('browser_profile_reader');
  expect(profile.bio).toBe('A profile saved through the real API.');
  await page.locator('#profilepage-field-3').fill(data.password);
  const changed = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith('/auth/profile'));
  await passwordForm.locator('button[type="submit"]').click();
  expect((await changed).status()).toBe(200);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('webtoonhub_access_token'))).toBeNull();
  const login = await request.post(api + '/api/v1/auth/login', { data: { email: data.profile_reader_email, password: 'new-browser-password' } });
  expect(login.status()).toBe(200);
});

test('illustrated novel saves later text pages and keeps mobile settings visible', async ({ page, request }, testInfo) => {
  const data = await fixtures(request);
  const auth = await signIn(page, request, data, 'reader', data.reader_email);
  await page.goto(reader + '/chapters/' + data.novel_chapter_id);
  await expect(page.getByText('Fixture illustrated novel', { exact: true })).toBeVisible();
  const next = page.getByRole('button', { name: /next page/i });
  const saved = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith('/users/reading-progress/' + data.novel_work_id)
    && response.request().postDataJSON().page_index >= 1);
  await next.click();
  expect((await saved).status()).toBe(200);
  const position = (await (await request.get(api + '/api/v1/users/reading-progress/' + data.novel_work_id, { headers: auth })).json()).data;
  expect(position.page_index).toBeGreaterThanOrEqual(1);
  expect(position.anchor).toMatch(/^word:\d+$/);
  for (let turns = 0; turns < 20 && await next.isEnabled(); turns++) {
    await next.click();
    await expect(page.locator('.novel-page-preview')).toHaveCount(0);
  }
  await expect(next).toBeDisabled();
  const illustrations = page.getByRole('region', { name: /illustrations/i });
  await illustrations.scrollIntoViewIfNeeded();
  await expect(illustrations.locator('img')).toBeVisible();
  await expect.poll(() => illustrations.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  const final = (await (await request.get(api + '/api/v1/users/reading-progress/' + data.novel_work_id, { headers: auth })).json()).data;
  expect(final.page_index).toBeGreaterThan(0);
  await page.setViewportSize({ width: 320, height: 650 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.getByRole('button', { name: /reading settings/i }).click();
  const settings = page.locator('#novel-settings');
  await expect(settings).toBeFocused();
  const bounds = await settings.boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(650);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await testInfo.attach('novel-settings-320x650', { body: await page.screenshot(), contentType: 'image/png' });
});

test('mobile tall manga turns fit-width pages back to the top', async ({ page, request }, testInfo) => {
  const data = await fixtures(request);
  await signIn(page, request, data, 'reader', data.reader_email);
  await page.setViewportSize({ width: 320, height: 360 });
  await page.goto(reader + '/chapters/' + data.manga_chapter_id);
  await expect(page.getByRole('img', { name: /^Page 1$/ })).toBeVisible();
  await page.getByRole('button', { name: /fit to width/i }).click();
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  await page.getByRole('button', { name: /^Next page$/i }).click();
  const image = page.getByRole('img', { name: /^Page 2$/ });
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const bounds = await image.boundingBox();
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeLessThan(200);
  expect(bounds.height).toBeGreaterThan(360);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await testInfo.attach('manga-page-top-320x360', { body: await page.screenshot(), contentType: 'image/png' });
});
