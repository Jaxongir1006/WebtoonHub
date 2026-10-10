import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { installBrowserGlobals, loadModuleWithMocks } from './helpers.mjs';

async function renderBackground(t, background, reducedMotion = false) {
  const { window } = installBrowserGlobals(t);
  window.matchMedia = () => ({ matches: reducedMotion });
  const { ProfileWallpaper } = await loadModuleWithMocks('src/components/common/ProfileWallpaper.tsx', {
    '../../context/LanguageContext': { useLanguage: () => ({ t: key => key }) },
  });
  return renderToString(React.createElement(ProfileWallpaper, { background }, React.createElement('p', null, 'Profile content')));
}

test('animated profile wallpaper plays by default and exposes an accessible pause action', async t => {
  const html = await renderBackground(t, { id: 1, name: 'Sky', asset_url: '/sky.gif', asset_preview_url: '/sky-poster.webp', asset_animated: true });
  assert.ok(html.includes('src="/sky.gif"'));
  assert.ok(!html.includes('src="/sky-poster.webp"'));
  assert.ok(html.includes('aria-label="socialFix.pauseBackground"'));
  assert.ok(html.includes('Profile content'));
});

test('reduced motion uses a static background poster with an explicit play action', async t => {
  const html = await renderBackground(t, { id: 1, name: 'Sky', asset_url: '/sky.gif', asset_preview_url: '/sky-poster.webp', asset_animated: true }, true);
  assert.ok(html.includes('src="/sky-poster.webp"'));
  assert.ok(!html.includes('src="/sky.gif"'));
  assert.ok(html.includes('aria-label="socialFix.playBackground"'));
});

test('missing animation posters never force motion for reduced-motion users', async t => {
  const html = await renderBackground(t, { id: 1, name: 'Sky', asset_url: '/sky.gif', asset_animated: true }, true);
  assert.ok(!html.includes('src="/sky.gif"'));
  assert.ok(html.includes('Profile content'));
});

test('static backgrounds keep the profile usable without playback controls', async t => {
  const html = await renderBackground(t, { id: 1, name: 'Sky', asset_url: '/sky.jpg' });
  assert.ok(html.includes('src="/sky.jpg"'));
  assert.ok(!html.includes('<button'));
});

test('an absent background keeps the profile usable without images or playback controls', async t => {
  const without = await renderBackground(t, null);
  assert.ok(!without.includes('<img'));
  assert.ok(!without.includes('<button'));
  assert.ok(without.includes('Profile content'));
});

test('a failed animation falls back to its poster and cannot be played again', async t => {
  const { window } = installBrowserGlobals(t);
  window.matchMedia = () => ({ matches: false });
  const states = [];
  let index = 0;
  const { ProfileWallpaper } = await loadModuleWithMocks('src/components/common/ProfileWallpaper.tsx', {
    react: {
      default: React,
      forwardRef: React.forwardRef,
      createElement: React.createElement,
      useEffect() {},
      useState(initial) {
        const slot = index++;
        if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial;
        return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }];
      },
    },
    '../../context/LanguageContext': { useLanguage: () => ({ t: key => key }) },
  });
  const background = { id: 1, name: 'Sky', asset_url: '/sky.gif', asset_preview_url: '/sky-poster.webp', asset_animated: true };
  const render = () => {
    index = 0;
    return ProfileWallpaper({ background, children: React.createElement('p', null, 'Profile content') });
  };
  const find = (tree, type) => {
    if (tree?.type === type) return tree;
    for (const child of React.Children.toArray(tree?.props?.children)) {
      const found = find(child, type);
      if (found) return found;
    }
    return null;
  };
  find(render(), 'img').props.onError();
  const recovered = render();
  assert.equal(find(recovered, 'img').props.src, '/sky-poster.webp');
  assert.equal(find(recovered, 'button').props.disabled, true);
  assert.equal(find(recovered, 'button').props['aria-label'], 'socialFix.backgroundAnimationUnavailable');
  find(recovered, 'img').props.onError();
  const bothUnavailable = render();
  assert.equal(find(bothUnavailable, 'img'), null);
  assert.ok(renderToString(bothUnavailable).includes('Profile content'));
});
