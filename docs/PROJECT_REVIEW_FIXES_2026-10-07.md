# October project review: implemented fixes

This records implementation of the 29 findings in [the project review](PROJECT_REVIEW_2026-10-07.md). Three agents worked on reader UX, backend content integrity, and studio workflows; the coordinating agent implemented financial receipts, friendship constraints, chat recovery, throttling, backup locking, and integrated validation. Existing local edits were preserved.

## Findings and resulting behavior

| Finding | Result |
|---|---|
| 1. Mutable role names changed authorization | Immutable system identity and content scope drive authority. Renaming a creator or superadmin preserves its policy; custom roles cannot borrow built-in names. |
| 2. Published revisions bypassed review | Content revisions by staff without approval rights move the chapter to pending and protect its assets. Studio reports the review transition. |
| 3. Stale shop prices changed spending intent | The buyer sends the displayed `expected_price`; changed offers return 409 before any debit. Receipts show the actual paid price. |
| 4. Profile saves crossed accounts | Username and biography save atomically. Request credentials and response ownership stay tied to the initiating account. |
| 5. Illustrated novels omitted images/progress failed | Ordered illustrations appear after the final text page. Completion waits for loaded illustrations and viewing the final marker. Novel positions retain word anchors and bypass image-page bounds. |
| 6. Novel settings scrolled out of view | Opening settings scrolls the panel into view, focuses it, and disables unwanted scroll anchoring. |
| 7. Tall manga pages retained scroll offsets | Turning pages resets scroll to show the new page's beginning, including fit-width mode. |
| 8. Pinch gestures turned pages | Manga and novel readers share gesture validation, rejecting multi-touch, canceled, interactive and scroll gestures. |
| 9. Invalid saved anchors crashed readers | Local positions validate IDs, numeric ranges, anchor structure, types, dates and metadata before use. |
| 10. Password and profile changes partially saved | Profile and password are separate actions. A successful password change clears the revoked session and explains signing in again. |
| 11. Comment length disagreed with the API | Reader forms enforce 500 characters, display localized limits, and preserve drafts on failed submission. |
| 12. Shop/wheel success used the wrong locale | Client feedback uses localized templates and structured reward outcomes, including duplicate-item compensation. |
| 13. Wheel ignored reduced motion | Reduced-motion users bypass the long rotation, tick sounds and confetti. |
| 14. Shop edits submitted forbidden fields | Frame, background and card serializers send allowed request fields. Previews show the persisted artwork and use a local avatar placeholder. |
| 15. Concurrent moderation silently skipped actions | Competing review actions are locked. Rejection dialogs preserve their reason and remain open when the action fails or is blocked. |
| 16. Click-driven edits bypassed dirty checks | Modal draft snapshots include reorder/removal, genres, roles, backgrounds and typed values. |
| 17. Chapter metadata committed before pages | One multipart action saves metadata, ordering, retained pages, uploads and review status in one transaction. Failed media validation rolls back the metadata too. |
| 18. Published chapters could lose their content | Publication requires format-appropriate content; removing required text/pages requires an explicit non-published status. |
| 19. Studio and API permissions disagreed | Wheel capabilities match server permissions. Shop managers use a narrow series selector without gaining chapter editing rights. |
| 20. Crossed friend requests duplicated relations | Generated canonical pair IDs enforce database uniqueness. Both directions lock reader rows in ascending order; crossed requests accept one pending relation. |
| 21. Equipment locks stopped at one process | Equipment changes also lock the reader row in the database, serializing separate workers. |
| 22. Financial retries could charge/gift twice | Actor-scoped operation receipts commit atomically with wallet/ledger/spin/inventory changes. Browser intents persist their key and payload until acknowledgement. Replays return the original result, and clients refresh current balances. |
| 23. Reconnected clan chat skipped older gaps | Ascending `after_id` pagination recovers every missed page. The cursor advances from REST batches, and visible clients poll every 15 seconds to cover missed live events. |
| 24. Clan events stayed in one process | Redis pub/sub shares messages and session/member revocations across workers. Bounded concurrent socket delivery isolates slow peers. Chat retry identities also use database author locks. |
| 25. Recents used upload time | Indexed `published_at` drives recent publication ordering and updates when approved. |
| 26. New upload paths lacked limits | Import operations, import pages and shop assets have explicit policies, with 429 and `Retry-After`. |
| 27. Backups overlapped or resumed another pause | Both callers share one nonblocking `flock`; filenames include a process ID. Existing/failed pauses do not grant ownership. Linux shell sources retain LF endings. |
| 28. Canonical request documentation drifted | Reader profile, role identity, economy, shop, chapter edit/publication, wheel and operation reliability contracts are updated. CI verifies exported studio request schemas against Pydantic. |
| 29. Browser/API integration was missing | A separate Playwright suite launches the real reader, studio and FastAPI app against temporary synthetic data. CI requires these journeys before deployment. |

## Verification

Browser verification also exposed a multi-root Vue route transition warning.
Studio route transitions now animate a keyed element wrapper, so detail views
with loading states and dialogs retain their transition without runtime warnings.

| Final integrated check | Result |
|---|---|
| Reader regression suite | 86/86 passed; includes 17 new regressions |
| Studio suites | 184 general + 52 import + 77 collectible checks passed, 313 total |
| Reader and studio production builds | Both passed |
| Backend discovery with SQLite and real Redis | 100 discovered: 98 passed, 2 platform skips |
| Backend discovery with PostgreSQL 18 and real Redis 8 | 100 discovered: 99 passed, 1 platform skip |
| Linux backup suite with util-linux `flock` | 11/11 passed, including the real overlapping-lock test |
| SQLite and PostgreSQL fresh migration/schema checks | Passed; no new upgrade operations detected |
| Both databases, downgrade to base then re-upgrade | Passed on disposable databases |
| Legacy-row migration regression | Passed: duplicate-pair consolidation, role backfill, publication backfill, uniqueness and downgrade/re-upgrade |
| Actual browser/API journeys | 5/5 passed, including 320px mobile reader checks |
| Exported studio schemas vs backend Pydantic | Equality check passed; enforced in CI |
| Source checks | Python compilation and Git whitespace checks passed |

Windows skips are the Linux-only real `flock` case and, for SQLite, the PostgreSQL-only multi-worker chat retry case. Both behaviors were separately exercised in their matching runtime. PostgreSQL race tests remove process-local mutexes to verify database locking. The Redis integration uses independent connection managers with the actual Redis service.

The browser run used an existing compatible Chromium executable; CI is configured to install the version pinned by the Playwright package. All browser domain requests reach the real local API, and external browser requests are blocked. The runnable setup and coverage are in [e2e/README.md](../e2e/README.md). This is local verification; the hosted CI workflow has not been executed in this task.

## Applying the changes

Two new migrations follow `c63ea14d2910`: `76d9c248ab10` (role identity/scope and publication dates) and `aa42ef631d90` (operation receipts and canonical friendship pairs). Apply them with `python -m alembic upgrade head` from the backend using the target environment before starting this release. The friendship migration consolidates existing duplicate pairs, preferring accepted relations and then earliest IDs; take the normal database/media backup first.

Deploy the matching reader, studio and API together: shop purchase price quotes, wheel operation keys, staff idempotency headers and atomic chapter edits are coordinated contracts. Every API worker must use the same Redis service. Clients retain REST chat recovery during Redis interruptions. Host backups require util-linux `flock`.

The original project database/media were not modified, and no release was deployed. Automated tests use temporary databases, generated media and disposable local PostgreSQL/Redis containers. Real SMTP delivery, production capacity and offsite disaster recovery still require their deployment environment. The review's separate product/architecture opportunities remain a future roadmap, rather than part of these 29 defect fixes.
