import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(directory);
const windowsPython = path.join(root, 'backend', '.venv', 'Scripts', 'python.exe');
const unixPython = path.join(root, 'backend', '.venv', 'bin', 'python');
const python = process.env.WEBTOON_E2E_PYTHON || (existsSync(windowsPython) ? windowsPython : existsSync(unixPython) ? unixPython : 'python');

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.WEBTOON_E2E_BROWSER ? { executablePath: process.env.WEBTOON_E2E_BROWSER } : {},
  },
  webServer: [
    {
      command: `"${python}" "${path.join(directory, 'serve_backend.py')}"`,
      cwd: path.join(root, 'backend'),
      url: 'http://127.0.0.1:58180/__e2e__/fixtures',
      timeout: 60_000,
      reuseExistingServer: false,
      env: { APP_ENV: 'test', DATABASE_URL: 'sqlite+aiosqlite:///:memory:', ALLOWED_ORIGINS: '["http://127.0.0.1:58173","http://127.0.0.1:58174"]' },
    },
    { command: 'node serve_vite.mjs frontend 58173', cwd: directory, url: 'http://127.0.0.1:58173', timeout: 60_000, reuseExistingServer: false },
    { command: 'node serve_vite.mjs admin 58174', cwd: directory, url: 'http://127.0.0.1:58174', timeout: 60_000, reuseExistingServer: false },
  ],
});
