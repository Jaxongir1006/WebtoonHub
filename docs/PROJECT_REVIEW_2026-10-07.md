# WebtoonHub current project review

Implementation follow-up: [October review fixes and verification](PROJECT_REVIEW_FIXES_2026-10-07.md).

Reviewed 7 October 2026 against the current working tree, including the uncommitted fixes, chapter imports and collectible cards. This review supplements [PROJECT_AUDIT.md](C:/Users/Jahongir/code/WebtoonHub/PROJECT_AUDIT.md) and [FIX_STATUS.md](C:/Users/Jahongir/code/WebtoonHub/FIX_STATUS.md); their historical findings and status claims should not be read as verification of the current release.

WebtoonHub has a usable product foundation and substantial feature coverage. The highest-value improvement is making complete journeys trustworthy: a creator's revision must respect moderation, a purchase must charge the displayed price, a save must belong to the initiating account, and reading controls must preserve access to content. Several individual components work correctly while the client, server, persistence and permission rules disagree at their boundaries.

This review records **29 actionable findings: four P1 findings and 25 P2 findings**, including reproduced defects, source-confirmed mismatches, conditional concurrency/recovery risks and a testing gap. Product and architecture opportunities appear separately. P1 means fix first because an authorization boundary, account ownership or explicit spending intent can be violated. P2 means a significant workflow, UX, accessibility, correctness or operational weakness. Coins here are the platform's free virtual currency.

## Product and architecture

| Part | What it owns | Current assessment |
|---|---|---|
| Reader frontend | React 18, TypeScript, Vite and Tailwind; discovery, detail pages, three reading formats, library/resume, profiles, friends, clans, shop, cards and wheels | Consistent identity, lazy routes, translations and useful recovery components. State and dependent mutations are handled separately on large screens, which makes edge cases inconsistent. |
| Creator and admin studio | Vue 3, Pinia, Vue Router and Tailwind; content/imports, moderation, users/sessions, roles, economy, shop, clans and wheels | Broad workflows and improved draft handling. Strict server schemas expose remaining serializer mismatches; action locking and dirty-state tracking need shared semantics. |
| Backend | FastAPI modular monolith, SQLAlchemy and Pydantic; authentication, RBAC, publishing, rewards, social data and media | Domain separation is sensible. Wallet row locking, session checks, media validation and protected unpublished assets are useful foundations. Some ownership and publication policies still depend on mutable fields or individual endpoints. |
| Database and media | SQLite for local development; PostgreSQL in deployment; Redis cache/limits; canonical local content and private import stages | Fresh migrations match models. The implemented storage path writes local volumes; MinIO settings and bucket terminology do not mean the application currently stores media in MinIO. |
| Deployment | Docker Compose, Nginx, GitHub Actions, release scripts and scheduled backups | Database, media and private import stages are included in backups. Independent recovery, overlapping backup ownership and configuration rollout still need attention. |

The main product loop is **discover a readable series → read a chapter → return to a saved position → follow future chapters**. Rewards, collections and community should reinforce that loop. The creator loop is **prepare content → upload and revise → review → publish → maintain published content**; revision rules are currently its weakest boundary.

## Verification and limits

| Check performed in this review | Result |
|---|---|
| Reader regression suite | 69 tests passed |
| Studio regression suites | 135 general checks, 52 import checks and 77 card checks passed, 264 total |
| Backend unittest discovery | 66 tests passed on isolated SQLite fixtures |
| Reader and studio production builds | Both passed, including reader TypeScript compilation |
| Fresh SQLite Alembic upgrade and schema check | Upgraded through c63ea14d2910; no new upgrade operations detected |
| Browser checks | Desktop home and narrow mobile navigation/catalog/detail/novel/manga flows; 320×650, 320×360 and 375×600 viewports; studio login entry |
| Targeted defect reproductions | Disposable API fixtures and extracted actual React/Vue handlers; evidence is stated beside each finding |

Browser API checks used a SQLite backup in the temporary directory. Existing database content and media were preserved. The only project source addition from this review is this document; builds also regenerated ignored output. No deployment or production writes occurred. PostgreSQL/multiple-worker behavior, live SMTP, load, a complete authenticated studio walkthrough and real offsite recovery were not exercised in this review. Existing test success is useful evidence of their covered behavior, not proof that these findings are absent.

## Fix first

### 1 Creator role renaming changes ownership authorization

**P1 · API reproduced.** Content ownership checks use the editable role name `creator`. An admin renamed that role to `author`; the same creator token and unchanged permissions then changed another creator's chapter. Before the rename the request returned 403; afterward it returned 200. A normal display-name edit silently changes the authorization boundary.

Use an immutable system-role identity or an explicit content scope, and protect reserved role identities. Acceptance: changing a role's label never expands content ownership, and creator restrictions are enforced on listing, detail, edit, upload and media access.

Sources: [ownership check](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:803), [role update](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/staff/service.py:441), [staff catalog scope](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/router.py:180).

### 2 Published content can change without another moderation pass

**P1 · API reproduced for text; image paths source-confirmed.** Approval permission is checked when a request explicitly sets the publication status. A creator can omit status, replace text or alter pages, and retain the published status. The studio deliberately omits status for staff without approval permission. A creator's replacement text became immediately readable anonymously. Appending images has the same policy gap.

Create a pending revision for nonapprover changes to published content, ideally preserving the last approved version until review. Apply the policy to every content mutation. Acceptance: nonapprovers cannot change publicly visible content without a review decision. The original B02 fix is incomplete.

Sources: [chapter endpoint](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/router.py:442), [update service](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:701), [append service](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:831), [studio payload](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterEditModal.vue:262).

### 3 A stale shop price can charge more coins than shown

**P1 conditional · API reproduced.** Buying sends only an item ID, while the service charges the current database price. A listing showed 100 coins, staff changed the price to 500, and the purchase charged 500, reducing a 1,000-coin wallet to 500. The UI does not display the receipt's `price_paid`. Wheel and clan actions already have cost-intent checks; the shop needs equivalent protection.

Submit an expected price or quote version, return 409 before deduction when it changed, and show the acknowledged receipt. Acceptance: a price change cannot increase the amount spent without a refreshed explicit purchase.

Sources: [reader purchase request](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/shop.ts:32), [purchase UI](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ShopPage.tsx:69), [wallet deduction](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/shop/service.py:120).

### 4 An old profile save can write into a new account

**P1 conditional · Actual handler reproduced with deferred requests.** Profile Save first changes username/password, then captures the current identity before sending bio. If account A changes to B during the first request, the second request sends A's bio draft with B's token. Executing the actual handler recorded the first write under account 101 and the bio write under account 202.

Capture the initiating identity before any asynchronous work and check it before every dependent request. Prefer one atomic ordinary-profile operation and a separate password operation. Acceptance: account switches cancel all remaining work from the original save; an old draft never changes the new account.

Sources: [first profile write](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:257), [late identity capture](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:263), [request token assignment](C:/Users/Jahongir/code/WebtoonHub/frontend/src/api/client.ts:39).

## Reader and account experience

### 5 Illustrated novels disagree with rendering and progress rules

**P2 · API reproduced and source-confirmed.** Uploads accept text with optional illustrations and return both, but NovelReader renders only text. Progress validates the text page index against illustration count whenever any image exists. A novel with one illustration returned 422 when saving text page index 1. Later text pages cannot reliably save resume/completion state.

Define a mixed-content novel contract with illustration placement and stable text anchors; validate positions according to format. Acceptance: a long novel with one illustration renders it and saves every text page, including completion.

Sources: [reader dispatch](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ReaderPage.tsx:191), [novel rendering](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:177), [progress bound](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/library/progress.py:95).

### 6 Novel settings can open above the visible screen

**P2 · Browser reproduced at 320×650.** Opening settings changed scrollY from 13 to 293. The expanded panel occupied y=-224 to 56 beneath the sticky header, so the screen still showed the article. Inserting the panel before the article triggers scroll anchoring; the layout effect skips corrective behavior when settings are open.

Use a positioned accessible popover/dialog or explicitly bring the panel and focus into view. Acceptance: opening settings from the top or middle of a page exposes every control on short and narrow screens.

Sources: [layout effect](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:66), [open button](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:139), [panel placement](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:145).

![Novel settings are expanded but their panel is above the visible reading area.](C:/Users/Jahongir/.codex/visualizations/2026/10/07/01a1169c-5df8-7cc1-9389-e63e207e442d/project-review/novel-settings-hidden.jpg)

### 7 Manga turns can skip the beginning of the next page

**P2 · Browser reproduced at 320×360 in fit-width mode.** Scrolling page 1 to scrollY=252 placed its image top at -140. Selecting fixed Next changed to page 2 while retaining both values. Scroll reset only depends on chapter changes, so the next page begins partway down.

Reset the reading surface when the page changes, allowing for the toolbar. Acceptance: Next, Previous, slider, keyboard and swipe changes reveal the start of the destination image.

Sources: [chapter-only reset](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:67), [page navigation](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:88).

![Page 2 after a page turn retains the previous scroll offset and its top is hidden.](C:/Users/Jahongir/.codex/visualizations/2026/10/07/01a1169c-5df8-7cc1-9389-e63e207e442d/project-review/manga-page-start.jpg)

### 8 A manga pinch can trigger a page turn

**P2 · Actual gesture handlers reproduced.** Adding a second finger returns from touch-start without clearing the first gesture. Touch-end does not check remaining fingers or the originating touch ID. A simulated first finger, second finger and horizontal release called Next once. The prior R07 claim that multiple touches cancel is incomplete.

Reuse the novel gesture safeguards: cancel on multiple touches, track one identifier, and respect scrolling and zooming. Acceptance: pinch, diagonal scroll and finger replacement never navigate.

Sources: [touch start](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:143), [touch end](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/MangaReader.tsx:149).

### 9 A malformed saved anchor can repeatedly crash a reader

**P2 conditional · Storage/consumer reproduction.** Saved-position parsing validates work and chapter IDs but not the remaining fields. A record with integer IDs and numeric `anchor: 42` is accepted, then NovelReader calls `.match()` on it. Retrying loads the same invalid record.

Validate the complete persisted shape, bounds and format, discard invalid records and fall back to a safe position. Acceptance: malformed anchor, page index, completion and progress values never prevent reading.

Sources: [storage parser](C:/Users/Jahongir/code/WebtoonHub/frontend/src/utils/readingStorage.ts:7), [anchor consumer](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/reader/NovelReader.tsx:40).

### 10 Password and bio changes cannot complete in one Save

**P2 · Source-confirmed dependent-request failure.** The password operation commits and revokes all sessions. The next bio request therefore receives 401. Password-only saves also refresh a revoked session and replace success feedback with the login gate. The user cannot tell which fields saved.

Separate password changes, show a successful change and explicit sign-in-again state, and save ordinary profile fields atomically. Acceptance: bio cannot be silently left behind a successful password update.

Sources: [sequential profile writes](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:257), [bio write](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ProfilePage.tsx:264), [session revocation](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/auth/service.py:374).

### 11 Comments accept drafts longer than the server permits

**P2 · Source-confirmed contract mismatch.** Root comments and replies allow 2,000 characters; the server caps content at 500. Drafts of 501–2,000 characters can be submitted and rejected with 422, with limited field-specific explanation in EN/RU.

Share the limit, show a counter and retain actionable validation errors. Acceptance: each locale explains the 500-character limit before submission.

Sources: [comment input](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/comments/ChapterComments.tsx:78), [reply input](C:/Users/Jahongir/code/WebtoonHub/frontend/src/components/comments/CommentItem.tsx:133), [server limit](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/comments/schemas.py:32).

### 12 Cosmetic and wheel success feedback can switch language

**P2 · Source-confirmed.** Cosmetic purchase/equip/unequip prefer backend message strings over client translations, and wheel results show backend text. EN/RU journeys can produce Uzbek success messages. Card purchases already use the localized pattern.

Translate machine-readable outcome codes on the client. Acceptance: success, failure and receipts remain in the selected locale throughout shop, inventory and wheel flows.

Sources: [shop feedback](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ShopPage.tsx:75), [equip feedback](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ShopPage.tsx:92), [wheel result](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:791).

### 13 Wheel motion ignores the reduced-motion preference

**P2 · Source-confirmed accessibility gap.** Spins always wait for a five-second rotation and generate confetti. The reduced-motion CSS covers novel transitions, while the wheel has no equivalent result path.

Use a shared motion preference and show the same server result immediately with a restrained state change. Acceptance: reduced-motion users can spin and inspect results without forced rotation or confetti.

Sources: [wheel completion timer](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:259), [confetti](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/LuckyWheelPage.tsx:270), [motion CSS](C:/Users/Jahongir/code/WebtoonHub/frontend/src/index.css:30).

## Studio and publishing workflows

### 14 Normal shop-item edits are rejected by the server

**P2 · Isolated schema reproduced.** Every edit submits `id`; frame/background edits also submit `border_style`. The wrapper forwards them unchanged, but the strict update schema defines neither. Card edits reject `id`; cosmetic edits reject both with `extra_forbidden`. Creation also ignores the preset field, so its control does not reliably persist.

Serialize only defined server fields and either implement or remove the cosmetic preset contract. Acceptance: editing a card, frame and background through the actual studio persists on refresh without 422.

Sources: [modal payload](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/shop/ShopItemModal.vue:327), [forwarding save](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ShopView.vue:279), [strict schema](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/shop/schemas.py:54).

### 15 A competing rejection can silently disappear

**P2 · Actual Vue/adapter reproduction.** While chapter A's approval is pending, chapter B's controls remain enabled. B's rejection dialog submits, but the global guard returns without a request and the dialog treats this as success. Only A's status PATCH occurred; B's dialog closed without an error. Creator requests use the same pattern.

Disable all competing actions for a global lock or maintain locks per record; skipped work must return a failure, not successful completion. Acceptance: a second action is visibly blocked, queued or independently completed and never disappears.

Sources: [row disabling](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ModerationView.vue:107), [global guard](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/ModerationView.vue:312), [dialog completion](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/common/RejectionModal.vue:28), [creator review](C:/Users/Jahongir/code/WebtoonHub/admin/src/views/CreatorRequestsView.vue:173).

### 16 Draft warnings miss changes made through buttons

**P2 · Source and isolated mechanism reproduced.** The shared modal tracks input/change/drop events. Reordering/deleting chapter pages, selecting genres or choosing presets changes reactive state through clicks, so closing can discard a modified draft without warning.

Compare a draft with its initial snapshot or explicitly report every mutation. Acceptance: changing any persisted field or page order causes a discard warning; an unchanged form closes directly.

Sources: [dirty-event tracking](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/common/Modal.vue:17), [page reorder](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/ChapterEditModal.vue:223), [genre choice](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/webtoons/WebtoonFormModal.vue:123).

### 17 Chapter Save can commit partly and still report failure

**P2 · Source-confirmed transaction boundary.** The studio PATCHes metadata/text, then uploads new images. If the second request fails, the first is already committed while the dialog reports Save failed. A retry also needs reconciliation when the image request's outcome is unknown.

Stage a complete revision and commit it once, or use one atomic edit API. Acceptance: failed Save leaves the existing chapter intact or clearly reports the committed subset with a safe recovery action.

Sources: [sequential edit requests](C:/Users/Jahongir/code/WebtoonHub/admin/src/api/webtoons.js:61), [image operation](C:/Users/Jahongir/code/WebtoonHub/admin/src/api/webtoons.js:68).

### 18 Updates can leave an empty chapter published

**P2 · Empty novel API reproduced; comic path source-confirmed.** Upload validates required content, but edit/publication paths do not validate the resulting chapter. Clearing published novel text returned 200, then the public API returned empty content. An empty image-ID list can remove every comic page.

Enforce format invariants at edit and publication boundaries. Acceptance: published novels have text and published comics have pages; invalid updates preserve the approved version.

Sources: [upload invariant](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:411), [text/image update](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:704), [moderation](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:486).

### 19 Studio capabilities disagree with API permissions

**P2 · Source-confirmed contracts.** A shop-only manager can create a character card but its series selector calls a publishing-protected endpoint and receives 403. The Wheel route requires `wheel:manage`, while the API also permits `settings:manage` or `shop:manage`.

Define the intended capability matrix once, provide a narrow series lookup for shop managers and verify restricted roles end to end. Acceptance: each visible workflow is usable with its advertised permissions, and hidden workflows match server policy.

Sources: [series lookup](C:/Users/Jahongir/code/WebtoonHub/admin/src/components/shop/ShopItemModal.vue:348), [publishing gate](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/router.py:152), [studio wheel gate](C:/Users/Jahongir/code/WebtoonHub/admin/src/router/index.js:70), [API wheel gate](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/wheel/router.py:109).

## Social and virtual economy integrity

### 20 Crossed friend requests can break later friendship operations

**P2 · Deterministic concurrent reproduction.** A→B and B→A can both pass the bidirectional existence check. The database allows both because its uniqueness rule is directional. Both requests succeeded in a disposable fixture; removal then raised `MultipleResultsFound`.

Store a canonical unordered pair, constrain it in the database and handle crossed requests atomically. Acceptance: concurrent crossed requests produce one relationship and every status/removal lookup remains valid.

Sources: [directional uniqueness](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/friends/models.py:18), [existence check](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/friends/router.py:197), [removal lookup](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/friends/router.py:321).

### 21 Multiple workers can equip conflicting cosmetics

**P2 conditional · Mechanism and separate-session simulation; no live PostgreSQL reproduction.** Equip uses an in-process lock without locking the user row. Different processes can activate two frames of the same type, and the database has no exclusivity rule. A simulation with the local lock bypassed produced two active frames.

Use the shared user row lock before reading/changing equipment and add an appropriate invariant where practical. Acceptance: simultaneous equips through separate workers leave exactly one active cosmetic per type.

Sources: [equip locking](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/shop/service.py:149), [active-state change](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/shop/service.py:171), [inventory model](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/shop/models.py:43).

### 22 Coin-changing retries have no durable operation identity

**P2 conditional · Duplicate execution reproduced; lost-response incident not reproduced.** Paid spins, staff adjustments and distributions have no idempotency key. Two identical 50-coin paid-spin requests created different receipts and deducted 50 twice. Two deliberate spins are valid; the problem is that a committed operation with a lost response cannot be distinguished from an unexecuted operation when retried. The UI permits retry after transport errors.

Persist an operation key and payload hash, returning the same receipt for a retry. Acceptance: one user intent applies once despite response loss; a new intentional operation uses a new key.

Sources: [spin execution](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/wheel/service.py:188), [coin adjustment](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/rewards/service.py:258), [bulk distribution](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/rewards/service.py:300), [staff timeout](C:/Users/Jahongir/code/WebtoonHub/admin/src/api/client.js:11).

### 23 Reconnection can leave an inaccessible chat-history gap

**P2 conditional · Source-confirmed cursor behavior.** Reconnect merges the latest 50 messages into an older loaded window. If 100 arrive while offline, the middle 50 are missing. Load Older uses the oldest ID across the entire merged array, so it requests older history rather than the missing middle.

Paginate catch-up after the highest known ID, or replace the window with contiguous history and a valid older cursor. Acceptance: disconnect during more than 50 messages, reconnect, and retrieve every intervening message once.

Sources: [latest-window catch-up](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:134), [older cursor](C:/Users/Jahongir/code/WebtoonHub/frontend/src/pages/ClanDetailPage.tsx:184).

### 24 Live clan rooms split when the API has multiple workers

**P2 conditional · Source-confirmed architecture.** Connections and broadcasts live in one process. Users routed to another process do not receive its live events, although persisted history remains available. This is a deployment constraint, not evidence that the current single-worker staging room is broken.

Add shared pub/sub before enabling multiple workers/hosts. Acceptance: users connected to different processes receive the same persisted event, with deduplication after reconnect.

Source: [connection manager](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/clans/connection_manager.py:17).

## Discovery and operations

### 25 Recent updates uses upload time instead of publication time

**P2 · Source-confirmed.** Sorting takes the latest published chapter's creation date, but approval records no publication timestamp. A chapter uploaded long ago and approved today can remain buried in Recently updated.

Record publication time and define how published revisions affect the shelf. Acceptance: approving an old pending chapter places the work according to its newly published update.

Sources: [sort query](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:105), [publication change](C:/Users/Jahongir/code/WebtoonHub/backend/app/modules/webtoons/service.py:486).

### 26 New expensive upload routes bypass the intended throttle

**P2 · Source-confirmed policy mismatch.** The upload-rate policy matches older path patterns but not `/staff/chapter-imports/...` or `/staff/shop/items/upload-asset`. Authentication and file/content limits remain in place, but these operations miss the intended request throttle.

Assign endpoint-specific rate policies that allow legitimate resumable batches while bounding abusive upload/finalize work. Acceptance: both new workflows have explicit tested policies and truthful Retry-After behavior.

Source: [rate-limit path policy](C:/Users/Jahongir/code/WebtoonHub/backend/app/core/rate_limit.py:11).

### 27 Overlapping backups can resume writes during another snapshot

**P2 conditional · Source-confirmed; real Docker overlap not exercised.** Scheduled and deployment backups do not share a backup-owned mutex. The script marks `api_paused=1` before pause succeeds. A competing run can fail and have its cleanup unpause the API while the first captures database/media/imports. Same-second runs also share names.

Acquire a shared lock inside the backup script, assign unique names and record pause ownership only after successful pause. Acceptance: simultaneous timer/release backups cannot overlap their snapshot window or unpause each other's API.

Sources: [cleanup ownership](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/backup.sh:19), [pause ordering](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/backup.sh:35), [deployment lock](C:/Users/Jahongir/code/WebtoonHub/deploy/staging/deploy-release.sh:18).

### 28 The document-first API references have drifted

**P2 · Source-confirmed.** The staff reader-update document still advertises direct coin editing that the current server forbids. Economy settings document unsupported creator/comment rewards and older permissions. Newer progress and chapter requirements are not consistently reflected in endpoint documents.

Reconcile canonical docs with executable schemas and add small contract checks for published examples. Acceptance: a documented request either works with the documented role or accurately describes the rejection.

Sources: [reader-update example](C:/Users/Jahongir/code/WebtoonHub/backend/docs/modules/staff_rbac/api/update_reader.md:26), [economy example](C:/Users/Jahongir/code/WebtoonHub/backend/docs/modules/staff_rbac/api/economy_settings.md:43).

### 29 Passing suites miss actual browser and API integration

**P2 · Confirmed coverage gap.** Current frontend/studio tests provide useful isolated behavior checks. Mocked requests and custom component renderers do not connect actual studio payloads to strict server schemas or exercise browser scroll anchoring. That is why normal shop edits and hidden novel settings coexist with passing suites.

Add a small end-to-end suite against a disposable API/database: shop edit for all item types, restricted-role card association, creator revisions, overlapping moderation, account changes during Save, mobile settings/page turns and chat catch-up. Preserve focused unit tests instead of replacing them.

Sources: [studio regression harness](C:/Users/Jahongir/code/WebtoonHub/admin/scripts/regression.mjs:44), [reader regression harness](C:/Users/Jahongir/code/WebtoonHub/frontend/tests/helpers.mjs), [CI](C:/Users/Jahongir/code/WebtoonHub/.github/workflows/ci.yml).

## Product and architecture improvements

These are opportunities, not additional reproduced bugs.

1. **Make following a series more useful.** Add updates to followed works, unread-chapter indicators and a clear distinction between original-series completion and the chapters available on WebtoonHub. Current sample data shows Completed works with one available chapter. Also distinguish intentional Coming soon titles from readable releases when choosing the home hero. Include content QA that checks cover/page identity and language against each series and chapter; the sampled manga pages contain English text while the interface's content notice says chapters are available in Uzbek.
2. **Keep mobile discovery compact.** A 320-pixel home view can be dominated by resume cards and a tall hero. Test a shorter featured treatment, compact resume row and earlier readable catalog. Preserve the current visual identity and validate discovery/start-reading outcomes before a broader redesign.
3. **Centralize contracts and account-scoped state.** Generate client DTOs/validation constants from Pydantic/OpenAPI internally, even if public Swagger stays disabled. Share account identity guards, pending-operation semantics and field-error translation. Separate password/security tasks from ordinary profile editing; split large profile/clan/wheel screens by journey.
4. **Bound growing lists and metadata work.** Catalog queries still load every chapter's metadata for each work. Staff creator/RBAC/shop/clan lists can fetch whole datasets. Use aggregate counts/first/latest chapter queries and server pagination or search where growth makes it useful. Benchmark representative catalogs and uploads before claiming performance wins; hero covers currently use shared lazy loading and lack responsive image variants.
5. **Measure product reliability and define economy expectations.** Track reading starts, successful resumes, chapter transitions, retry failures and publishing turnaround with appropriate data minimization. A client-reported 95% after ten seconds is a deterrent rather than proof someone read. Keep the daily cap and explain the reward model accurately before adding stronger anti-farming behavior.

## Release work that remains operational

The earlier partial findings about historical orphan media, incompatible-schema rollback and independent offsite recovery remain operational follow-ups. Review cleanup candidates against backups; rehearse an incompatible migration recovery; configure and restore an independent encrypted backup destination. Image rollback alone does not restore a database schema or preserve later writes.

Private import stages are correctly mounted and included in archive/checksum/offsite/restore paths. They should not be reported as a missing backup volume. Deployment images also do not automatically install host Compose, backup, gateway or Nginx changes, so version and verify those configurations separately. Real SMTP is required for public account recovery; staging Mailpit captures mail locally. Shared media and chat transport are prerequisites for multiple API hosts.

## Recommended delivery order

| Milestone | Scope | Acceptance evidence |
|---|---|---|
| 1 Authorization and truthful writes | Findings 1–4 and 14; role scope, reviewed revisions, shop quotes, account ownership and studio serializers | Negative authorization tests; stale-price rejection; account-switch save test; actual API-backed edit for card/frame/background |
| 2 Core reading and account UX | Findings 5–13 and 18; mixed novels, settings, page reset, gestures, safe resume data, password flow, comment limits, language and motion | Narrow/short mobile browser checks; illustrated-novel resume/completion; corrupt-storage recovery; each locale completes the journey |
| 3 Publishing and community reliability | Findings 15–17, 19–24; action locks, draft semantics, atomic saves, permissions, friendship/equipment constraints, idempotency and chat recovery | Pending/failing request tests; separate-worker constraints; disconnected chat catches every missing message |
| 4 Release and scale | Findings 25–29 plus operational follow-ups and selected product opportunities | Publication-date ordering; new upload policies; overlap-safe snapshots; real restore; docs/examples match; small E2E suite passes |

Start with a small verified milestone rather than another broad visual or feature expansion. The existing design and modular monolith can support these improvements; the important change is enforcing consistent contracts and invariants across complete user journeys.
