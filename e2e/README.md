# Real browser/API integration checks

These tests launch the actual FastAPI app and both Vite applications on ports
58180, 58173, and 58174. The backend uses the isolated regression fixture, a
temporary SQLite database, and generated local images. It never opens the normal
project database or seeds published/demo content. External browser requests are
blocked. Ports must be free; existing servers are never reused.

Install the backend requirements and the frontend/admin npm dependencies first.
Then run:

```sh
cd e2e
npm ci
npm run install:browser
npm test
```

The launcher uses `backend/.venv` when available, otherwise `python`. Set
`WEBTOON_E2E_PYTHON` to choose another interpreter. Tests run serially against one
disposable fixture. Playwright retains screenshots/traces on failures in ignored
test-results directories. The server is bound to localhost and exposes synthetic
fixture identifiers only while the test run is active.

`WEBTOON_E2E_BROWSER` can point to an existing compatible Chromium executable.
Successful mobile flows attach screenshots for the 320 × 650 novel settings and
320 × 360 tall manga page view to the HTML report.

Coverage includes strict studio shop editing and persistence; atomic chapter
metadata/page rollback and creator review; independent profile/password actions
and sign-in after password change; illustrated novel position saving; and mobile
settings focus, horizontal fit, and tall manga navigation. It does not exercise
production deployment, email delivery, or multi-worker database races.
