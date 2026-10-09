# Character cards and Lightning rewards

Frames and profile backgrounds are sold through the shop. Character cards are
created in the staff shop catalog without a purchase price (`price_coins` is stored
as zero for compatibility), then assigned to a Character Card Gacha pool. Direct
card purchase and wheel item prizes are rejected by the backend. Lucky Wheel
sectors award Lightning only. Existing inventories and old spin receipts remain
intact; the migration removes old item sectors and disables wheels left with fewer
than two Lightning sectors.

## Schema

| Table | Purpose and constraints |
| --- | --- |
| `shop_items` | Existing card identity, rarity and validated artwork; character cards have price zero. Frames/backgrounds retain purchase prices. |
| `user_inventory` | Existing collection ownership; unique `(user_id,item_id)` guarantees one collected copy. |
| `gacha_pools` | Title, description, positive Lightning cost, active status, configuration version, four rarity weights and timestamps. |
| `gacha_pool_cards` | Pool/card foreign keys, positive card weight and unique `(pool_id,item_id)` membership. |
| `gacha_rolls` | Reader/pool/card foreign keys, immutable pool title/version and winning-card snapshot, cost, duplicate flag, bounded refund and timestamp. |
| `operation_receipts` | Existing unique actor/operation key and exact saved response; commits with the wallet ledger, draw and inventory. |

Original winning artwork is retained by snapshot references. Archive pools instead
of deleting history. PostgreSQL enables RLS and removes Supabase browser-role
grants from the new tables.

## Staff configuration

The Rewards page has Lucky Wheel and Character Card Gacha categories. Create card
artwork and its character, series and rarity in the catalog first. A pool contains
a title, optional description, positive Lightning draw cost, four rarity weights,
and a list of cards with positive weights. Activate it when a positive rarity tier
contains an available card. The existing `wheel:manage`, `shop:manage` or
`settings:manage` permission allows pool management.

`GET /api/v1/staff/gacha/pools` lists complete configurations. `POST` creates one;
`PATCH /api/v1/staff/gacha/pools/{id}` requires `expected_version` and replaces the
entire membership list if `cards` is provided. A stale editor receives HTTP 409.
`DELETE` archives the pool while preserving history. The history endpoint is
`GET /api/v1/staff/gacha/pools/{id}/history`.

Example pool payload:

```json
{
  "title": "Character Collection",
  "cost_coins": 100,
  "is_active": true,
  "rarity_weights": {"common": 70, "rare": 22, "epic": 7, "legendary": 1},
  "cards": [{"item_id": 10, "weight": 1}, {"item_id": 11, "weight": 3}]
}
```

Weights are relative integers. Empty rarity tiers, unavailable cards and zero
rarity weights are excluded. The API publishes the resulting effective odds:
`P(card) = tier_weight / populated_tier_weight_sum * card_weight /
tier_card_weight_sum`. In a tier with weights 1 and 3, those cards receive one
quarter and three quarters of that tier's probability. A rarity with no eligible
cards receives 0%; its weight is redistributed across populated tiers.

## Reader draw and animation

`GET /api/v1/gacha/pools` lists active pools; `/pools/{id}` includes eligible cards,
effective odds and collection ownership. The reader confirms the shown cost and
submits:

```json
{"expected_cost":100,"expected_version":1,"operation_key":"unique-draw-key"}
```

to `POST /api/v1/gacha/pools/{id}/roll`. The server returns `roll_id`, `pool_id`,
`winning_card`, 40 `animation_cards`, `winning_index` (35), `new_balance`,
`cost_paid`, `is_duplicate`, `refund_coins` and `message`. The reader animates the
already committed result; the decorative neighboring cards do not determine
the win and their distribution does not express drop odds.

The request cannot nominate a winner, seed or probability. Cryptographic integer
RNG selects the rarity first, then the character within that tier. Existing wallet
locks protect simultaneous wheel, shop and gacha operations. Pool and card rows
are locked in a consistent order after a transaction catalog advisory lock in
PostgreSQL (a worker-local lock in SQLite). This also coordinates new memberships
with card edits. Linked-card rarity/availability changes
increment the pool version. Cost/rates that changed since confirmation produce
HTTP 409 before a charge.

The PostgreSQL catalog lock serializes draw and catalog mutations across workers.
This trades peak throughput for simple, correct wallet/configuration behavior and
is suitable for the semester project's single-worker free backend. A larger
deployment can replace it with a coordinated shared/exclusive lock without
weakening version or ownership invariants.

Debit, inventory grant, coin ledger, draw history and operation receipt commit
together. Retrying the same operation key and identical intent returns the exact
original result, including its animation strip, even after the pool is archived.
Reusing a key for another intent produces HTTP 409. On a lost network response,
retry with the same key; start a new key only after that draw is resolved.

## Duplicates and history

Draw odds include already collected cards. A duplicate leaves the unique inventory
unchanged and refunds the **entire draw cost** in Lightning. The ledger records
both debit and refund, and the result shows the refund explicitly. Owning the full
pool therefore produces refunded duplicate draws; it never changes the odds or
secretly rerolls another card. A user must have enough Lightning to cover the draw
before a duplicate can be refunded. `GET /api/v1/gacha/history` returns only the
authenticated reader's recent draws. Original artwork and previews recorded in
draw snapshots are retained during replacement and orphan-media cleanup. Private backend table access remains protected
by PostgreSQL RLS and revoked browser-role grants on Supabase.
