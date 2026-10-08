# Collectible character cards

Cards are shop items with `item_type=card`, a required `rarity` (`common`, `rare`, `epic`, `legendary`) and `character_name` (up to 100 characters). `series_title` (up to 255 characters) and an existing `webtoon_id` are optional. Linking a series fills its title when none is supplied. The same inventory uniqueness rule applies: an account owns at most one copy of each shop item.

## Artwork

Staff with `shop:manage` upload multipart `file` and `item_type=card` to `POST /api/v1/staff/shop/items/upload-asset`. The server decodes and re-encodes JPEG, PNG, static WebP, GIF and animated WebP. Animation remains animated; static artwork remains static. Cards cannot contain SVG, HTML or MP4. Frame/background processing retains its existing behavior.

Processing limits:

- Source and encoded artwork: 10 MiB each.
- At most 100 frames and a 10-second loop.
- At most 4 million source pixels per frame and 60 million decoded pixels in total.
- Encoded frames fit within 1200 × 1200 pixels while preserving aspect ratio.
- Frame delays have a 20 ms minimum; missing delays default to 100 ms. Animated output loops continuously.

The response contains `asset_url`, `asset_preview_url` and `asset_animated`. The preview is the first frame of animated artwork; a static asset uses its own URL as the preview. These fields are derived from validated media. Create/update cannot supply animation flags or a preview URL. A card's `asset_url` must identify a validated local card upload; arbitrary remote URLs are rejected. Uploads are serialized within each API worker and encoding runs outside its event loop.

Create a card through existing multipart `POST /api/v1/staff/shop/items`, supplying the metadata and the uploader's `asset_url` (or direct `asset_file`). Update through existing JSON `PATCH /api/v1/staff/shop/items/{id}`. Omitted metadata remains unchanged; optional series fields can be cleared with `null`. Item type cannot be changed.

## Ownership and editing

Purchasing debits the wallet, records a transaction and creates inventory ownership in the same transaction. Server-side summaries derive their counts from inventory. Once anyone owns a card, its name, rarity, character and series identity are locked. Staff responses include `owned_count` and `identity_locked` so the editor can explain this restriction. Price, availability and validated artwork can still be updated. Hide a collected card from sale rather than deleting it. Items referenced by a wheel also cannot be deleted.

Purchase, wheel acquisition and staff edits/deletion share PostgreSQL item row locks. SQLite coordinates these writes within one worker. Existing wallet locks and the inventory uniqueness constraint also protect purchases. SQLite deployments should use a single API worker; production multiworker deployments use PostgreSQL.

Artwork replacement commits before deleting the previous asset or preview, and deletion preserves any media still referenced elsewhere. Both assets are included in media-reference cleanup. Abandoned uploads can be removed by the existing orphan-media cleanup script after its grace period; preview files belonging to current cards are retained.

Wheel `shop_item` prizes accept cards and include their metadata. Winning an already-owned item keeps the wheel's existing coin-compensation behavior. The existing staff gift endpoint distributes coins; this release does not add card gifting or trading.

## Collections and profiles

- `GET /api/v1/shop/collection`: authenticated owner's summary plus `cards` inventory.
- `GET /api/v1/shop/collection/{user_id}`: public summary only.
- `PUT /api/v1/shop/collection/featured`, JSON `{"item_ids": [12, 9, 4]}`: replace the authenticated account's ordered showcase with up to three distinct owned cards. Use an empty list to clear it.

The summary contains `total_cards`, all four `rarity_counts`, and ordered `featured_cards`. The owner profile and public profile embed this object as `card_collection`. Public summaries expose neither the full inventory nor purchase dates. Cards are showcased through the featured endpoint rather than the cosmetic equip endpoint.

The standard `/shop/items` and `/shop/inventory` endpoints accept `item_type=card`; their card entries and nested wheel prizes include card metadata and preview fields.

## Database and validation

Migration `c63ea14d2910` adds card metadata and the inventory-backed `user_featured_cards` table. Apply migrations before running the new API version. The showcase has an ownership foreign key and a unique position per user.

`tests/test_character_cards.py` checks animation preservation and bounds, permissions and metadata validation, derived counts, showcase ownership/order, duplicate purchase behavior, first-purchase races against edits/deletion, wheel duplicates and artwork cleanup. Run it against disposable databases, never the development content database.
