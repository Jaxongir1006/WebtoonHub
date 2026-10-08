# WebtoonHub project audit

The fixes implemented after this audit are tracked in [FIX_STATUS.md](C:/Users/Jahongir/code/WebtoonHub/FIX_STATUS.md). The findings and source references below describe the original audited state.

Audit date: 3 October 2026. Priority: reader UI/UX, followed by staff workflows and API/platform correctness.

The project has a consistent visual identity and substantial feature coverage. Its main weakness is the reliability of complete journeys: remembering reading position, showing usable controls on phones, keeping account state current, making saves truthful, and recovering from failed requests. Improving those journeys will help more than adding more decoration or features.

**117 distinct findings after consolidating repeated causes:** 79 primarily concern UI/UX or staff workflows, and 38 primarily concern API, security, data or platform behavior. Backend findings frequently also affect the visible experience. This is the number found in this audit, not a claim that no other problems exist.

| Primary area | Findings |
|---|---:|
| Reader and shared UX | 32 |
| Social, shop and wheel UX | 24 |
| Staff UX and workflows | 23 |
| API, security and platform | 38 |
| **Total** | **117** |

| Priority | Count | Meaning |
|---|---:|---|
| P1 | 18 | Fix first: security, integrity, unexpected virtual-coin charges/destructive behavior, or core workflows failing. |
| P2 | 92 | Significant usability, correctness, access, reliability or maintainability weakness. |
| P3 | 7 | Lower-impact presentation or convenience improvement. |

The total includes 107 implementation defects or risks, 9 product improvement opportunities, and 1 testing-coverage gap. Missing features and design recommendations are explicitly labeled; they are not represented as reproduced crashes.

Severity combines the consequence and the affected journey. A conditional P1 does not mean every user encounters it; reproductions and conditions appear beside each finding. Coins are the project's virtual reward currency, so coin findings describe balance and consent problems rather than real-money loss.

## Scope and verification

Reviewed the React/TypeScript reader, Vue/Pinia staff console, FastAPI/SQLAlchemy services and models, authentication/sessions/RBAC, catalog and three reader modes, publishing/moderation, comments/friends/clans/chat, rewards/shop/wheels/inventory, creator onboarding, media storage, caching, migrations, staging scripts and CI. The core source inventory contains roughly 194 files and 32,000 nonblank lines across the three applications; generated assets and dependencies are excluded from that inventory.

Reader browser checks used desktop and 375px/320px phone widths, including a 375×600 short viewport. The API ran against a disposable SQLite snapshot and a synthetic local reader; API mutation checks used synthetic in-memory databases. The original database and existing user content were preserved. The staff audit primarily used source/contract inspection plus isolated reproductions; it was not an exhaustive live admin walkthrough.

Both frontend production builds passed. The existing three backend configuration tests passed. Those checks demonstrate build/configuration health; they do not validate all business workflows. No production deployment, load benchmark, mail-delivery test, exploit attempt or real-user usability study was performed. PostgreSQL-specific behavior and live staging configuration still need integration verification.

## Architecture and what each part contributes

| Layer | Implementation | Product role | Principal weakness found |
|---|---|---|---|
| Reader | React, TypeScript, Vite, Tailwind, client-side routes and contexts | Discover works; read vertical manhwa, horizontal manga and novels; manage identity, library and social rewards | Continuity, mobile controls, state synchronization and failure recovery |
| Staff console | Vue, Pinia, Vue Router, Axios, Tailwind | Creator uploads, editorial moderation, reader/staff management, roles and economy configuration | Forms disagree with API contracts; previews and permission/state feedback are unreliable |
| API | FastAPI modular monolith, SQLAlchemy, Alembic | Own authentication, publishing rules, wallets, inventory, friendships and clan membership | Authorization boundaries, contract consistency, transaction concurrency and validation |
| Persistence/media/cache | PostgreSQL in deployment; SQLite locally; Redis with memory fallback; MinIO/local public media | Keep reading/social/economy data and serve images efficiently | Unbounded fallback cache, orphaned/failed media writes, excessive payloads |
| Operations | Docker Compose, Nginx, GitHub CI, release and backup scripts | Build, migrate, deploy and recover the product | Readiness checks, schema rollback and independent recoverable backups |

The backend modules separate responsibilities sensibly, and the reader already has useful foundations: shared theme tokens, translations, lazy routes, loading placeholders, retryable vertical images, and a consumer shared modal with focus handling. Many problems come from individual screens bypassing those shared behaviors or from client/server contracts drifting apart.

## Highest-value UI/UX work

1. **Make reading continuous.** Implement real Continue Reading, repair novel repagination/page turns, and measure progress against content (R01–R03, R10–R11). This reduces the effort of returning and the chance of missing text.
2. **Make phone reading dependable.** Fix the manga toolbar, sepia controls, language popover and short-screen forms; enlarge effective filter targets (R04, R06, R17, R19–R21, SE12). Test both small width and short height.
3. **Make every action understandable.** Use consistent loading/empty/error/success states, retain drafts, show the actual configured reward/price, and update personalized state on login (R13–R14, SE02, SE10, SE16, A22, B14). This restores trust in the interface.
4. **Standardize interaction accessibility and language.** Reuse dialog behavior, repair names/labels/keyboard handling, and complete entire journeys in each locale (R05, R15–R16, R18, A19).
5. **Make staff publishing truthful.** Save through correct contracts, preserve page order, await actual completion and show full review content (A01–A03, A06–A09, A29). Reader content quality depends on these workflows.
6. **Improve discovery after the basic journeys work.** Add recent updates and reading shelves, adjust mobile homepage hierarchy and simplify card metadata (R22, R24–R26). Treat engagement benefits as hypotheses to validate.

## Suggested delivery sequence

| Sequence | Changes | Acceptance evidence |
|---|---|---|
| Immediate integrity/security fixes | B01–B04, B06, B10, B13, B18; explicit paid/free-spin intent and destructive clan warning | Negative-permission, wrong-identity, concurrent wallet and wrong-target tests with synthetic data |
| First reader UX iteration | Novel fixes, real resume, phone controls, content progress and fast reader rendering | Return to the saved chapter/page; font changes keep text visible; controls fit 320/375px and short screens |
| Shared behavior iteration | Error recovery, auth hydration/personalization, accessible overlays/forms and complete localization | Slow/failing requests have clear states and preserved drafts; keyboard and each locale complete the same tasks |
| Publishing iteration | Upload/edit contracts, ordering, persistent form completion, full moderation inspector and pagination | Upload/reorder/edit/review/publish a synthetic comic and illustrated novel; refresh verifies persisted results |
| Discovery and platform iteration | Recent updates, cards/home hierarchy, lighter APIs, caching, durable settings, readiness and restore checks | Measured payload/latency improvements and a successful disposable restore/rollback exercise |

Do not replace the entire visual style to address these findings. Use the existing design system while strengthening layout constraints and shared interaction/state primitives. Reader retention and publishing correctness should be the main success measures; virtual reward screens support those journeys.

## Browser evidence

R02 / R04: blank novel page after changing font size; 4/3 counter and 133% progress; low-contrast sepia toolbar.

![R02 / R04: blank novel page after changing font size; 4/3 counter and 133% progress; low-contrast sepia toolbar.](C:/Users/Jahongir/.codex/visualizations/2026/10/03/01a100d4-e7f0-7460-bb69-81dfdad5ccee/audit-evidence/novel-font-change-blank.jpg)

R06: manga chapter selector clips at 375px.

![R06: manga chapter selector clips at 375px.](C:/Users/Jahongir/.codex/visualizations/2026/10/03/01a100d4-e7f0-7460-bb69-81dfdad5ccee/audit-evidence/manga-mobile-header.jpg)

R20: language options extend outside the left edge.

![R20: language options extend outside the left edge.](C:/Users/Jahongir/.codex/visualizations/2026/10/03/01a100d4-e7f0-7460-bb69-81dfdad5ccee/audit-evidence/mobile-language-menu.jpg)

R17: profile edit dialog extends beyond a 375×600 screen.

![R17: profile edit dialog extends beyond a 375×600 screen.](C:/Users/Jahongir/.codex/visualizations/2026/10/03/01a100d4-e7f0-7460-bb69-81dfdad5ccee/audit-evidence/profile-dialog-short-screen.jpg)

SE12: fixed-width wheel exceeds its available 320px phone layout.

![SE12: fixed-width wheel exceeds its available 320px phone layout.](C:/Users/Jahongir/.codex/visualizations/2026/10/03/01a100d4-e7f0-7460-bb69-81dfdad5ccee/audit-evidence/wheel-narrow-phone.jpg)

## Detailed findings

Each entry identifies the consequence, the condition/mechanism, a recommended fix, verification level and code references. Repeated global causes are grouped once; the grouping notes at the end explain consolidation.

## Reader and shared UX

### R01 · P2 · Continue Reading does not resume the reader's position

**Type:** Product improvement.

**Impact:** Returning readers must rediscover their chapter and page each visit. This adds friction to the central retention loop.

**When / mechanism:** Library Continue Reading opens the work detail. Manga/novel readers initialize at page zero; bookmarks store status rather than chapter/page/scroll position.

**Recommended change:** Persist the last chapter and page or stable paragraph/image anchor per reader/work; make Continue Reading open that position, with a separate Start Over action.

**Verification:** Source-confirmed missing capability; no longitudinal user study

**Code:** [frontend/src/pages/LibraryPage.tsx:230](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LibraryPage.tsx:230) · [backend/app/modules/library/models.py:12](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/library/models.py:12) · [frontend/src/components/reader/MangaReader.tsx:39](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:39) · [frontend/src/components/reader/NovelReader.tsx:52](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:52)

### R02 · P1 · Changing novel font size can leave a blank page beyond the last page

**Impact:** Readers can lose access to the text while the page counter and progress become impossible.

**When / mechanism:** Locally reproduced: on page 4 of 4 at base size, choosing A- reduced the page count to 3 but retained index 3: blank text, 4/3, 133%.

**Recommended change:** Preserve a paragraph/word anchor when repaginating, then map it to the new page; clamp the index as a safeguard.

**Verification:** Browser reproduced at 375px

**Code:** [frontend/src/components/reader/NovelReader.tsx:70](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:70) · [frontend/src/components/reader/NovelReader.tsx:94](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:94) · [frontend/src/components/reader/NovelReader.tsx:154](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:154) · [frontend/src/components/reader/NovelReader.tsx:466](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:466)

### R03 · P2 · Novel page turns keep the previous page's scroll offset

**Impact:** A reader who finishes a long page can start the next one halfway down and miss its beginning.

**When / mechanism:** Locally reproduced after scrolling down a novel page: Next changes content without returning to the beginning; the new article started 771px above the viewport.

**Recommended change:** Scroll the reading container to its start after a turn, respecting reduced motion, or use a page-sized reading layout.

**Verification:** Browser reproduced

**Code:** [frontend/src/components/reader/NovelReader.tsx:107](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:107) · [frontend/src/components/reader/NovelReader.tsx:120](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:120)

### R04 · P1 · Default sepia novel controls have very low contrast

**Impact:** The default novel theme makes the title, back control and settings difficult to see, obstructing basic navigation.

**When / mechanism:** Sepia wrapper uses #332415 text on #18130d background; contrast is approximately 1.23:1. The light article is readable, but outer controls inherit dark text.

**Recommended change:** Define separate accessible foreground tokens for the outer toolbar/settings and the light paper; verify every theme.

**Verification:** Browser observed and contrast calculated

**Code:** [frontend/src/components/reader/NovelReader.tsx:177](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:177) · [frontend/src/components/reader/NovelReader.tsx:280](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:280) · [frontend/src/components/reader/NovelReader.tsx:330](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:330)

### R05 · P2 · Reader keyboard shortcuts intercept focused controls

**Impact:** Keyboard users can change a reading page while interacting with chapter selection or settings, instead of activating the focused control.

**When / mechanism:** Novel key listener excludes only INPUT/TEXTAREA and captures Space/arrows/PageDown on buttons/selects. Manga arrows similarly ignore SELECT.

**Recommended change:** Limit shortcuts to the reading surface, skip all interactive targets/contenteditable/dialogs, and preserve native select/button behavior.

**Verification:** Source-confirmed event handling

**Code:** [frontend/src/components/reader/NovelReader.tsx:133](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:133) · [frontend/src/components/reader/MangaReader.tsx:100](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:100)

### R06 · P2 · Manga toolbar clips the chapter selector on phones

**Impact:** Changing chapters becomes difficult and the title/control layout loses readability on a common phone width.

**When / mechanism:** Browser reproduction at 375px: the chapter select extended to x=379, outside the viewport; the title and captions wrapped awkwardly.

**Recommended change:** Use a compact two-row mobile toolbar with min-width:0 title truncation, flexible selector width, and accessible named controls.

**Verification:** Browser reproduced at 375px

**Code:** [frontend/src/components/reader/MangaReader.tsx:159](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:159) · [frontend/src/components/reader/MangaReader.tsx:163](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:163) · [frontend/src/components/reader/MangaReader.tsx:208](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:208)

### R07 · P2 · Manga swipes are handled across the whole page without direction discrimination

**Impact:** Scrolling or interacting below the image can unexpectedly turn the manga page.

**When / mechanism:** Touch handlers sit on the entire reader wrapper; the decision checks horizontal delta without comparing vertical movement or excluding interactive targets.

**Recommended change:** Attach gestures to the image surface, require horizontal dominance, ignore interactive targets, and preserve vertical scrolling.

**Verification:** Source-confirmed gesture scope

**Code:** [frontend/src/components/reader/MangaReader.tsx:121](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:121) · [frontend/src/components/reader/MangaReader.tsx:125](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:125) · [frontend/src/components/reader/MangaReader.tsx:154](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:154)

### R08 · P2 · Manga image failure has no page recovery action

**Impact:** A slow or broken image leaves a reader unable to recover that page without reloading or navigating away.

**When / mechanism:** The manga image has no onError, error placeholder or retry; the vertical reader already has a retryable ChapterPanel.

**Recommended change:** Reuse the retryable image behavior for manga, retain the page number, and show loading/error states within the reading area.

**Verification:** Source-confirmed missing recovery

**Code:** [frontend/src/components/reader/MangaReader.tsx:256](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:256) · [frontend/src/pages/ReaderPage.tsx:13](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:13)

### R09 · P2 · Reader waits for chapter-list metadata before showing loaded content

**Impact:** Readers pay for an extra sequential request even when the chapter itself is ready; a metadata timeout delays reading.

**When / mechanism:** fetchChapter sets data, then awaits full work detail, then clears loading. The second request is auxiliary to the selector.

**Recommended change:** Render the chapter immediately; fetch chapter-list metadata independently with its own loading/error state and a lightweight endpoint.

**Verification:** Source-confirmed sequential dependency; latency not benchmarked

**Code:** [frontend/src/pages/ReaderPage.tsx:60](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:60) · [frontend/src/pages/ReaderPage.tsx:70](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:70) · [frontend/src/pages/ReaderPage.tsx:81](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:81)

### R10 · P2 · Vertical chapter images do not reserve their layout space

**Impact:** Lazy images can expand the document as readers scroll, shifting their location and making progress unstable on slower connections.

**When / mechanism:** ChapterPanel uses lazy images without intrinsic width/height or an aspect ratio. Unloaded pages contribute no predictable height.

**Recommended change:** Return image dimensions and reserve the correct aspect ratio before loading; maintain a stable image anchor during reflow.

**Verification:** Source-confirmed layout-shift risk; no network performance measurement

**Code:** [frontend/src/pages/ReaderPage.tsx:34](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:34)

### R11 · P2 · Vertical reading progress includes rewards and comments

**Impact:** The progress bar does not represent how much of the chapter has been read, and changes when discussion content changes.

**When / mechanism:** Progress uses document.documentElement.scrollHeight; the same document includes the reward card and chapter comments.

**Recommended change:** Measure progress against the chapter image container and clamp completion at its last page, independently of discussion length.

**Verification:** Source-confirmed progress formula

**Code:** [frontend/src/pages/ReaderPage.tsx:94](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:94) · [frontend/src/pages/ReaderPage.tsx:249](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:249) · [frontend/src/pages/ReaderPage.tsx:257](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:257)

### R12 · P2 · Reader toolbar auto-hide depends on one large scroll event

**Impact:** Gentle scrolling can leave controls obscuring content or fail to reveal them when reversing direction.

**When / mechanism:** The listener compares each event with the immediately previous scroll position using 30px/15px thresholds, then overwrites that position each time.

**Recommended change:** Accumulate movement since the last direction change, use a small threshold/hysteresis, and provide an accessible explicit toggle.

**Verification:** Source-confirmed behavior for small event deltas

**Code:** [frontend/src/pages/ReaderPage.tsx:103](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:103) · [frontend/src/pages/ReaderPage.tsx:108](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:108)

### R13 · P2 · Loading, empty and failure states are inconsistent across the product

**Impact:** Readers and staff cannot reliably distinguish missing content from a failed request. Silent mutations leave users unsure whether to retry.

**When / mechanism:** Library/bookmark/comment failures are console-only; reader errors lack Retry. Several admin loads retain zeros/empty data. Wheel loading or no active wheel renders a default paid Spin affordance. Completed friend search also lacks a no-matches message.

**Recommended change:** Use separate loading, empty, unavailable and error states; preserve drafts/data, surface actionable messages, add Retry, and disable actions until required data is valid.

**Verification:** Source-confirmed; examples do not include every screen

**Code:** [frontend/src/pages/LibraryPage.tsx:43](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LibraryPage.tsx:43) · [frontend/src/components/webtoons/BookmarkButton.tsx:65](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/webtoons/BookmarkButton.tsx:65) · [frontend/src/components/comments/ChapterComments.tsx:26](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/comments/ChapterComments.tsx:26) · [frontend/src/pages/ReaderPage.tsx:132](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:132) · [frontend/src/pages/WebtoonDetailPage.tsx:77](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/WebtoonDetailPage.tsx:77) · [admin/src/views/WebtoonDetailView.vue:253](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonDetailView.vue:253) · [admin/src/views/WebtoonDetailView.vue:2](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonDetailView.vue:2) · [admin/src/views/WebtoonsView.vue:350](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonsView.vue:350) · [admin/src/views/DashboardView.vue:273](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/DashboardView.vue:273) · [admin/src/views/EconomyView.vue:515](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/EconomyView.vue:515) · [admin/src/components/layout/Header.vue:27](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/layout/Header.vue:27) · [frontend/src/pages/LuckyWheelPage.tsx:33](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:33) · [frontend/src/pages/LuckyWheelPage.tsx:109](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:109) · [frontend/src/pages/LuckyWheelPage.tsx:165](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:165) · [frontend/src/pages/LuckyWheelPage.tsx:488](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:488) · [frontend/src/pages/FriendsPage.tsx:173](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/FriendsPage.tsx:173)

### R14 · P2 · Authentication hydration and profile failures produce misleading account UI

**Impact:** Existing readers can briefly see sign-in prompts during startup; a successful login with failed profile fetch can close the dialog while the UI still appears logged out.

**When / mechanism:** Private pages branch on isAuthenticated without waiting for isLoading. login returns success after refreshProfile, whose network errors are swallowed and may leave user null.

**Recommended change:** Use explicit checking/authenticated/guest/error states, wait for hydration on protected views, and retain a recoverable profile-load state after login.

**Verification:** Source-confirmed state flow

**Code:** [frontend/src/context/AuthContext.tsx:29](C:/Users/Jahongir/code/WebtoonHub/frontend/src/context/AuthContext.tsx:29) · [frontend/src/context/AuthContext.tsx:60](C:/Users/Jahongir/code/WebtoonHub/frontend/src/context/AuthContext.tsx:60) · [frontend/src/pages/LibraryPage.tsx:73](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LibraryPage.tsx:73) · [frontend/src/pages/ProfilePage.tsx:300](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:300)

### R15 · P2 · Accessible form labels, icon names and selected states are incomplete

**Impact:** Screen-reader and keyboard users have difficulty identifying fields, controls and feedback even when the visual design looks clear.

**When / mechanism:** Reader authentication labels are not associated with inputs; catalog search/clear and filters lack explicit names/pressed state. Admin forms/icon actions/toasts have the same pattern.

**Recommended change:** Associate label/id, name every icon action, expose selected/expanded states, announce status messages, and reveal hover actions on focus/touch.

**Verification:** Source-confirmed accessibility omissions; not a formal WCAG certification

**Code:** [frontend/src/components/auth/AuthModal.tsx:154](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/auth/AuthModal.tsx:154) · [frontend/src/pages/CatalogPage.tsx:112](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/CatalogPage.tsx:112) · [frontend/src/components/webtoons/GenreFilter.tsx:22](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/webtoons/GenreFilter.tsx:22) · [frontend/src/components/common/Navbar.tsx:120](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/common/Navbar.tsx:120) · [admin/src/views/LoginView.vue:95](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/LoginView.vue:95) · [admin/src/components/common/SearchInput.vue:8](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/common/SearchInput.vue:8) · [admin/src/components/layout/Sidebar.vue:29](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/layout/Sidebar.vue:29) · [admin/src/components/common/ToastContainer.vue:1](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/common/ToastContainer.vue:1) · [admin/src/components/webtoons/ChapterUploadModal.vue:282](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:282)

### R16 · P2 · Custom overlays bypass the existing accessible dialog behavior

**Impact:** Keyboard focus can remain behind open overlays, Escape/return focus is inconsistent, and translated-offscreen reader controls remain focusable.

**When / mechanism:** The profile edit modal and reader chapter drawer use hand-built fixed div overlays. The admin shared modal also lacks dialog semantics/focus lifecycle. Consumer common/Modal already implements much of the needed behavior.

**Recommended change:** Reuse or standardize the tested dialog primitive, manage focus/scroll/inert background, remove hidden reader controls from tab order, and guard pending dismissal.

**Verification:** Source-confirmed; profile overlay observed in browser

**Code:** [frontend/src/pages/ProfilePage.tsx:863](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:863) · [frontend/src/components/reader/ReaderNav.tsx:129](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/ReaderNav.tsx:129) · [frontend/src/pages/ReaderPage.tsx:189](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:189) · [frontend/src/components/common/Modal.tsx:30](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/common/Modal.tsx:30) · [admin/src/components/common/Modal.vue:11](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/common/Modal.vue:11) · [admin/src/components/common/Modal.vue:100](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/common/Modal.vue:100) · [admin/src/components/common/Modal.vue:106](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/common/Modal.vue:106) · [frontend/src/components/reader/ReaderNav.tsx:39](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/ReaderNav.tsx:39)

### R17 · P2 · Profile edit dialog overflows short phone screens

**Impact:** Some users cannot reach the heading/close control or complete the form within the visible screen, especially with a keyboard open.

**When / mechanism:** At 375×600, the centered dialog extended beyond both edges: heading/close above the viewport and actions ending around y=616. Its inner panel has overflow-hidden without a max-height scroll region.

**Recommended change:** Constrain to the available dynamic viewport height, scroll the form body, keep actions visible, and account for the on-screen keyboard.

**Verification:** Browser reproduced at 375×600

**Code:** [frontend/src/pages/ProfilePage.tsx:863](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:863) · [frontend/src/pages/ProfilePage.tsx:864](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:864) · [frontend/src/pages/ProfilePage.tsx:979](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:979)

### R18 · P2 · Language selection translates only part of reader and staff experiences

**Impact:** People choosing English or Russian still encounter essential settings, profile actions and moderation screens in Uzbek, weakening comprehension and trust.

**When / mechanism:** Observed mixed-language profile/novel settings with English selected; many literal strings and admin route titles bypass translation resources.

**Recommended change:** Move all visible copy, validation messages and date formatting into locale resources; review complete journeys in each supported language.

**Verification:** Browser observed and source-confirmed

**Code:** [frontend/src/components/reader/NovelReader.tsx:304](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:304) · [frontend/src/pages/ProfilePage.tsx:434](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:434) · [frontend/src/pages/ClanDetailPage.tsx:742](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:742) · [frontend/src/api/client.ts:106](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/client.ts:106) · [admin/src/router/index.js:26](C:/Users/Jahongir/code/WebtoonHub/admin/src/router/index.js:26) · [admin/src/views/ModerationView.vue:9](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ModerationView.vue:9) · [admin/src/views/SessionsView.vue:9](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/SessionsView.vue:9) · [admin/src/components/webtoons/ChapterUploadModal.vue:4](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:4) · [admin/src/views/ClanManagementView.vue:697](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ClanManagementView.vue:697)

### R19 · P2 · Desktop header can compress search into an unusable field

**Impact:** Search becomes difficult to see/use at intermediate desktop widths, exactly where the full navigation first appears.

**When / mechanism:** At the default roughly 1093px viewport the header's full nav, logo, bonus and account controls left the flexing search field around 50px wide.

**Recommended change:** Reserve a minimum usable search width; collapse lower-priority navigation earlier or move search to a dedicated expanded control.

**Verification:** Browser observed near 1093px; depends on locale/auth state

**Code:** [frontend/src/components/common/Navbar.tsx:92](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/common/Navbar.tsx:92) · [frontend/src/components/common/Navbar.tsx:120](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/common/Navbar.tsx:120) · [frontend/src/components/common/Navbar.tsx:143](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/common/Navbar.tsx:143)

### R20 · P2 · Mobile language dropdown opens partly outside the viewport

**Impact:** Readers cannot see or select language options clearly from the mobile menu.

**When / mechanism:** At 375px the dropdown's left edge was around -70px. A right-aligned 176px dropdown is anchored to a short control near the left screen edge.

**Recommended change:** Align left in the mobile menu or use a viewport-aware popover/inline language list.

**Verification:** Browser reproduced at 375px

**Code:** [frontend/src/components/common/LanguageSwitcher.tsx:52](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/common/LanguageSwitcher.tsx:52) · [frontend/src/components/common/Navbar.tsx:322](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/common/Navbar.tsx:322)

### R21 · P2 · Catalog filter controls are too compact for comfortable touch use

**Impact:** Phone readers must hit small closely packed controls; secondary text is also difficult to scan.

**When / mechanism:** Measured at 375px: status controls about 24px tall, format controls 28px, genres 30px. The layout reserves substantial vertical space despite the small targets.

**Recommended change:** Increase effective touch areas with spacing, use readable text, and group less-used filters into a clear mobile filter sheet.

**Verification:** Browser measured; ergonomic recommendation rather than formal conformance finding

**Code:** [frontend/src/pages/CatalogPage.tsx:148](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/CatalogPage.tsx:148) · [frontend/src/pages/CatalogPage.tsx:187](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/CatalogPage.tsx:187) · [frontend/src/components/webtoons/GenreFilter.tsx:22](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/webtoons/GenreFilter.tsx:22)

### R22 · P3 · Catalog search has no visible submit action or typing feedback

**Type:** Product improvement.

**Impact:** Readers can type a query without realizing that results will not change until they press Enter.

**When / mechanism:** Catalog form submits on Enter; the search icon is decorative and there is no Search button or apply hint.

**Recommended change:** Add a visible Search action, or deliberate debounced search with pending feedback; retain keyboard submission and clear behavior.

**Verification:** Source-confirmed interaction; usability hypothesis not user-tested

**Code:** [frontend/src/pages/CatalogPage.tsx:85](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/CatalogPage.tsx:85) · [frontend/src/pages/CatalogPage.tsx:112](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/CatalogPage.tsx:112)

### R23 · P2 · Catalog page changes and back navigation lose the reader's browsing place

**Impact:** Moving to the next catalog page can leave readers at the bottom; returning from a title can force them to scan from the top again.

**When / mechanism:** Pagination changes query parameters on the same pathname, while ScrollToTop listens only to pathname. Path navigation always scrolls to zero, including Back.

**Recommended change:** Scroll to results on page/filter changes and restore list scroll on browser Back, preserving filters and focus.

**Verification:** Source-confirmed navigation policy

**Code:** [frontend/src/pages/CatalogPage.tsx:69](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/CatalogPage.tsx:69) · [frontend/src/App.tsx:31](C:/Users/Jahongir/code/WebtoonHub/frontend/src/App.tsx:31)

### R24 · P2 · Discovery lacks recent updates and reading-context entry points

**Type:** Product improvement.

**Impact:** Returning readers get fewer reasons to revisit, and fresh titles compete with established high-view works.

**When / mechanism:** Home displays a catalog-backed popular list; catalog has format/genre/status filters but no sorting by recent update or new release. There is no Continue Reading shelf.

**Recommended change:** Prioritize Continue Reading, recently updated followed works, and new releases; add transparent sorting and meaningful empty states.

**Verification:** Source-confirmed feature gap; engagement impact is an inference

**Code:** [frontend/src/pages/HomePage.tsx:38](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/HomePage.tsx:38) · [frontend/src/pages/HomePage.tsx:110](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/HomePage.tsx:110) · [frontend/src/pages/CatalogPage.tsx:140](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/CatalogPage.tsx:140) · [backend/app/modules/webtoons/service.py:92](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:92)

### R25 · P3 · Cards truncate the title while giving substantial space to tiny badges

**Type:** Product improvement.

**Impact:** Similar/long titles become hard to identify on two-column phone grids, and dense cover metadata competes with artwork.

**When / mechanism:** Card title is line-clamp-1 while several 10px badges overlay the image or surround the title.

**Recommended change:** Give titles two lines, prioritize format and latest chapter, reduce competing badges, and make details discoverable on focus/tap.

**Verification:** Browser observed and source-confirmed; design recommendation

**Code:** [frontend/src/components/webtoons/WebtoonCard.tsx:40](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/webtoons/WebtoonCard.tsx:40) · [frontend/src/components/webtoons/WebtoonCard.tsx:94](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/webtoons/WebtoonCard.tsx:94) · [frontend/src/components/webtoons/WebtoonCard.tsx:103](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/webtoons/WebtoonCard.tsx:103)

### R26 · P3 · Mobile homepage delays useful discovery behind a tall hero and bonus pitch

**Type:** Product improvement.

**Impact:** Readers must scroll significantly before seeing the catalog selection or a clear return-to-reading entry point.

**When / mechanism:** At 375×812 the stacked cover-first hero pushed its main CTA close to the bottom; a daily bonus strip then precedes the popular grid.

**Recommended change:** Use a compact mobile hero, bring the reading CTA/title above the fold, and prioritize reading/discovery shelves over repeated promotional content.

**Verification:** Browser observed; prioritization recommendation

**Code:** [frontend/src/components/home/HeroBanner.tsx:55](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/home/HeroBanner.tsx:55) · [frontend/src/components/home/HeroBanner.tsx:131](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/home/HeroBanner.tsx:131) · [frontend/src/pages/HomePage.tsx:81](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/HomePage.tsx:81)

### R27 · P2 · Autoplay hero has no user pause control

**Impact:** Readers can lose the title/CTA they are inspecting when the slide changes; focus and hover do not stop rotation.

**When / mechanism:** Hero advances every 7 seconds without a visible pause button or hover/focus pause. It does respect initial prefers-reduced-motion.

**Recommended change:** Provide pause/play, stop while hovered or focused, retain manual controls, and listen for motion-preference changes.

**Verification:** Source-confirmed autoplay behavior

**Code:** [frontend/src/components/home/HeroBanner.tsx:18](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/home/HeroBanner.tsx:18) · [frontend/src/components/home/HeroBanner.tsx:24](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/home/HeroBanner.tsx:24)

### R28 · P2 · Account recovery is missing

**Type:** Product improvement.

**Impact:** A reader who forgets their password has no self-service route back to saved reading, purchases and social relationships.

**When / mechanism:** Authentication UI and API expose registration/login/profile password change but no forgotten-password/reset workflow.

**Recommended change:** Add an expiring, single-use recovery flow with clear delivery/retry states and session revocation after reset.

**Verification:** Source-confirmed missing feature; no mail delivery test

**Code:** [frontend/src/components/auth/AuthModal.tsx:193](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/auth/AuthModal.tsx:193) · [frontend/src/api/auth.ts:10](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/auth.ts:10) · [backend/app/modules/auth/router.py:23](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/router.py:23)

### R29 · P2 · Logout leaves server sessions active and can leave a default bearer header

**Impact:** The visible account can appear logged out while the copied token remains valid; after reader token refresh, later requests may retain the old bearer header.

**When / mechanism:** Reader/staff logout clear local storage only. Reader refresh also writes Axios default Authorization, which logout never clears; the request interceptor only sets a token when one exists.

**Recommended change:** Revoke the current server session, clear Axios defaults and queues, reset personalized state, and broadcast logout across tabs.

**Verification:** Source-confirmed; stale header requires a prior successful refresh

**Code:** [frontend/src/context/AuthContext.tsx:85](C:/Users/Jahongir/code/WebtoonHub/frontend/src/context/AuthContext.tsx:85) · [frontend/src/api/client.ts:17](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/client.ts:17) · [frontend/src/api/client.ts:85](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/client.ts:85) · [admin/src/stores/auth.js:42](C:/Users/Jahongir/code/WebtoonHub/admin/src/stores/auth.js:42) · [admin/src/components/layout/Header.vue:212](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/layout/Header.vue:212)

### R30 · P2 · Token refresh has no timeout and can stall queued requests

**Impact:** A failed or hanging refresh can leave many reader actions waiting indefinitely instead of giving a retryable account-state message.

**When / mechanism:** Main client has a 15-second timeout, but refresh uses plain axios.post without its own timeout; other 401 requests queue behind isRefreshing.

**Recommended change:** Use a bounded refresh client, reject queued calls predictably, and surface a recoverable authentication error.

**Verification:** Source-confirmed hanging-network risk; timeout not simulated

**Code:** [frontend/src/api/client.ts:7](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/client.ts:7) · [frontend/src/api/client.ts:64](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/client.ts:64) · [frontend/src/api/client.ts:77](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/client.ts:77)

### R31 · P2 · Daily bonus rollover can miss the new day

**Impact:** Readers leaving a tab open overnight may remain marked as having claimed today's bonus until they refresh.

**When / mechanism:** Reset requires the interval to run when countdown.totalSeconds is exactly zero. Background timer throttling or scheduling jitter can skip that window; stale profile state can restore the previous claimed flag.

**Recommended change:** Compare the current Tashkent date with the last checked date, refresh on visibility/focus/date change, and use server status as authority.

**Verification:** Source-confirmed timing risk; no overnight browser reproduction

**Code:** [frontend/src/context/DailyBonusContext.tsx:44](C:/Users/Jahongir/code/WebtoonHub/frontend/src/context/DailyBonusContext.tsx:44) · [frontend/src/context/DailyBonusContext.tsx:83](C:/Users/Jahongir/code/WebtoonHub/frontend/src/context/DailyBonusContext.tsx:83) · [frontend/src/context/DailyBonusContext.tsx:79](C:/Users/Jahongir/code/WebtoonHub/frontend/src/context/DailyBonusContext.tsx:79)

### R32 · P3 · Browser titles and share metadata do not describe individual works or chapters

**Type:** Product improvement.

**Impact:** Tabs/history and shared links are less useful; every route presents the same generic platform identity.

**When / mechanism:** index.html has a static title; the SPA router does not update title or per-work description/social metadata.

**Recommended change:** Set localized route/work/chapter titles and metadata, and provide suitable server-rendered share previews where needed.

**Verification:** Source-confirmed metadata gap

**Code:** [frontend/index.html:9](C:/Users/Jahongir/code/WebtoonHub/frontend/index.html:9) · [frontend/src/App.tsx:57](C:/Users/Jahongir/code/WebtoonHub/frontend/src/App.tsx:57)

## Social, shop and wheel UX

### SE01 · P2 · Clan uploads succeed but never reach the preview, and Save restores the old assets

**Impact:** Clan customization is effectively broken: the uploaded logo, banner or frame is not shown as changed, and saving the form restores the old URL.

**When / mechanism:** As clan leader, upload any logo/banner/frame in Settings, then click Save. The upload response has no data wrapper, so edit state remains unchanged; Save submits the original URL.

**Recommended change:** Return a consistent {success,data:{...url},message} envelope or normalize the client upload result, then update the draft URLs before saving.

**Verification:** high; contract confirmed from client and server source

**Code:** [frontend/src/pages/ClanDetailPage.tsx:270](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:270) · [frontend/src/pages/ClanDetailPage.tsx:289](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:289) · [frontend/src/pages/ClanDetailPage.tsx:322](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:322) · [backend/app/modules/clans/router.py:388](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:388) · [backend/app/modules/clans/router.py:426](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:426) · [backend/app/modules/clans/router.py:464](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:464)

### SE02 · P2 · Clan creation shows and subtracts a fixed 300 coins although the actual price is configurable

**Impact:** Users can agree to a displayed 300-coin price and be charged a different amount; the header balance is then wrong. The admin settings screen also converts a valid zero fee back to 300 on load.

**When / mechanism:** Change system setting clan_creation_cost from 300, open Create Clan, submit with enough funds. Backend charges the setting; UI displays 300 and subtracts 300.

**Recommended change:** Expose the current creation fee, display it before submission and return authoritative remaining_coins from creation; refresh profile after success. Preserve zero with nullish fallback in the staff configuration form.

**Verification:** high; both sources confirmed

**Code:** [frontend/src/pages/ClansPage.tsx:99](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClansPage.tsx:99) · [backend/app/modules/clans/router.py:247](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:247) · [backend/app/modules/clans/router.py:258](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:258) · [admin/src/views/ClanManagementView.vue:572](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ClanManagementView.vue:572)

### SE03 · P2 · Cancel in appearance-edit dialogs does not cancel uploaded image changes

**Impact:** Users expect a draft preview with Save/Cancel, but selecting a file immediately changes their public appearance; Cancel leaves it persisted, while the visible clan page can retain the old appearance.

**When / mechanism:** Upload a clan asset or a profile avatar in its Edit dialog, then press Cancel and reload. The image is already saved by its upload endpoint.

**Recommended change:** Stage uploads and commit only on Save, or label image replacement as an immediate save and provide a clear undo action.

**Verification:** high; mutation lifecycle confirmed

**Code:** [frontend/src/pages/ClanDetailPage.tsx:932](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:932) · [backend/app/modules/clans/router.py:386](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:386) · [frontend/src/pages/ProfilePage.tsx:121](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:121) · [frontend/src/pages/ProfilePage.tsx:982](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:982) · [backend/app/modules/users/router.py:74](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/users/router.py:74)

### SE04 · P2 · Clan leaders are told to transfer leadership before leaving, but cannot transfer it

**Impact:** A leader of a multi-member clan has no supported exit path; the only apparent workaround is removing all other members.

**When / mechanism:** Create a clan, add another member, then use Leave. Backend requires leadership transfer; Members offers only Kick and the client/server define no transfer endpoint.

**Recommended change:** Add an explicit transfer-leadership flow and endpoint, with recipient selection and confirmation, then allow the former leader to leave.

**Verification:** high; router and frontend exhaustively inspected

**Code:** [frontend/src/pages/ClanDetailPage.tsx:716](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:716) · [backend/app/modules/clans/router.py:549](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:549)

### SE05 · P1 · The last clan leader's generic Leave action silently means delete the whole clan

**Impact:** The confirmation asks only whether to leave, but the server permanently deletes the clan when its leader is the sole member.

**When / mechanism:** As sole member/leader press Leave and accept the generic confirmation. Backend executes db.delete(clan).

**Recommended change:** Use a distinct Disband Clan action and describe deletion consequences in the confirmation; never conceal disbanding behind Leave.

**Verification:** high; frontend confirmation and backend delete branch confirmed

**Code:** [backend/app/modules/clans/router.py:555](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:555) · [backend/app/modules/clans/router.py:558](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:558)

### SE06 · P1 · A stale Free Spin button can charge coins

**Impact:** The user can click a CTA promising a free spin and be charged the paid fee without a new decision.

**When / mechanism:** Open the same wheel in two tabs, consume its daily free spin in one, then click the still-free CTA in the other. Client submits only wheel ID; backend recalculates free eligibility and charges the fee.

**Recommended change:** Send an expected free/paid mode and expected price, reject if eligibility or cost changed, refresh status and let the user choose again.

**Verification:** high; API request and charging logic confirmed

**Code:** [frontend/src/pages/LuckyWheelPage.tsx:182](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:182) · [frontend/src/api/wheel.ts:82](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/wheel.ts:82) · [backend/app/modules/wheel/service.py:210](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/wheel/service.py:210) · [backend/app/modules/wheel/service.py:224](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/wheel/service.py:224) · [backend/app/modules/wheel/service.py:235](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/wheel/service.py:235)

### SE07 · P1 · Switching wheels leaves Spin active against the previous wheel

**Impact:** Selected wheel label, displayed wheel data and charged spin can disagree, potentially spending coins on the wrong wheel. Admin spin-history requests can similarly place the previous wheel's history under the newly selected wheel.

**When / mechanism:** With multiple wheels and a slow connection, choose a different wheel and immediately Spin before getWheel resolves. selectedWheelId changes immediately but wheelDetail stays old; handleSpin uses wheelDetail.id. Rapid selection also permits an older response to overwrite the newer one.

**Recommended change:** Clear/set detail loading on selection, disable Spin until the selected ID's detail is loaded, and cancel or ignore superseded detail requests.

**Verification:** high; state and request sequence confirmed

**Code:** [frontend/src/pages/LuckyWheelPage.tsx:124](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:124) · [frontend/src/pages/LuckyWheelPage.tsx:165](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:165) · [frontend/src/pages/LuckyWheelPage.tsx:182](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:182) · [admin/src/views/WheelManagementView.vue:804](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WheelManagementView.vue:804)

### SE08 · P2 · Numeric usernames link to another user's public profile

**Impact:** Profiles and friend actions can target the wrong person when a username is all digits and matches another account's ID.

**When / mechanism:** Create username '123' with an ID other than123 while user ID123 exists. Frontend links /users/123 by username; backend resolves ID123 first.

**Recommended change:** Separate username and ID routes or explicitly mark identifier type; use stable user IDs for account links and preserve username routes for display.

**Verification:** high; allowed pattern and resolver confirmed

**Code:** [backend/app/modules/auth/schemas.py:9](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/schemas.py:9) · [frontend/src/pages/FriendsPage.tsx:323](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/FriendsPage.tsx:323) · [frontend/src/pages/ProfilePage.tsx:438](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:438)

### SE09 · P2 · Guests cannot use Buy to sign in

**Impact:** Product cards show disabled Buy actions for every priced item; the intended login flow in handleAction cannot run.

**When / mechanism:** Visit Shop logged out. canAfford treats guest balance as0, so Buy is disabled for every positive-price item despite handleAction containing openAuthModal.

**Recommended change:** Keep guest CTA enabled and label it Sign in to buy; apply affordability disabling only to authenticated users, with a reason.

**Verification:** high; disabled predicate confirmed

**Code:** [frontend/src/components/shop/ShopItemCard.tsx:27](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/shop/ShopItemCard.tsx:27) · [frontend/src/components/shop/ShopItemCard.tsx:30](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/shop/ShopItemCard.tsx:30)

### SE10 · P2 · Personalized ownership, bookmarks and reward state become stale across account changes

**Impact:** Existing owned items can still show Buy instead of Equip after login; users receive avoidable already-owned purchase errors. Work details do not clear a previous bookmark when the new work/user has none; an already-open reader does not refetch claimed state after login.

**When / mechanism:** Open Shop as guest, sign in using the header or modal with an account that owns items. Item fetch depends only on filterType, so is_owned from the anonymous response remains until changing filter/reloading. Open a bookmarked work then a work with no bookmark, or sign in while an unclaimed guest chapter is open.

**Recommended change:** Key personalized data by user ID and content ID, clear it on identity/content changes, refetch authoritative ownership/bookmark/claim state, and ignore obsolete responses.

**Verification:** high; effect dependencies and personalized server fields confirmed

**Code:** [frontend/src/pages/ShopPage.tsx:40](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ShopPage.tsx:40) · [backend/app/modules/shop/service.py:31](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/shop/service.py:31) · [frontend/src/components/shop/ShopItemCard.tsx:37](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/shop/ShopItemCard.tsx:37) · [frontend/src/pages/WebtoonDetailPage.tsx:37](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/WebtoonDetailPage.tsx:37) · [frontend/src/pages/WebtoonDetailPage.tsx:51](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/WebtoonDetailPage.tsx:51) · [frontend/src/pages/ReaderPage.tsx:84](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:84)

### SE11 · P3 · Frame previews replace the user's uploaded avatar with initials

**Type:** Product improvement.

**Impact:** Users cannot judge whether a cosmetic frame fits their real photo before buying/equipping; preview and final appearance differ.

**When / mechanism:** Set a profile photo, visit Shop or Inventory. Frame preview passes username and frameUrl without avatarUrl, while the actual profile uses user.avatar_url.

**Recommended change:** Pass user.avatar_url through every personal cosmetic preview and provide a full profile/banner preview for backgrounds.

**Verification:** high; props confirmed

**Code:** [frontend/src/pages/InventoryPage.tsx:342](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/InventoryPage.tsx:342) · [frontend/src/pages/ProfilePage.tsx:623](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:623) · [frontend/src/pages/ProfilePage.tsx:351](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:351)

### SE12 · P2 · The wheel uses a fixed width that does not fit small phones

**Impact:** Wheel edges and its decoration extend outside their card on common narrow phones; page overflow-hidden clips them.

**When / mechanism:** Use375px or320px viewport: 320px wheel plus card p6(48px) plus page px4(32px) needs roughly400px; no shrink/scale rule is supplied.

**Recommended change:** Make wheel width100% with an aspect ratio and max-width320/400px, reserving space for decorative inset borders.

**Verification:** Browser measured at 320px, plus source inspection: wheel box was 320px wide with left edge -4px.

**Code:** [frontend/src/pages/LuckyWheelPage.tsx:316](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:316) · [frontend/src/pages/LuckyWheelPage.tsx:388](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:388) · [frontend/src/pages/LuckyWheelPage.tsx:417](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:417)

### SE15 · P3 · Public spin history omits the calendar date

**Impact:** Older spins at the same time of day cannot be distinguished; users cannot audit when coins were spent or rewards received.

**When / mechanism:** View public Live Wins with records across several days: created_at is formatted only as hour/minute/second. Personal history has a separate route failure (B08).

**Recommended change:** Show relative day plus time or a localized date/time, group records by day, and expose the complete timestamp.

**Verification:** high; formatter confirmed

**Code:** [frontend/src/pages/LuckyWheelPage.tsx:609](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:609)

### SE16 · P2 · Failed clan chat sends erase the user's message draft

**Impact:** Network failures lose typed content and give users no visible indication that their message failed.

**When / mechanism:** Type a message and submit with REST fallback while offline or server failing. chatInput is cleared before delivery; catch only logs and never restores the text.

**Recommended change:** Retain draft until acknowledged, render pending/failed message states, restore failed drafts and offer retry.

**Verification:** high; send lifecycle confirmed

**Code:** [frontend/src/pages/ClanDetailPage.tsx:153](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:153) · [frontend/src/pages/ClanDetailPage.tsx:159](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:159)

### SE17 · P2 · Clan chat silently stops receiving messages after a disconnect

**Impact:** The UI continues to look like live chat while incoming messages stop; sending can fall back to REST without restoring live updates.

**When / mechanism:** Open clan chat, briefly disable network or restart server, then reconnect. onclose does nothing and the socket effect runs only when clanId/my_role changes.

**Recommended change:** Track connection state, show a reconnecting/offline indicator, reconnect with backoff and catch up messages since the last acknowledged ID.

**Verification:** high; socket handlers and effect dependencies confirmed

**Code:** [frontend/src/pages/ClanDetailPage.tsx:131](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:131) · [frontend/src/pages/ClanDetailPage.tsx:149](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:149)

### SE18 · P2 · Every incoming chat message forcibly scrolls the reader to the bottom

**Impact:** Users cannot read older messages during an active conversation, and scrollIntoView can move the outer document as well as the chat pane.

**When / mechanism:** Scroll up inside a busy clan chat. Any incoming WebSocket message invokes smooth scrollIntoView on the end marker regardless of the user's position.

**Recommended change:** Auto-scroll only when already near the bottom or sending your own message; otherwise show a New messages affordance within the chat pane.

**Verification:** high; unconditional scroll confirmed

**Code:** [frontend/src/pages/ClanDetailPage.tsx:135](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:135)

### SE19 · P2 · Clan history older than the latest 50 messages has no retrieval path

**Impact:** Clan rules, announcements and earlier conversation become inaccessible from the chat once enough newer messages exist.

**When / mechanism:** Populate a clan with more than50 messages and reload. Initial history fetch requests50 and neither UI nor API has before/cursor pagination.

**Recommended change:** Add cursor pagination using created_at/message ID and load older messages when scrolling upward, retaining current scroll position.

**Verification:** high; history API and render path confirmed

**Code:** [backend/app/modules/clans/router.py:799](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:799) · [backend/app/modules/clans/router.py:815](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:815)

### SE20 · P2 · Long links and unbroken text escape clan chat bubbles

**Impact:** Long URLs or allowed500-character words become clipped/overflowing rather than readable, especially on phones.

**When / mechanism:** Send a long unbroken URL or500-character word. Bubble lacks overflow-wrap/break-word and its parent only limits max-width; outer chat container clips overflow.

**Recommended change:** Apply min-width0 and overflow-wrap:anywhere to message bodies, keep metadata flexible and provide copy/link handling.

**Verification:** high source; browser reproduction pending

**Code:** [frontend/src/pages/ClanDetailPage.tsx:610](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:610) · [frontend/src/pages/ClanDetailPage.tsx:561](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:561) · [frontend/src/pages/ClanDetailPage.tsx:660](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:660)

### SE21 · P2 · Reader and staff search results can belong to an older query

**Impact:** Users see people unrelated to the visible search query, can send a request to the wrong result, and clearing search can be undone by a late response. Staff user search has the same stale-response risk.

**When / mechanism:** Throttle network, searchA, thenB or clear the field afterA's request starts. Only the debounce timer is cancelled; in-flight responses still assign results.

**Recommended change:** Abort requests or compare a request/query sequence before setting results; clear searching state and stale results when the query changes.

**Verification:** high; effect lifecycle confirmed

**Code:** [frontend/src/pages/FriendsPage.tsx:67](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/FriendsPage.tsx:67) · [frontend/src/pages/FriendsPage.tsx:83](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/FriendsPage.tsx:83) · [admin/src/views/UsersView.vue:220](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/UsersView.vue:220)

### SE22 · P2 · Adding an incoming friend requester accepts them but shows Pending

**Impact:** Relationship state and confirmation are false after a successful action; the accepted friendship appears to still await approval.

**When / mechanism:** Search a user who has already sent you a request. Search renderer handles only friends/pending_sent, so shows Add Friend for pending_received. Backend auto-accepts, but handler always writes pending_sent and generic request-sent text.

**Recommended change:** Render an Accept action for pending_received and map the API's returned status to authoritative friendship state instead of assuming pending.

**Verification:** high; auto-accept server branch and client rendering confirmed

**Code:** [frontend/src/pages/FriendsPage.tsx:214](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/FriendsPage.tsx:214) · [frontend/src/pages/FriendsPage.tsx:223](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/FriendsPage.tsx:223) · [backend/app/modules/friends/router.py:209](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/friends/router.py:209) · [backend/app/modules/friends/router.py:214](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/friends/router.py:214)

### SE23 · P3 · Sent friend requests have no cancel action

**Type:** Product improvement.

**Impact:** An accidental request remains pending indefinitely with no visible way for its sender to withdraw it.

**When / mechanism:** Send a request, open Requests or recipient public profile. Outgoing card has only a Pending badge; public profile has a disabled pending button.

**Recommended change:** Expose Cancel request on outgoing cards/public profiles and use an unambiguous friendship-ID deletion endpoint.

**Verification:** high; outgoing render and existing authorized delete support confirmed

**Code:** [frontend/src/pages/PublicProfilePage.tsx:253](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/PublicProfilePage.tsx:253) · [backend/app/modules/friends/router.py:310](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/friends/router.py:310)

### SE25 · P2 · Closed or full clans disable one Join action but leave the chat Join action enabled

**Impact:** Users encounter contradictory affordances and are sent into a guaranteed failure from the chat placeholder; the primary disabled button does not explain whether the clan is full or closed.

**When / mechanism:** Visit a clan with recruiting off or capacity reached as a nonmember. Header Join is disabled, but the chat invitation CTA still calls handleJoinClan.

**Recommended change:** Share a single join-eligibility state across all CTAs, display Closed/Full reasons, and offer alternative clans instead of a doomed action.

**Verification:** high; contradictory predicates confirmed

**Code:** [frontend/src/pages/ClanDetailPage.tsx:427](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:427)

### SE26 · P2 · Creating, joining or leaving a clan does not refresh the user's clan badge

**Impact:** Profile/header can show no clan after joining or the old clan after leaving, undermining confidence that membership changed.

**When / mechanism:** Join/leave a clan and then open your profile without reloading. Handlers update only clan-page data or navigate; they never refresh AuthContext.user.clan. Creation also only changes coins.

**Recommended change:** Refresh or authoritatively update the current user membership after each successful create/join/leave action.

**Verification:** high; handler and displayed profile source confirmed

**Code:** [frontend/src/pages/ClanDetailPage.tsx:193](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:193) · [frontend/src/pages/ClansPage.tsx:100](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClansPage.tsx:100) · [frontend/src/pages/ProfilePage.tsx:400](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:400)

### SE27 · P2 · Concurrent Equip actions can make local inventory contradict the actual equipped item

**Impact:** Cards can show the wrong active decoration even after the server has selected another one; loading state can clear while a second action is still running.

**When / mechanism:** With slow/reordered responses, click Equip onA thenB. Single actionLoadingId disables only the latest item; both responses mutate local is_active, and each finally clears the shared loading ID.

**Recommended change:** Serialize equip mutations per item type, disable same-type actions until completion, and reconcile inventory with the authoritative equip response or a refetch.

**Verification:** high; overlapping action lifecycle confirmed

**Code:** [frontend/src/pages/InventoryPage.tsx:69](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/InventoryPage.tsx:69) · [frontend/src/pages/InventoryPage.tsx:78](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/InventoryPage.tsx:78) · [frontend/src/pages/InventoryPage.tsx:389](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/InventoryPage.tsx:389) · [frontend/src/pages/ProfilePage.tsx:172](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:172) · [frontend/src/pages/ProfilePage.tsx:659](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:659)

## Staff UX and workflows

### A01 · P1 · Webtoon editing sends the wrong request body and can report success without changing anything

**Impact:** Editors cannot update a title, description, author, format, status, genres, or replacement cover reliably; a success toast masks a failed edit.

**When / mechanism:** updateWebtoon passes a plain object to Axios PATCH with default application/json. The server accepts every editable field through Form(None) and cover_image through File(None), so the JSON fields are not bound.

**Recommended change:** Use FormData for updates, JSON.stringify genre_ids, append cover_image_file as cover_image, and compare the returned persisted record before closing.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/api/webtoons.js:42](C:/Users/Jahongir/code/WebtoonHub/admin/src/api/webtoons.js:42) · [backend/app/modules/webtoons/router.py:286](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/router.py:286) · [admin/src/views/WebtoonsView.vue:417](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonsView.vue:417) · [admin/src/views/WebtoonDetailView.vue:365](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonDetailView.vue:365)

### A02 · P1 · Staff webtoon detail uses a public response that hides pending chapters and breaks previews

**Impact:** Creators cannot find or revise a newly uploaded pending/rejected chapter from the promised chapter list. Published comic chapters look empty and status badges are blank.

**When / mechanism:** The view uses res.data.chapters from GET /staff/webtoons/:id. That endpoint calls the public detail service, filters to published chapters and returns ChapterItemSimple without images or status. The view expects those fields and previews ch.images without fetching full detail.

**Recommended change:** Load a dedicated authenticated staff detail/chapter endpoint with all permitted statuses and page metadata; fetch chapter detail/images on preview.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/views/WebtoonDetailView.vue:256](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonDetailView.vue:256) · [backend/app/modules/webtoons/router.py:177](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/router.py:177) · [backend/app/modules/webtoons/service.py:188](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:188) · [backend/app/modules/webtoons/schemas.py:45](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/schemas.py:45) · [admin/src/views/WebtoonDetailView.vue:333](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonDetailView.vue:333)

### A03 · P1 · The genre management modal crashes when it renders a genre

**Impact:** Any administrator opening genre management with an existing genre can lose the management UI to a render error.

**When / mechanism:** The template calls getManhwasCount(genre.id), but the script declares no such function or imported binding.

**Recommended change:** Implement the count from API-provided data or remove the nonexistent call; add a populated-genre render smoke check.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/components/webtoons/GenreManageModal.vue:88](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/GenreManageModal.vue:88)

### A04 · P2 · Select all permissions throws a TypeError

**Impact:** Role administrators must select permissions individually; the advertised bulk selection action fails.

**When / mechanism:** availablePermissions is a computed ref, but selectAll calls availablePermissions.map rather than availablePermissions.value.map. A Node/Vue reproduction produced TypeError: availablePermissions.map is not a function.

**Recommended change:** Unwrap the computed ref inside script code and verify bulk select/clear interactions.

**Verification:** Source inspection and isolated Vue computed-ref reproduction.

**Code:** [admin/src/components/rbac/RoleFormModal.vue:163](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/rbac/RoleFormModal.vue:163)

### A05 · P2 · Reader editing exposes four controls that are never saved

**Impact:** Support staff receive a success message after changing a reader's username, email, avatar frame, or background, while those values remain unchanged.

**When / mechanism:** UserEditModal edits username/email/equipped_frame/equipped_background, but onUserUpdated submits only lightning_coins and is_active. ReaderUpdateRequest likewise only supports those two fields.

**Recommended change:** Make unsupported fields read-only until an explicit backend contract exists; otherwise implement stable item IDs, ownership validation, and persisted updates.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/views/UsersView.vue:261](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/UsersView.vue:261) · [admin/src/components/users/UserEditModal.vue:35](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/users/UserEditModal.vue:35) · [admin/src/components/users/UserEditModal.vue:97](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/users/UserEditModal.vue:97) · [backend/app/modules/staff/schemas.py:110](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/schemas.py:110)

### A06 · P2 · Chapter image edits are not persisted by the API

**Impact:** A creator can reorder, remove, or add a page URL, click Save, and be told the chapter was edited, but the comic pages are unchanged.

**When / mechanism:** The editor mutates form.images and emits it, but ChapterUpdateRequest contains no images field and the update service only changes scalar chapter fields. Unknown JSON fields are ignored.

**Recommended change:** Provide a typed image-order/removal/replacement API with storage cleanup and full chapter data, or remove these controls until supported.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/components/webtoons/ChapterEditModal.vue:221](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterEditModal.vue:221) · [backend/app/modules/webtoons/schemas.py:130](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/schemas.py:130) · [backend/app/modules/webtoons/service.py:627](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:627)

### A07 · P1 · Upload preview ordering can diverge from the files that are actually uploaded

**Impact:** Creators can publish comic pages in a different order from the visible preview or remove the wrong page, damaging the reading experience.

**When / mechanism:** rawFiles is pushed synchronously in selection order, but uploadedImages is pushed as independent FileReader callbacks finish. moveImage/removeImage assume both arrays share indexes, which is not guaranteed for differently sized files.

**Recommended change:** Store one ordered array of {file,preview,status} objects and update the preview on its own object; disable editing until reads complete or preserve Promise.all order.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/components/webtoons/ChapterUploadModal.vue:470](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:470) · [admin/src/components/webtoons/ChapterUploadModal.vue:483](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:483) · [admin/src/components/webtoons/ChapterUploadModal.vue:494](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:494)

### A08 · P1 · Most edit/upload forms close on a timer before the server has accepted the work

**Impact:** On slow networks or validation errors, creators/admins lose the visible form, cannot see field errors, and can submit duplicate work after reopening. The loading indicator does not represent actual saving.

**When / mechanism:** ChapterUploadModal emits upload-success and closes after 400 ms while its async parent is still uploading. The same pattern appears in WebtoonFormModal, ChapterEditModal, UserEditModal, CoinsModal, RoleFormModal, StaffUserModal, and CommentEditModal. Vue event emission does not await the parent's promise.

**Recommended change:** Use an awaited save callback or parent-owned pending/error state; close only after success, preserve form data on error, and prevent dismissal while a mutation is pending.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/components/webtoons/ChapterUploadModal.vue:515](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:515) · [admin/src/components/webtoons/WebtoonFormModal.vue:333](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/WebtoonFormModal.vue:333) · [admin/src/components/webtoons/ChapterEditModal.vue:241](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterEditModal.vue:241) · [admin/src/components/users/UserEditModal.vue:304](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/users/UserEditModal.vue:304) · [admin/src/components/users/CoinsModal.vue:130](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/users/CoinsModal.vue:130)

### A09 · P2 · Comic uploads inherit a ten-second timeout and give no real upload progress

**Impact:** The modal advertises 20–50 page batches, which can time out on normal mobile/broadband uploads. Creators cannot know whether an upload is still transferring or was accepted and may retry it.

**When / mechanism:** The shared Axios timeout is 10000 ms and uploadChapter does not override it or supply onUploadProgress. Uploader accepts image/* with no displayed size/count budget and only a fake short spinner.

**Recommended change:** Use a suitable upload-specific timeout, progress/processing states, size/count validation aligned with the server, and a retry strategy that cannot duplicate chapters.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/api/client.js:6](C:/Users/Jahongir/code/WebtoonHub/admin/src/api/client.js:6) · [admin/src/api/webtoons.js:52](C:/Users/Jahongir/code/WebtoonHub/admin/src/api/webtoons.js:52) · [admin/src/components/webtoons/ChapterUploadModal.vue:5](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:5) · [admin/src/components/webtoons/ChapterUploadModal.vue:240](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:240)

### A10 · P2 · The chapter uploader retains completed chapter data and assumes project ID 1

**Impact:** Reopening after a successful upload retains the files and chapter number 1, inviting duplicate submissions; a fresh database without project ID 1 begins with an invalid invisible selection.

**When / mechanism:** The form defaults webtoon_id to preselectedWebtoonId || 1 and chapter_number to 1. There is no modelValue/success watcher that clears files or advances/reset chapter metadata. Existing-project counts are also shown from a field the catalog does not return.

**Recommended change:** Initialize selection from an actual eligible project, require an explicit selection, compute a suggested next chapter number, and reset successful submissions while retaining failed drafts.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/components/webtoons/ChapterUploadModal.vue:387](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:387) · [admin/src/components/webtoons/ChapterUploadModal.vue:22](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:22) · [admin/src/components/webtoons/ChapterUploadModal.vue:395](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:395) · [admin/src/components/webtoons/ChapterUploadModal.vue:506](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:506)

### A11 · P2 · Administrative navigation and action permissions disagree with the server

**Impact:** Valid custom-role users encounter hidden workspaces or actions that always fail with 403. Role managers without staff:manage lose the entire RBAC matrix because one unrelated request fails.

**When / mechanism:** RBAC uses roles:manage but loadRbacData Promise.all includes /users requiring staff:manage. Creator Requests uses roles:manage while its server requires users:manage. Chapter edit/delete buttons use chapters:create|webtoons:edit and webtoons:delete while server requires chapters:edit/delete. Coin actions appear for users:manage even when coins:adjust/distribute is absent. Webtoon navigation requires create even for edit/delete-only roles.

**Recommended change:** Define a shared permission map; separate sections by capability; conditionally request authorized datasets and independently settle them; gate each action using its exact backend permission.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/router/index.js:74](C:/Users/Jahongir/code/WebtoonHub/admin/src/router/index.js:74) · [admin/src/views/RbacView.vue:283](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/RbacView.vue:283) · [backend/app/modules/staff/router.py:208](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:208) · [admin/src/router/index.js:80](C:/Users/Jahongir/code/WebtoonHub/admin/src/router/index.js:80) · [backend/app/modules/creator_requests/router.py:71](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/creator_requests/router.py:71) · [admin/src/views/WebtoonDetailView.vue:153](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonDetailView.vue:153) · [admin/src/views/WebtoonDetailView.vue:169](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonDetailView.vue:169) · [admin/src/views/EconomyView.vue:18](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/EconomyView.vue:18)

### A12 · P2 · Expired or revoked staff sessions leave users in a stale authenticated shell

**Impact:** Staff whose session expired or whose role changed still see cached permissions, online indicators, and stale/empty pages; navigating to Login sends them back to the dashboard.

**When / mechanism:** isAuthenticated checks only local token/staff presence. checkAuth exists but rg found no caller in admin/src. Axios has no response interceptor for 401/session expiry, and the guest guard redirects locally authenticated users away from login.

**Recommended change:** Validate identity during bootstrap, refresh current permissions after role changes, clear auth and redirect on 401, and retain the requested destination for successful reauthentication.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/stores/auth.js:11](C:/Users/Jahongir/code/WebtoonHub/admin/src/stores/auth.js:11) · [admin/src/stores/auth.js:49](C:/Users/Jahongir/code/WebtoonHub/admin/src/stores/auth.js:49) · [admin/src/api/client.js:14](C:/Users/Jahongir/code/WebtoonHub/admin/src/api/client.js:14) · [admin/src/router/index.js:133](C:/Users/Jahongir/code/WebtoonHub/admin/src/router/index.js:133)

### A14 · P2 · Admin lists stop at the first 100 records without pagination

**Impact:** Once content/readers/comments exceed 100, administrators cannot reach older items. A pending chapter outside the first mixed-status batch can disappear from the moderation queue; counts and search feel incorrect.

**When / mechanism:** Moderation loads limit:100 then filters the loaded mixed-status subset locally. Catalog loads limit:100 and performs local search/filtering. Users/comments load only the first 100. Economy shows only 50 transactions with no next-page workflow.

**Recommended change:** Apply search/status filters on the server, expose total/pages and pagination or cursor loading, and give moderation a dedicated full pending queue.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/views/ModerationView.vue:235](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ModerationView.vue:235) · [admin/src/views/WebtoonsView.vue:354](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonsView.vue:354) · [admin/src/views/WebtoonsView.vue:370](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonsView.vue:370) · [admin/src/views/UsersView.vue:225](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/UsersView.vue:225) · [admin/src/views/CommentsView.vue:112](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/CommentsView.vue:112) · [admin/src/views/EconomyView.vue:499](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/EconomyView.vue:499)

### A16 · P2 · Light theme produces unreadable text on white cards and inconsistent surfaces

**Impact:** Users selecting Light get white text on white cards in moderation/sessions and several empty states; badges become very pale. The main background stays almost black.

**When / mechanism:** glass-card becomes white without .dark, but moderation/sessions keep text-white and dark-only controls. Shared Badge uses light pastel text without dark variants. AppLayout unconditionally uses bg-studio-950. Upload/Webtoon/Role/Coin forms mix white modal frames with dark-only field styling.

**Recommended change:** Use shared semantic theme tokens for every surface/text/status and audit light/dark combinations, prioritizing readable card headings, badges, errors, and form labels.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/views/ModerationView.vue:81](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ModerationView.vue:81) · [admin/src/views/SessionsView.vue:67](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/SessionsView.vue:67) · [admin/src/views/CommentsView.vue:33](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/CommentsView.vue:33) · [admin/src/components/common/Badge.vue:36](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/common/Badge.vue:36) · [admin/src/components/layout/AppLayout.vue:2](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/layout/AppLayout.vue:2) · [admin/src/assets/styles/main.css:65](C:/Users/Jahongir/code/WebtoonHub/admin/src/assets/styles/main.css:65)

### A19 · P2 · Collapsed desktop navigation stays unlabeled on mobile and remains tabbable while hidden

**Impact:** A user who collapses the desktop sidebar and narrows the window opens a 256px mobile drawer containing only icons. Keyboard users can focus navigation that is translated off-screen.

**When / mechanism:** Mobile width is forced to w-64, but labels still v-show=isSidebarOpen, so the desktop collapse flag hides them on mobile. Closing mobile menu only translates the sidebar, with no inert/aria-hidden/focus management.

**Recommended change:** Separate desktop collapse from mobile visibility, always show mobile labels, add accessible names/tooltips for collapsed icons, and make a closed drawer inert with proper focus handling.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/components/layout/Sidebar.vue:5](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/layout/Sidebar.vue:5) · [admin/src/components/layout/Sidebar.vue:71](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/layout/Sidebar.vue:71) · [admin/src/components/layout/Header.vue:5](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/layout/Header.vue:5)

### A21 · P2 · Dashboard and discovery labels misrepresent their statistics

**Impact:** Owners make decisions from invented growth percentages, inflated published counts, and chapter counts that are actually the latest chapter number. Reader Home also labels a lifetime-view ranking Popular Today without a daily measurement window. Repeated public detail requests, including staff reuse, increment views.

**When / mechanism:** Growth trends 12/24/18 are constants, not historical measurements. publishedChaptersCount is total_chapters minus pending_chapters, which also includes rejected/draft chapters. Catalog chapter-count helper prefers latest_chapter.chapter_number over actual count, so sparse/fractional numbering gives nonsense counts.

**Recommended change:** Remove unavailable trends, return explicit published/count aggregates from the API, and clearly name metrics and date windows. Match discovery labels to actual ranking periods and distinguish measured reader views from administrative/detail refetches.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/views/DashboardView.vue:74](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/DashboardView.vue:74) · [admin/src/views/DashboardView.vue:88](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/DashboardView.vue:88) · [admin/src/views/DashboardView.vue:102](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/DashboardView.vue:102) · [admin/src/views/DashboardView.vue:259](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/DashboardView.vue:259) · [admin/src/views/WebtoonsView.vue:396](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonsView.vue:396) · [frontend/src/pages/HomePage.tsx:117](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/HomePage.tsx:117) · [backend/app/modules/webtoons/service.py:92](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:92) · [backend/app/modules/webtoons/service.py:172](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:172)

### A22 · P2 · Chapter reward selection is ignored during upload and reader badges misrepresent configured rewards

**Impact:** Upload forms offer a per-chapter reward but the upload API uses the default instead. The vertical reader also advertises five coins even for a different nonzero persisted chapter reward.

**When / mechanism:** The upload modal emits reward_coins but the upload route has no corresponding Form parameter. The vertical reader badge hardcodes five coins.

**Recommended change:** Support and validate the selected upload reward throughout the request/service contract, and render the persisted chapter reward in every reader badge. Preserve zero as addressed separately in B14.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/components/webtoons/ChapterUploadModal.vue:61](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterUploadModal.vue:61) · [backend/app/modules/webtoons/router.py:185](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/router.py:185) · [backend/app/modules/webtoons/service.py:395](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:395) · [admin/src/views/DashboardView.vue:315](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/DashboardView.vue:315) · [admin/src/views/WebtoonsView.vue:476](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonsView.vue:476) · [frontend/src/components/reader/ReaderNav.tsx:74](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/ReaderNav.tsx:74)

### A23 · P2 · Existing work genres cannot populate the edit form

**Impact:** An editor opens a categorized work and sees no selected genres because editable contracts provide names while the form expects IDs. Saving later can unintentionally lose genre assignments.

**When / mechanism:** WebtoonFormModal initializes from val.genre_ids; staff detail reuses a schema returning genre name strings.

**Recommended change:** Return stable genre IDs in editable staff data and initialize/validate existing selections from that contract. Genre refresh is covered in B26.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/components/webtoons/WebtoonFormModal.vue:285](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/WebtoonFormModal.vue:285) · [backend/app/modules/webtoons/schemas.py:64](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/schemas.py:64)

### A24 · P2 · Rejection workflows provide no useful feedback or revision instructions

**Impact:** Applicants/creators learn only that they were rejected; moderators cannot record what needs fixing, causing repeated support requests and resubmissions.

**When / mechanism:** Creator request review calls reviewRequest(id,status) with no feedback input, even though the API supports admin_feedback. requestsApi substitutes a generic rejection. Chapter moderation also sends only a status and has no rejection reason workflow.

**Recommended change:** Ask for actionable feedback in a rejection form, persist it, show it to the applicant/creator, and provide a revision/resubmission path.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/views/CreatorRequestsView.vue:165](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/CreatorRequestsView.vue:165) · [admin/src/api/requests.js:9](C:/Users/Jahongir/code/WebtoonHub/admin/src/api/requests.js:9) · [admin/src/api/moderation.js:14](C:/Users/Jahongir/code/WebtoonHub/admin/src/api/moderation.js:14) · [admin/src/views/ModerationView.vue:315](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ModerationView.vue:315)

### A25 · P2 · Concurrent admin permission toggles can erase a newer selection

**Impact:** Rapid permission toggles build full permission arrays from the same old state, so the last write can remove a permission just enabled.

**When / mechanism:** toggleRolePerm sends a complete permission_ids snapshot and does not serialize pending changes; two calls can both start from the same array.

**Recommended change:** Serialize permission mutations or use atomic add/remove endpoints with version checking; reconcile the persisted permission set before accepting the next change.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/views/RbacView.vue:351](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/RbacView.vue:351)

### A26 · P2 · New roles and staff accounts start with unsafe implicit permissions

**Impact:** A role administrator can accidentally give deletion rights or create a highly privileged staff account merely by accepting a default selection.

**When / mechanism:** A new role hard-codes permission_ids=[1,3] instead of starting empty or resolving named capabilities. New StaffUserModal sets role_id to roles.value[0]?.id; role listing is ordered by ID and bootstrap/seed create superadmin first. After editing then creating a user, the watcher can therefore select superadmin by default.

**Recommended change:** Start new roles with no permissions, require an explicit staff role or choose the lowest privilege documented role by stable code, and prominently confirm privileged grants.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/components/rbac/RoleFormModal.vue:147](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/rbac/RoleFormModal.vue:147) · [admin/src/components/rbac/StaffUserModal.vue:158](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/rbac/StaffUserModal.vue:158) · [backend/app/modules/staff/service.py:151](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/service.py:151) · [backend/scripts/bootstrap_admin.py:25](C:/Users/Jahongir/code/WebtoonHub/backend/scripts/bootstrap_admin.py:25)

### A27 · P2 · Economy transaction labels use names that do not match actual ledger types

**Impact:** Support staff see purchases, spins, registration bonuses, gifts, and adjustments labeled as a generic Reward, making balance investigations confusing.

**When / mechanism:** The UI recognizes chapter_reward/welcome_bonus/creator_reward, but the ledger uses chapter_read/register_bonus/shop_purchase/admin_adjustment/admin_gift/wheel_spin/wheel_reward. Unrecognized entries return Mukofot ('Reward').

**Recommended change:** Use the same transaction enum as the backend and provide distinct localized labels, signed amount styling, filters, and a neutral fallback.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/views/EconomyView.vue:547](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/EconomyView.vue:547) · [backend/app/modules/rewards/models.py:29](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/rewards/models.py:29) · [backend/app/modules/rewards/service.py:129](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/rewards/service.py:129) · [backend/app/modules/wheel/service.py:240](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/wheel/service.py:240)

### A29 · P2 · Illustrated novel chapters hide their novel text in the moderation inspector

**Impact:** Moderators reviewing a novel with optional illustrations see only images and can approve the chapter without reviewing its text.

**When / mechanism:** list_all_chapters_staff returns images but omits content_text. inspectChapter fetches detail only when content_text is absent AND the images array is empty. An illustrated novel has images, so detail fetch is skipped and the inspector renders it as an image-only comic, hiding the novel text.

**Recommended change:** Fetch the full chapter response when opening the inspector instead of inferring completeness from image presence; show both novel text and illustrations, with loading/errors before approval.

**Verification:** Source/API contract inspection; not a full end-to-end reproduction.

**Code:** [admin/src/views/ModerationView.vue:299](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ModerationView.vue:299) · [admin/src/views/ModerationView.vue:177](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ModerationView.vue:177) · [backend/app/modules/webtoons/service.py:684](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:684)

## API, security and platform

### B01 · P1 · Staff APIs expose password hashes

**Impact:** GET/POST /staff/users return raw StaffUser objects. Serialization includes hashed_password, creating offline password-cracking exposure.

**Recommended change:** Return explicit StaffUserResponse and use response_model everywhere.

**Verification:** Isolated runtime reproduction. Synthetic serialization included the hashed_password field; no real hashes printed.

**Code:** [backend/app/modules/staff/router.py:214](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:214) · [backend/app/modules/staff/router.py:227](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:227)

### B02 · P1 · Chapter editing bypasses moderation

**Impact:** PATCH chapter requires chapters:edit but permits status=published/rejected and editing published text without chapters:approve.

**Recommended change:** Require approval permission for publication changes; place edited published content back into review.

**Verification:** Isolated runtime reproduction. Synthetic pending chapter changed to published through the editing service.

**Code:** [backend/app/modules/webtoons/router.py:428](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/router.py:428) · [backend/app/modules/webtoons/service.py:635](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:635)

### B03 · P1 · Clan socket accepts wrong identity and kicked/revoked users

**Impact:** WebSocket validates only signed sub, omitting role, token type and active UserSession. Staff ID collision becomes reader impersonation; established sockets remain usable after removal/ban/expiry.

**Recommended change:** Share reader authentication, check active session/membership, and disconnect on kick/leave/ban/revocation.

**Verification:** Isolated runtime reproduction. Synthetic staff token was accepted as reader. Socket deleted its membership after connection and still saved one message.

**Code:** [backend/app/modules/clans/router.py:900](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:900) · [backend/app/modules/clans/router.py:943](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:943)

### B04 · P1 · Coin and inventory updates race

**Impact:** Unlocked balance read/check/assign operations allow overlapping purchases/rewards/spins to use stale balances. Clan XP and daily/free claims have similar races.

**Recommended change:** Use transaction row locks/atomic guarded updates, unique dated claim records, and idempotency keys.

**Verification:** Isolated runtime reproduction. Two sessions preloaded100 coins, purchased two60-coin items and ended with two owned items and40 coins.

**Code:** [backend/app/modules/shop/service.py:101](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/shop/service.py:101) · [backend/app/modules/shop/service.py:114](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/shop/service.py:114) · [backend/app/modules/rewards/service.py:37](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/rewards/service.py:37) · [backend/app/modules/wheel/service.py:211](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/wheel/service.py:211)

### B05 · P2 · Reading rewards can be claimed without reading

**Impact:** Reward POST verifies publication and duplicate claim only. No reading completion evidence, cooldown or advertised daily cap is enforced; clan XP can be farmed too.

**Recommended change:** Define server completion receipts and enforce actual limits, or correct product promises.

**Verification:** Isolated runtime reproduction. Synthetic user claimed a published chapter with no preceding reader request.

**Code:** [backend/app/modules/rewards/service.py:81](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/rewards/service.py:81) · [backend/app/modules/staff/router.py:369](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:369)

### B06 · P1 · Media uploads trust names/MIME and lack safe validation

**Impact:** Covers/pages/shop files are accepted without verified formats or app size limits. Failed image decode falls back to storing original bytes; user clan uploads accept unsanitized SVG. Static /content is proxied on reader/admin origins.

**Recommended change:** Decode/re-encode verified raster types, sanitize/reject active SVG, enforce upload limits and isolate untrusted media on a separate origin.

**Verification:** source confirmed; active-content exploitation not attempted

**Code:** [backend/app/modules/webtoons/service.py:316](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:316) · [backend/app/modules/webtoons/service.py:405](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:405) · [backend/app/core/storage.py:113](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/storage.py:113) · [backend/app/modules/clans/router.py:370](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:370) · [deploy/staging/nginx-public.conf:29](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/nginx-public.conf:29)

### B07 · P2 · Terminate other staff sessions always fails

**Impact:** UUID /auth/sessions/{id} shadows later /auth/sessions/other, making the security action return422.

**Recommended change:** Register static route first or use UUID path converter.

**Verification:** Isolated runtime reproduction. ASGI DELETE /api/v1/staff/auth/sessions/other returned422.

**Code:** [backend/app/modules/staff/router.py:86](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:86) · [backend/app/modules/staff/router.py:101](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:101)

### B08 · P2 · Personal wheel history always fails

**Impact:** /{wheel_id}/history shadows later /user/history, interpreting user as an integer and returning422.

**Recommended change:** Register personal-history route first.

**Verification:** Isolated runtime reproduction. ASGI GET /api/v1/wheels/user/history returned422.

**Code:** [backend/app/modules/wheel/router.py:69](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/wheel/router.py:69) · [backend/app/modules/wheel/router.py:84](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/wheel/router.py:84) · [frontend/src/api/wheel.ts:94](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/wheel.ts:94)

### B09 · P2 · Clan management crashes for non-superadmins

**Impact:** A list is passed to variadic require_any_permission. Every non-superadmin fails membership comparison, then error formatting raises TypeError500.

**Recommended change:** Pass permission strings as separate arguments.

**Verification:** Isolated runtime reproduction. Synthetic manager with users:manage received TypeError expected str instance, list found.

**Code:** [backend/app/modules/clans/staff_router.py:15](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/staff_router.py:15) · [backend/app/modules/staff/dependencies.py:108](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/dependencies.py:108)

### B10 · P1 · Remove friend can delete another friend

**Impact:** DELETE integer is friendship ID first then user ID; callers send user IDs. A collision deletes an unrelated relationship owned by that reader.

**Recommended change:** Use one explicit identifier contract or separate paths.

**Verification:** Isolated runtime reproduction. Removing user2 deleted friendship ID2 with user3, leaving user2.

**Code:** [backend/app/modules/friends/router.py:308](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/friends/router.py:308) · [frontend/src/pages/FriendsPage.tsx:125](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/FriendsPage.tsx:125) · [frontend/src/pages/PublicProfilePage.tsx:109](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/PublicProfilePage.tsx:109)

### B11 · P2 · Economy settings are not durable or fully implemented

**Impact:** Economy PATCH only mutates three process settings. Restart loses changes; workers can disagree. Creator/comment rewards and daily maximum are only echoed, not enforced, and GET restores defaults. DB-backed global settings also are not loaded at startup.

**Recommended change:** Use one typed persistent settings model; load and cache it consistently; implement or disable unsupported controls. Validate ranges.

**Verification:** source confirmed; overlaps admin economy workflow

**Code:** [backend/app/modules/staff/router.py:377](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:377) · [backend/app/modules/staff/router.py:384](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:384) · [backend/app/modules/staff/router.py:395](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:395) · [backend/app/modules/staff/service.py:398](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/service.py:398) · [backend/app/main.py:50](C:/Users/Jahongir/code/WebtoonHub/backend/app/main.py:50)

### B12 · P2 · Generic reader edits bypass coin permissions and ledger

**Impact:** users:manage can replace lightning_coins directly, without coins:adjust or a recorded reason/transaction. Wallet totals cannot be reconciled with history.

**Recommended change:** Remove wallet field from generic reader updates and use the adjustment service with coin permission.

**Verification:** source confirmed

**Code:** [backend/app/modules/staff/router.py:288](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:288) · [backend/app/modules/staff/service.py:354](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/service.py:354)

### B13 · P1 · Empty targeted gifts become gifts to all readers

**Impact:** all_active_users=false with target_user_ids=[] falls through to every active user. An incomplete targeting request triggers unintended mass distribution.

**Recommended change:** Reject empty targets when all_active_users is false; validate targeting modes.

**Verification:** Isolated runtime reproduction. False plus [] awarded all three synthetic active users.

**Code:** [backend/app/modules/rewards/service.py:279](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/rewards/service.py:279) · [backend/app/modules/rewards/service.py:283](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/rewards/service.py:283)

### B14 · P2 · Zero chapter rewards and wheel prices are treated as missing values

**Impact:** A chapter configured with zero reward still pays the default five coins. Staff editing and reader reward displays also replace zero with five; a wheel with zero cost is advertised as costing 100.

**Recommended change:** Fall back only on None/null/undefined throughout forms, API services and reader displays, preserving valid numeric zero. Add zero-value contract checks.

**Verification:** Isolated runtime reproduction. Synthetic reward_coins=0 chapter paid five coins. Wheel-price and form-display fragments were source-confirmed, not live transaction tested.

**Code:** [backend/app/modules/webtoons/schemas.py:134](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/schemas.py:134) · [backend/app/modules/rewards/service.py:114](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/rewards/service.py:114) · [frontend/src/pages/LuckyWheelPage.tsx:516](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:516) · [backend/app/modules/wheel/schemas.py:107](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/wheel/schemas.py:107) · [admin/src/components/webtoons/ChapterEditModal.vue:211](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterEditModal.vue:211) · [frontend/src/pages/ReaderPage.tsx:249](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:249)

### B15 · P2 · Ordinary duplicate registration can return500

**Impact:** OR email/username lookup uses scalar_one_or_none. One existing email plus another existing username yields two rows and crashes rather than showing409. Staff/genre creation reuse this pattern.

**Recommended change:** Use EXISTS/first or separate lookups and handle unique constraint violations.

**Verification:** Isolated runtime reproduction. Synthetic conflict raised MultipleResultsFound.

**Code:** [backend/app/modules/auth/service.py:55](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:55) · [backend/app/modules/auth/service.py:58](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:58) · [backend/app/modules/staff/service.py:288](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/service.py:288) · [backend/app/modules/webtoons/service.py:543](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:543)

### B16 · P2 · Deleting roles with multiple assigned staff returns500

**Impact:** Assignment safety check assumes one row; two staff raise MultipleResultsFound before the useful reassignment message.

**Recommended change:** Use a limited existence or count query.

**Verification:** Isolated runtime reproduction. Synthetic role with two staff raised MultipleResultsFound.

**Code:** [backend/app/modules/staff/service.py:473](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/service.py:473) · [backend/app/modules/staff/service.py:474](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/service.py:474)

### B17 · P2 · Chapter numbers can become duplicated or invalid

**Impact:** No compound unique constraint exists; creation only checks in application code, edit skips duplicate checks, and unrestricted floats are accepted. This produces ambiguous ordering/navigation.

**Recommended change:** Add unique work/number constraint, finite positive number validation and409 conflict handling.

**Verification:** source confirmed

**Code:** [backend/app/modules/webtoons/models.py:49](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/models.py:49) · [backend/app/modules/webtoons/service.py:376](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:376) · [backend/app/modules/webtoons/service.py:627](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:627) · [backend/app/modules/webtoons/schemas.py:134](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/schemas.py:134)

### B18 · P1 · Creators can upload into another creator's work

**Impact:** chapters:create accepts any existing webtoon_id. The service is not given actor identity and cannot enforce ownership; default creators have this permission.

**Recommended change:** Pass actor context and enforce ownership/editor assignments; reserve global operations for privileged staff.

**Verification:** source confirmed

**Code:** [backend/scripts/seed.py:140](C:/Users/Jahongir/code/WebtoonHub/backend/scripts/seed.py:140) · [backend/app/modules/webtoons/router.py:192](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/router.py:192) · [backend/app/modules/webtoons/service.py:364](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:364)

### B19 · P2 · Uploads report success for missing files

**Impact:** Local and MinIO write failures are swallowed, and upload_file always returns a local/content URL even if only MinIO succeeds. DB records can commit pointing to broken assets.

**Recommended change:** Require verified durable write and return its real URL; surface failure and cleanup abandoned uploads.

**Verification:** source confirmed

**Code:** [backend/app/core/storage.py:124](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/storage.py:124) · [backend/app/core/storage.py:126](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/storage.py:126) · [backend/app/core/storage.py:140](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/storage.py:140) · [backend/app/core/storage.py:144](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/storage.py:144)

### B20 · P2 · Deleted and replaced media is not cleaned up and remains directly accessible

**Impact:** Chapter/webtoon deletion removes DB rows only; old covers, avatars and rejected uploads remain in public_content. No service callers invoke delete_file, creating orphaned public content and growing disk use.

**Recommended change:** Quarantine pending/rejected media and delete/garbage-collect assets safely with DB lifecycle changes.

**Verification:** source confirmed

**Code:** [backend/app/modules/webtoons/service.py:532](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:532) · [backend/app/modules/webtoons/service.py:658](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:658) · [backend/app/core/storage.py:147](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/storage.py:147) · [backend/app/main.py:92](C:/Users/Jahongir/code/WebtoonHub/backend/app/main.py:92)

### B21 · P2 · Discovery APIs load entire novel chapter content

**Impact:** Catalog eager-loads every Chapter column for listed works just to find first/latest chapters. Detail returns full content_text for all published chapters, slowing mobile discovery and long chapter lists.

**Recommended change:** Query metadata/aggregate first-latest IDs and counts; paginate chapter lists; fetch text only in reader.

**Verification:** source confirmed

**Code:** [backend/app/modules/webtoons/service.py:60](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:60) · [backend/app/modules/webtoons/service.py:163](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:163) · [backend/app/modules/webtoons/service.py:199](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:199)

### B22 · P2 · Unpublished chapter comments remain readable

**Impact:** Public comment listing checks chapter existence only, omitting publication status. Withdrawn/rejected chapter discussion is accessible even though chapter reading is blocked.

**Recommended change:** Apply published status to public reads and separate authorized staff previews.

**Verification:** Isolated runtime reproduction. Synthetic rejected chapter returned its existing comment.

**Code:** [backend/app/modules/comments/service.py:23](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/comments/service.py:23) · [backend/app/modules/comments/router.py:135](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/comments/router.py:135)

### B23 · P2 · Public discussion/social lists do not scale

**Impact:** All roots and replies are fetched and returned at once. Popular discussions can stall the reader. Friends/clan member listings also do repeated asset/clan queries per user.

**Recommended change:** Paginate root comments, lazy-load replies and batch social assets/relations.

**Verification:** source confirmed

**Code:** [backend/app/modules/comments/service.py:29](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/comments/service.py:29) · [backend/app/modules/comments/service.py:39](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/comments/service.py:39) · [backend/app/modules/friends/router.py:86](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/friends/router.py:86) · [backend/app/modules/clans/router.py:781](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:781)

### B24 · P2 · Redis fallback memory cache grows without bound

**Impact:** Expired keys are removed only when rerequested and no capacity/TTL sweep exists. Unique catalog queries during Redis outage accumulate process memory, potentially taking the API down.

**Recommended change:** Use bounded TTL/LRU caching, periodic expiry and search length limits.

**Verification:** source confirmed; not stress-tested

**Code:** [backend/app/core/redis.py:13](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/redis.py:13) · [backend/app/core/redis.py:76](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/redis.py:76) · [backend/app/core/redis.py:100](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/redis.py:100) · [backend/app/modules/webtoons/service.py:52](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:52)

### B25 · P2 · Authenticated or TLS Redis URLs disable cache

**Impact:** The socket probe manually splits redis://host:port. A password URL fails int parsing and rediss is unrecognized; secured Redis silently becomes unavailable.

**Recommended change:** Use standard URL parsing or authenticated/TLS Redis ping with clear status.

**Verification:** source confirmed

**Code:** [backend/app/core/redis.py:27](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/redis.py:27) · [backend/app/core/redis.py:30](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/redis.py:30) · [backend/app/core/redis.py:37](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/redis.py:37)

### B26 · P2 · Genre changes do not refresh cached catalogs and staff choices

**Impact:** Genre update/delete invalidates genres:all only, so cached catalog cards and filters retain old/deleted names/slugs for five minutes. Staff genre options are loaded on mount; the catalog does not subscribe to GenreManageModal changed, so new/renamed options are unavailable until recreation.

**Recommended change:** Invalidate affected catalog keys on genre and association changes. Use a shared refreshed genre store and subscribe to successful edits.

**Verification:** source confirmed

**Code:** [backend/app/modules/webtoons/service.py:575](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:575) · [backend/app/modules/webtoons/service.py:587](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:587) · [backend/app/modules/webtoons/service.py:144](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:144) · [admin/src/views/WebtoonsView.vue:314](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/WebtoonsView.vue:314) · [admin/src/components/webtoons/GenreManageModal.vue:208](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/GenreManageModal.vue:208) · [admin/src/components/webtoons/WebtoonFormModal.vue:247](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/WebtoonFormModal.vue:247)

### B27 · P2 · Upload processing blocks its API worker event loop

**Impact:** Async upload handlers perform synchronous image conversion, local writes, socket probes and MinIO transfers. This blocks that worker event loop and can delay unrelated UI requests handled by it.

**Recommended change:** Use bounded worker pools/background processing, explicit timeouts and upload progress.

**Verification:** source confirmed

**Code:** [backend/app/modules/webtoons/service.py:408](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:408) · [backend/app/core/storage.py:101](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/storage.py:101) · [backend/app/core/storage.py:108](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/storage.py:108) · [backend/app/core/storage.py:133](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/storage.py:133)

### B28 · P2 · Password changes do not revoke compromised devices

**Impact:** Reader/staff password updates only replace hashes. Active sessions and reusable reader refresh tokens remain usable after changing the password.

**Recommended change:** Revoke other sessions on password changes and rotate refresh tokens with replay detection.

**Verification:** source confirmed

**Code:** [backend/app/modules/auth/service.py:361](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:361) · [backend/app/modules/auth/service.py:167](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:167) · [backend/app/modules/staff/service.py:516](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/service.py:516)

### B29 · P2 · Allowed long passwords silently lose suffixes

**Impact:** Schemas allow100 characters, but bcrypt inputs are truncated to72 UTF-8 bytes for hashing and verification. Different accepted passwords with the same prefix are equivalent.

**Recommended change:** Use a scheme without truncation or enforce/document a byte limit with migration.

**Verification:** Isolated runtime reproduction. Synthetic passwords differing after72 ASCII bytes verified identically.

**Code:** [backend/app/core/security.py:10](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/security.py:10) · [backend/app/core/security.py:18](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/security.py:18) · [backend/app/modules/auth/schemas.py:10](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/schemas.py:10)

### B30 · P2 · Session activity and expiry shown to users are misleading

**Impact:** HTTP session checks omit expires_at; lists include expired active rows. last_active_at updates only on reader refresh, never on staff/normal reader actions, so security screens show stale device activity. Separately, the local SQLite browser run displayed a newly created synthetic session as 5h ago because a UTC timestamp without an offset is parsed as local time. This timezone symptom was not verified against PostgreSQL.

**Recommended change:** Enforce expiry, archive expired rows and update activity with throttled authenticated use. Serialize all timestamps with an explicit UTC offset and verify local/production adapters.

**Verification:** source confirmed

**Code:** [backend/app/modules/auth/dependencies.py:47](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/dependencies.py:47) · [backend/app/modules/staff/dependencies.py:47](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/dependencies.py:47) · [backend/app/modules/auth/service.py:188](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:188) · [backend/app/modules/auth/service.py:279](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:279) · [backend/app/modules/staff/service.py:231](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/service.py:231) · [frontend/src/utils/date.ts:1](C:/Users/Jahongir/code/WebtoonHub/frontend/src/utils/date.ts:1) · [backend/app/modules/users/models.py:46](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/users/models.py:46)

### B31 · P2 · Creator reader and studio credentials drift apart

**Impact:** Creator approval copies reader password into separate StaffUser. Reader password/username changes are not synchronized; studio credentials and account blocking diverge.

**Recommended change:** Use shared identity or explicitly linked synchronized credentials and controls.

**Verification:** source confirmed

**Code:** [backend/app/modules/creator_requests/service.py:126](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/creator_requests/service.py:126) · [backend/app/modules/auth/service.py:348](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:348) · [backend/app/modules/auth/service.py:361](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:361)

### B32 · P2 · Deployment readiness checks only HTTP liveness

**Impact:** Health always returns healthy without DB/schema/storage checks; Docker and release validation can pass an unusable deployment.

**Recommended change:** Add readiness checks for essential DB and media.

**Verification:** source confirmed

**Code:** [backend/app/main.py:170](C:/Users/Jahongir/code/WebtoonHub/backend/app/main.py:170) · [backend/app/main.py:175](C:/Users/Jahongir/code/WebtoonHub/backend/app/main.py:175) · [deploy/staging/compose.yml:62](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/compose.yml:62) · [deploy/staging/deploy-release.sh:60](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/deploy-release.sh:60)

### B33 · P2 · Registration waits for SMTP after creating account

**Impact:** Signup awaits SMTP after DB commit despite a non-blocking comment. Slow email delays or times out registration; retry appears duplicate.

**Recommended change:** Queue welcome mail, return promptly, and bound retries/timeouts.

**Verification:** source confirmed

**Code:** [backend/app/modules/auth/service.py:84](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:84) · [backend/app/modules/auth/service.py:87](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:87) · [backend/app/core/mailer.py:26](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/mailer.py:26)

### B34 · P2 · Fresh deployments cannot approve creators

**Impact:** Documented staging bootstrap creates only superadmin and prohibits demo seed. Approval needs role named creator, missing from production bootstrap/migration, and returns 500 until manually configured.

**Recommended change:** Provision required system roles/permissions idempotently without demo data.

**Verification:** source confirmed

**Code:** [backend/scripts/bootstrap_admin.py:25](C:/Users/Jahongir/code/WebtoonHub/backend/scripts/bootstrap_admin.py:25) · [backend/app/modules/creator_requests/service.py:110](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/creator_requests/service.py:110) · [deploy/staging/README.md:31](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/README.md:31)

### B35 · P2 · Auth and social writes have no abuse throttling

**Impact:** Login, signup, comments, requests and chat have no app rate limiting or Nginx limit_req. Guessing/spam and repeated bcrypt/DB load harm legitimate users.

**Recommended change:** Add per-account/IP auth limits and social write limits with retry timing.

**Verification:** source confirmed; abuse traffic not sent

**Code:** [backend/app/modules/auth/router.py:23](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/router.py:23) · [backend/app/modules/auth/router.py:39](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/router.py:39) · [backend/app/modules/staff/router.py:31](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/router.py:31) · [backend/app/modules/clans/router.py:931](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/router.py:931) · [deploy/staging/nginx-public.conf:16](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/nginx-public.conf:16)

### B36 · P2 · Business flows lack automated regression coverage

**Type:** Engineering coverage gap.

**Impact:** CI builds both frontends and checks migrations, but the backend suite contains only three deployment-settings tests. No automated reader/admin journey tests protect the contracts, permissions, wallet races or socket behavior identified here.

**Recommended change:** Add contract and negative-permission tests first, then end-to-end read/resume/upload/moderate flows and PostgreSQL concurrency tests; keep configuration/migration checks.

**Verification:** Source-confirmed; production incident not reproduced

**Code:** [.github/workflows/ci.yml:22](C:/Users/Jahongir/code/WebtoonHub/.github/workflows/ci.yml:22) · [.github/workflows/ci.yml:46](C:/Users/Jahongir/code/WebtoonHub/.github/workflows/ci.yml:46) · [backend/tests/test_deployment_config.py:8](C:/Users/Jahongir/code/WebtoonHub/backend/tests/test_deployment_config.py:8) · [frontend/package.json:6](C:/Users/Jahongir/code/WebtoonHub/frontend/package.json:6) · [admin/package.json:6](C:/Users/Jahongir/code/WebtoonHub/admin/package.json:6)

### B37 · P2 · Release rollback does not restore a migrated database schema

**Impact:** Release makes a backup and can migrate at API startup, but the rollback function restores only previous application images. After an incompatible migration, those images can still fail against the new schema.

**Recommended change:** Use backward-compatible staged migrations and document/test restore or roll-forward procedures; verify rollback against a disposable migrated database.

**Verification:** Source-confirmed; production incident not reproduced

**Code:** [deploy/staging/deploy-release.sh:17](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/deploy-release.sh:17) · [deploy/staging/deploy-release.sh:23](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/deploy-release.sh:23)

### B38 · P2 · The repository backup job keeps copies on the same VPS

**Impact:** The documented backup job stores DB and media archives under the live stack directory and deletes copies older than seven days. A host/disk loss can remove both service and these backups; any external backup arrangement is outside this audit.

**Recommended change:** Copy encrypted backups to independent storage, choose an explicit retention policy, and regularly prove database-plus-media restoration.

**Verification:** Source-confirmed; production incident not reproduced

**Code:** [deploy/staging/backup.sh:4](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/backup.sh:4) · [deploy/staging/backup.sh:11](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/backup.sh:11) · [deploy/staging/backup.sh:15](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/backup.sh:15)

## Counting and consolidation notes

Shared findings R13, R15, R16, R18 and R29 incorporate repeated reader/staff error states, accessibility, dialogs, localization and logout issues. R13 also incorporates wheel unavailable states and friend-search no-result feedback. SE02 includes the admin zero clan fee display; B14 groups zero chapter rewards and wheel-price display. A22 retains the independently ignored upload reward and hardcoded reader badge. A23 covers missing editable genre IDs, while B26 covers stale genre options/cache. Search races are grouped in SE21, admin permission lost updates in A25, and wheel-selection/history races in SE07. These are separate from server transaction races B04.

## Remaining validation and scaling constraints

Production-specific validation should cover PostgreSQL concurrency/migrations, Redis authentication/TLS and outages, media write failures, SMTP delays, browser refresh/logout across tabs, and slow/unstable mobile networks. The local five-hour session timestamp symptom in B30 is specifically a SQLite/naive timestamp observation; it is not established for deployed PostgreSQL.

Clan live-connection fanout is process-local. Adding API workers or instances requires shared event distribution; this is an architectural scaling constraint rather than an additional counted current deployment failure. Backend requirements use minimum-version ranges, so a future clean installation can differ from the audited environment; reproducible dependency resolution also deserves attention.

These findings describe the checked repository and local behavior on the audit date. Actual audience retention, perceived simplicity and production response times require measurements with users and the deployed service.
