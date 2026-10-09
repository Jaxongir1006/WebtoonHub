# Operation reliability contracts

Coin-changing user intents carry a durable operation identity. Wheel spin JSON requires `operation_key` (8–128 ASCII letters, digits, `_` or `-`). Staff coin adjustments and distributions require the same format in the `Idempotency-Key` header. The key belongs to the authenticated actor, not a browser or target reader. A new deliberate action uses a new key; a retry after an unknown transport outcome keeps its original key and payload.

The server reserves a unique `(actor, operation_key)` receipt and commits its response in the same database transaction as the wallet, ledger, inventory and spin changes. A repeat returns the original response before availability/price validation. Reusing a key for another endpoint or payload returns 409. A rejected operation rolls back the reservation, so a pre-commit failure can safely retry. Receipts contain operation results and are retained with the financial ledger; they contain no credentials.

Character-card rolls use the same receipt contract at `POST /api/v1/gacha/pools/{pool_id}/roll`.
Their intent includes `expected_cost`, `expected_version` and `operation_key`.
The pool version covers the displayed cost, membership and drop-rate configuration.
The server commits the Lightning debit, selected card, inventory ownership, duplicate
refund and roll history together. Its animation strip is presentation data; it
never changes the recorded winner. A duplicate returns the entire roll cost and
does not create a second ownership row. The client retains an uncertain intent
under the original account and recovers it with the same body before allowing a
new roll. The roll endpoint has a bounded request rate and returns `Retry-After`
on 429; a delayed retry still keeps its original key.

Friendship direction still identifies the original requester, but generated minimum/maximum reader IDs and a database constraint enforce uniqueness for the unordered pair. Writes serialize both reader rows in ascending ID order. A crossed request accepts the single incoming pending relation. The migration consolidates existing duplicate pairs, preferring an accepted relation, and preserves the earliest record within the preferred status.

Clan history supports either `before_id` (older history) or `after_id` (ascending catch-up), never both. Responses include `has_more`, `pagination.has_more`, and `next_after_id`; clients fetch catch-up pages until contiguous with the newest persisted message. Redis pub/sub distributes messages and membership/session revocations between API processes. Local delivery and REST history remain available when Redis is temporarily unavailable; visible clients catch up every 15 seconds as well as on reconnect, covering missed pub/sub events.

Upload throttling assigns separate policies to private import page uploads and expensive finalization/card asset routes so normal resumable batches remain usable. Limits return 429 with `Retry-After`.

Backup runs acquire one backup-owned lock shared by deployment and the scheduled service. A run records ownership only after it successfully pauses the API and resumes only its own pause. Concurrent runs cannot capture the same snapshot interval or reuse filenames.
