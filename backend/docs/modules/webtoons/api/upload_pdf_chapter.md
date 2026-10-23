# Upload a PDF chapter

`POST /api/v1/staff/chapter-imports/pdf`, multipart, requires `chapters:create`
and access to the selected manga/manhwa. `publish=true` also requires
`chapters:approve`.

Fields: `webtoon_id`, positive finite `chapter_number`, `idempotency_key` (1–128
non-whitespace characters), one `pdf` file, optional `title` (255 characters),
`reward_coins` (0–1,000,000), and `publish` (defaults to false).

A 201 response contains `data.id`, `webtoon_id`, `chapter_number`, `title`,
`status` (`pending` or `published`), and `images_count`.

Limits: 20 MB source, 1–100 pages, 50 MB converted chapter; rendering is sequential
in an isolated process with a 150-second deadline and Linux memory/CPU limits.
The renderer includes annotations and form appearances, producing lossless WebP
at up to 288 DPI and 2400 pixels wide. Tall PDF pages are split into consecutive
sections, each at most about eight million pixels and 4096 pixels tall, so long
manhwa pages keep their readable width. A chapter may contain at most 100 rendered
sections. Validated PDF output bypasses the normal 1200-pixel chapter-image resize
and lossy re-encoding; this option is internal and cannot be enabled in public
page-upload requests. Limits reject oversized output instead of reducing quality.

Reuses private chapter-import staging, per-page checksums, owner authorization
and atomic finalization. An unchanged key resumes staged pages or returns the
already completed chapter. A key used for different content or an existing
chapter number returns 409. Invalid/locked/too-complex PDFs return 422; oversized
files return 413. The source PDF and conversion directory are temporary.
