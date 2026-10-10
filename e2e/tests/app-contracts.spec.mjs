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

test('studio creates a priceless card and weighted pool, then the reader reveals the server winner once', async ({ page, request }, testInfo) => {
  const data = await fixtures(request);
  await signIn(page, request, data, 'studio', data.admin_email);
  await page.goto(studio + '/shop');
  await page.getByRole('button', { name: 'New character card', exact: true }).click();
  const editor = page.getByRole('dialog');
  await editor.locator('#ShopItemModal-field-1').fill('Browser gacha hero');
  await editor.locator('#card-character').fill('Synthetic hero');
  await editor.locator('#card-rarity').selectOption('legendary');
  await expect(editor.locator('#ShopItemModal-field-3')).toHaveCount(0);
  const artwork = await (await request.get(api + '/content/covers/fixture.webp')).body();
  await editor.locator('input[type="file"]').setInputFiles({ name: 'hero.webp', mimeType: 'image/webp', buffer: artwork });
  const created = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/staff/shop/items'));
  await editor.locator('button[type="submit"]').click();
  const cardResponse = await created;
  expect(cardResponse.status()).toBe(201);
  expect(cardResponse.request().postData()).not.toContain('name="price_coins"');
  const card = (await cardResponse.json()).data;
  expect(card.price_coins).toBe(0);
  await expect(editor).toBeHidden();

  await page.goto(studio + '/wheels');
  await page.getByRole('button', { name: 'Character Card Gacha', exact: true }).click();
  await page.getByRole('button', { name: 'New card pool', exact: true }).click();
  const poolEditor = page.getByRole('dialog');
  await poolEditor.locator('#gacha-title').fill('Browser hero pool');
  await poolEditor.locator('#gacha-description').fill('A synthetic pool for the real browser/API contract.');
  await poolEditor.locator('#gacha-cost').fill('50');
  for (const rarity of ['common', 'rare', 'epic']) await poolEditor.locator('#gacha-weight-' + rarity).fill('0');
  await poolEditor.locator('#gacha-weight-legendary').fill('1');
  await poolEditor.locator('#gacha-card-' + card.id).check();
  await poolEditor.locator('#gacha-active').check();
  const poolCreated = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/staff/gacha/pools'));
  await poolEditor.locator('button[type="submit"]').click();
  const poolResponse = await poolCreated;
  expect(poolResponse.status()).toBe(201);
  const pool = (await poolResponse.json()).data;
  expect(pool.rarity_rates.find(tier => tier.rarity === 'legendary').probability_percent).toBe(100);
  expect(pool.cards[0].probability_percent).toBe(100);
  await expect(poolEditor).toBeHidden();

  const auth = await signIn(page, request, data, 'reader', data.gacha_reader_email);
  await page.goto(reader + '/wheel?category=gacha');
  await expect(page.getByRole('tab', { name: /Character Card Gacha/ })).toHaveAttribute('aria-selected', 'true');
  const rolled = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/gacha/pools/' + pool.id + '/roll'));
  await page.getByRole('button', { name: 'Roll for 50 ⚡', exact: true }).click();
  const rollResponse = await rolled;
  expect(rollResponse.status()).toBe(200);
  const receipt = (await rollResponse.json()).data;
  expect(receipt.winning_card.id).toBe(card.id);
  expect(receipt.animation_cards[receipt.winning_index].id).toBe(receipt.winning_card.id);
  expect(receipt.new_balance).toBe(950);
  expect(receipt.is_duplicate).toBe(false);
  const revealed = page.getByRole('dialog');
  await expect(revealed.getByText('Card revealed!', { exact: true })).toBeVisible();
  await expect(revealed.getByText('Browser gacha hero was added to your collection.', { exact: true })).toBeVisible();
  await revealed.getByRole('button', { name: 'Back to Gacha', exact: true }).click();
  const viewport = page.getByRole('img', { name: 'Card roulette preview', exact: true });
  const viewportBounds = await viewport.boundingBox();
  const winnerBounds = await viewport.locator(':scope > div > div').nth(receipt.winning_index).boundingBox();
  expect(Math.abs(winnerBounds.x + winnerBounds.width / 2 - (viewportBounds.x + viewportBounds.width / 2))).toBeLessThan(2);
  await page.setViewportSize({ width: 360, height: 740 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await viewport.scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const view = await viewport.boundingBox();
    const won = await viewport.locator(':scope > div > div').nth(receipt.winning_index).boundingBox();
    return Math.abs(won.x + won.width / 2 - (view.x + view.width / 2));
  }).toBeLessThan(2);
  await testInfo.attach('gacha-revealed-mobile', { body: await page.screenshot(), contentType: 'image/png' });

  const replay = await request.post(api + '/api/v1/gacha/pools/' + pool.id + '/roll', { headers: auth, data: rollResponse.request().postDataJSON() });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).data).toEqual(receipt);
  const inventory = (await (await request.get(api + '/api/v1/shop/inventory?item_type=card', { headers: auth })).json()).data;
  expect(inventory.filter(entry => entry.id === card.id)).toHaveLength(1);
  const purchase = await request.post(api + '/api/v1/shop/buy/' + card.id, { headers: auth, data: { expected_price: 0 } });
  expect(purchase.status()).toBe(422);
  expect((await purchase.json()).error.message).toMatch(/gacha/i);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const duplicate = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/gacha/pools/' + pool.id + '/roll'));
  await page.getByRole('button', { name: 'Roll for 50 ⚡', exact: true }).click();
  const duplicateReceipt = (await (await duplicate).json()).data;
  expect(duplicateReceipt.is_duplicate).toBe(true);
  expect(duplicateReceipt.refund_coins).toBe(50);
  expect(duplicateReceipt.new_balance).toBe(950);
  await expect(page.getByRole('dialog').getByText('You already own Browser gacha hero. Your roll cost of 50 ⚡ was refunded.', { exact: true })).toBeVisible();
  const history = (await (await request.get(api + '/api/v1/gacha/history', { headers: auth })).json()).data;
  expect(history.filter(entry => entry.pool_id === pool.id)).toHaveLength(2);
});

test('animated shop background covers complete self and public profiles, including reduced motion', async ({ page, request }, testInfo) => {
  const data = await fixtures(request);
  const adminPage = await page.context().newPage();
  await signIn(adminPage, request, data, 'studio', data.admin_email);
  await adminPage.goto(studio + '/shop');
  await adminPage.getByRole('button', { name: '+ Add New Item', exact: true }).click();
  const editor = adminPage.getByRole('dialog');
  await editor.locator('#ShopItemModal-field-1').fill('Browser animated landscape');
  await editor.locator('#ShopItemModal-field-2').selectOption('background');
  await editor.locator('#ShopItemModal-field-3').fill('25');
  await expect(editor.locator('input[type="file"]')).toHaveAttribute('accept', /\.gif/);
  const artwork = await (await request.get(api + '/content/backgrounds/fixture-source.gif')).body();
  await editor.locator('input[type="file"]').setInputFiles({ name: 'landscape.gif', mimeType: 'image/gif', buffer: artwork });
  const created = adminPage.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/staff/shop/items'));
  await editor.locator('button[type="submit"]').click();
  const response = await created;
  expect(response.status()).toBe(201);
  const background = (await response.json()).data;
  expect(background.asset_animated).toBe(true);
  expect(background.asset_url).toMatch(/\.webp$/);
  expect(background.asset_preview_url).toBeTruthy();
  expect(background.asset_preview_url).not.toBe(background.asset_url);
  await expect(editor).toBeHidden();
  const savedArtwork = await (await request.get(api + background.asset_url)).body();
  expect(savedArtwork.subarray(0, 4).toString()).toBe('RIFF');
  expect(savedArtwork.includes(Buffer.from('ANIM'))).toBe(true);
  await adminPage.close();

  const auth = await signIn(page, request, data, 'reader', data.reader_email);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(reader + '/shop');
  const offer = page.getByRole('heading', { name: 'Browser animated landscape', exact: true }).locator('..');
  const purchased = page.waitForResponse(res => res.request().method() === 'POST' && res.url().endsWith('/shop/buy/' + background.id));
  await offer.getByRole('button', { name: 'Purchase', exact: true }).click();
  expect((await purchased).status()).toBe(200);
  const equipped = page.waitForResponse(res => res.request().method() === 'POST' && res.url().endsWith('/shop/equip/' + background.id));
  await offer.getByRole('button', { name: 'Equip', exact: true }).click();
  expect((await equipped).status()).toBe(200);
  const profile = (await (await request.get(api + '/api/v1/auth/me', { headers: auth })).json()).data;
  expect(profile.active_background.asset_animated).toBe(true);
  expect(profile.active_background.asset_preview_url).toBe(background.asset_preview_url);
  await page.goto(reader + '/profile');
  const wallpaper = page.locator('[data-profile-wallpaper]');
  const viewport = page.locator('[data-profile-background]');
  const image = viewport.locator('img');
  await expect(image).toHaveAttribute('src', background.asset_url);
  await expect(page.getByRole('button', { name: 'Pause background', exact: true })).toBeVisible();
  await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  const wallpaperBounds = await wallpaper.boundingBox();
  expect(wallpaperBounds.height).toBeGreaterThan(900);
  await page.getByRole('button', { name: 'Pause background', exact: true }).click();
  await expect(image).toHaveAttribute('src', background.asset_preview_url);
  await page.getByRole('button', { name: 'Play background', exact: true }).click();
  await expect(image).toHaveAttribute('src', background.asset_url);
  await page.locator('#inventory').scrollIntoViewIfNeeded();
  const scrolledBounds = await viewport.boundingBox();
  expect(scrolledBounds.y).toBeLessThanOrEqual(1);
  expect(scrolledBounds.y + scrolledBounds.height).toBeGreaterThanOrEqual(899);
  await testInfo.attach('full-profile-background-desktop', { body: await page.screenshot(), contentType: 'image/png' });

  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(image).toHaveAttribute('src', background.asset_preview_url);
  await expect(page.getByRole('button', { name: 'Play background', exact: true })).toBeVisible();
  await page.locator('#inventory').scrollIntoViewIfNeeded();
  const mobileBounds = await viewport.boundingBox();
  expect(mobileBounds.y).toBeLessThanOrEqual(1);
  expect(mobileBounds.y + mobileBounds.height).toBeGreaterThanOrEqual(739);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await testInfo.attach('full-profile-background-mobile', { body: await page.screenshot(), contentType: 'image/png' });
  await page.goto(reader + '/users/' + profile.username);
  await expect(page.locator('[data-profile-background] img')).toHaveAttribute('src', background.asset_preview_url);
  const publicWallpaper = await page.locator('[data-profile-wallpaper]').boundingBox();
  expect(publicWallpaper.height).toBeGreaterThan(740);
  const publicProfile = (await (await request.get(api + '/api/v1/users/' + profile.username + '/public-profile')).json()).data;
  expect(publicProfile.active_background.asset_animated).toBe(true);
  expect(publicProfile.active_background.asset_preview_url).toBe(background.asset_preview_url);
});

test('clan leaders buy and equip clan-owned cosmetics and the wallpaper covers the entire clan', async ({ page, request }, testInfo) => {
  const data = await fixtures(request);
  const staffLogin = await request.post(api + '/api/v1/staff/auth/login', { data: { email: data.admin_email, password: data.password } });
  expect(staffLogin.ok()).toBe(true);
  const staffToken = (await staffLogin.json()).data.access_token;
  const gif = await (await request.get(api + '/content/backgrounds/fixture-source.gif')).body();
  const artworkResponse = await request.post(api + '/api/v1/staff/shop/items', {
    headers: { Authorization: 'Bearer ' + staffToken },
    multipart: { name: 'Clan animated landscape', item_type: 'background', price_coins: '60',
      asset_file: { name: 'clan-landscape.gif', mimeType: 'image/gif', buffer: gif } },
  });
  expect(artworkResponse.status()).toBe(201);
  const background = (await artworkResponse.json()).data;
  const auth = await signIn(page, request, data, 'reader', data.clan_reader_email);
  const settings = (await (await request.get(api + '/api/v1/clans/settings', { headers: auth })).json()).data;
  const created = await request.post(api + '/api/v1/clans', { headers: auth,
    data: { name: 'Browser clan', tag: 'BCLAN', expected_cost: settings.clan_creation_cost } });
  expect(created.status()).toBe(201);
  const clan = (await created.json()).data;
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(reader + '/clans/' + clan.id);
  await page.getByRole('button', { name: 'Clan settings and appearance', exact: true }).click();
  const clanSettings = page.getByRole('dialog', { name: 'Clan settings and appearance', exact: true });
  await expect(clanSettings.locator('input[type="file"]')).toHaveCount(1);
  await expect(clanSettings.getByRole('button', { name: 'Open Clan Shop', exact: true })).toBeVisible();
  const logo = await (await request.get(api + '/content/avatars/fixture.webp')).body();
  const logoUploaded = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/clans/${clan.id}/upload-avatar`));
  await clanSettings.locator('input[type="file"]').setInputFiles({ name: 'clan-logo.webp', mimeType: 'image/webp', buffer: logo });
  const logoResponse = await logoUploaded;
  expect(logoResponse.status()).toBe(200);
  await expect(page.locator('[data-clan-avatar] img[alt="Browser clan"]')).toHaveAttribute('src', (await logoResponse.json()).data.avatar_url);
  await clanSettings.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Clan Shop', exact: true }).click();
  const catalog = (await (await request.get(api + `/api/v1/clans/${clan.id}/shop`, { headers: auth })).json()).data;
  const frame = catalog.find(item => item.id === data.shop_item_id);
  expect(frame).toBeTruthy();
  await page.locator(`[data-clan-shop-item="${frame.id}"]`).getByRole('button', { name: 'Purchase', exact: true }).click();
  const frameBought = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/clans/${clan.id}/shop/buy/${frame.id}`));
  await page.getByRole('dialog').getByRole('button', { name: `Buy for ${frame.price_coins} ⚡`, exact: true }).click();
  expect((await frameBought).status()).toBe(200);
  const frameEquipped = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/clans/${clan.id}/shop/equip/${frame.id}`));
  await page.locator(`[data-clan-inventory-item="${frame.id}"]`).getByRole('button', { name: 'Equip', exact: true }).click();
  expect((await frameEquipped).status()).toBe(200);
  await expect(page.locator('[data-clan-avatar] img[alt="Avatar Frame"]')).toHaveAttribute('src', frame.asset_url);
  const offer = page.locator(`[data-clan-shop-item="${background.id}"]`);
  await offer.getByRole('button', { name: 'Purchase', exact: true }).click();
  const confirm = page.getByRole('dialog');
  await expect(confirm).toContainText('clan');
  const bought = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/clans/${clan.id}/shop/buy/${background.id}`));
  await confirm.getByRole('button', { name: 'Buy for 60 ⚡', exact: true }).click();
  const purchaseResponse = await bought;
  expect(purchaseResponse.status()).toBe(200);
  expect(purchaseResponse.request().postDataJSON()).toEqual({ expected_price: 60 });
  expect((await purchaseResponse.json()).data.new_balance).toBe(clan.remaining_coins - frame.price_coins - 60);
  const personal = (await (await request.get(api + '/api/v1/shop/inventory', { headers: auth })).json()).data;
  expect(personal).toHaveLength(0);
  const inventory = (await (await request.get(api + `/api/v1/clans/${clan.id}/inventory`, { headers: auth })).json()).data;
  expect(inventory.map(item => item.id)).toContain(background.id);
  const owned = page.locator(`[data-clan-inventory-item="${background.id}"]`);
  const equipped = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/clans/${clan.id}/shop/equip/${background.id}`));
  await owned.getByRole('button', { name: 'Equip', exact: true }).click();
  expect((await equipped).status()).toBe(200);
  const wallpaper = page.locator('[data-profile-background]');
  const expectClanWallpaperCoverage = async () => {
    const viewportHeight = page.viewportSize().height;
    const clanBounds = await page.locator('[data-profile-wallpaper]').boundingBox();
    const bounds = await wallpaper.boundingBox();
    const visibleTop = Math.max(0, clanBounds.y);
    const visibleBottom = Math.min(viewportHeight, clanBounds.y + clanBounds.height);
    expect(clanBounds.height).toBeGreaterThan(viewportHeight);
    expect(visibleBottom).toBeGreaterThan(visibleTop);
    expect(bounds.height).toBeGreaterThanOrEqual(viewportHeight - 1);
    expect(bounds.y).toBeLessThanOrEqual(visibleTop + 1);
    // Sticky artwork ends at the clan boundary, before the shared site footer.
    expect(bounds.y + bounds.height).toBeGreaterThanOrEqual(visibleBottom - 1);
  };
  await expect(wallpaper.locator('img')).toHaveAttribute('src', background.asset_url);
  await expect(page.getByRole('button', { name: 'Pause background', exact: true })).toBeVisible();
  await expect.poll(() => wallpaper.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await offer.scrollIntoViewIfNeeded();
  await expectClanWallpaperCoverage();
  await testInfo.attach('clan-full-background-desktop', { body: await page.screenshot(), contentType: 'image/png' });

  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(wallpaper.locator('img')).toHaveAttribute('src', background.asset_preview_url);
  await expect(page.getByRole('button', { name: 'Play background', exact: true })).toBeVisible();
  await expect.poll(() => wallpaper.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const detail = (await (await request.get(api + '/api/v1/clans/' + clan.id)).json()).data;
  expect(detail.active_background.asset_animated).toBe(true);
  expect(detail.active_background.asset_preview_url).toBe(background.asset_preview_url);
  expect(detail.banner_url).toBe(background.asset_url);
  expect(detail.frame_url).toBe(frame.asset_url);
  await page.getByRole('button', { name: 'Clan Shop', exact: true }).click();
  await offer.scrollIntoViewIfNeeded();
  await expectClanWallpaperCoverage();
  await testInfo.attach('clan-full-background-mobile', { body: await page.screenshot(), contentType: 'image/png' });
  const unequipped = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/clans/${clan.id}/shop/unequip/${background.id}`));
  await owned.getByRole('button', { name: 'Unequip', exact: true }).click();
  expect((await unequipped).status()).toBe(200);
  await expect(page.locator('[data-profile-wallpaper]')).toHaveCount(0);
  const after = (await (await request.get(api + '/api/v1/clans/' + clan.id)).json()).data;
  expect(after.active_background).toBeNull();
});
