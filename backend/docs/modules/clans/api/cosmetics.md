# Clan shop and equipped appearance

See the [clan shop guide](../../../../../docs/CLAN_SHOP_GUIDE.md) for the reader and
admin workflow.

Clan avatar frames and backgrounds use the same admin-managed shop catalog as
personal cosmetics. Character cards are excluded. A clan's inventory is separate
from every member's personal inventory, and remains with the clan when leadership
changes or its purchaser leaves.

All paths below have the `/api/v1` prefix and require a reader access token.

| Method and path | Access | Response `data` |
| --- | --- | --- |
| `GET /clans/{clan_id}/shop` | Clan members | Array of `ShopItemResponse`, with `is_owned` for the clan |
| `GET /clans/{clan_id}/inventory` | Clan members | Array of `InventoryItemResponse`, including owned items no longer on sale |
| `POST /clans/{clan_id}/shop/buy/{item_id}` | Leader/co-leader | `{item_id, item_name, price_paid, new_balance}` |
| `POST /clans/{clan_id}/shop/equip/{item_id}` | Leader/co-leader | `{item_id, item_type, is_active: true}` |
| `POST /clans/{clan_id}/shop/unequip/{item_id}` | Leader/co-leader | `{item_id, item_type, is_active: false}` |

Buying requires the JSON body `{"expected_price": 50}`; extra fields are rejected.
The actor pays from their own Lightning balance, as with clan upgrades. The
purchase atomically debits that wallet, writes a `clan_shop_purchase` ledger entry,
and records clan ownership, purchaser and actual paid price. It does not grant
personal ownership. Buying does not automatically equip the item.

A changed price or duplicate ownership returns 409 without any additional debit.
Missing or unavailable items return 404; insufficient Lightning returns 400;
non-members and members without management rights return 403. Character cards
return 422. Equipping needs clan ownership and replaces the active item of the
same type. An unavailable purchased item can still be equipped. Unequipping an
owned inactive item succeeds without changing other items.

Wallet mutations lock the actor, then the clan, then the shared catalog and item.
Membership is rechecked after obtaining the clan lock. Leadership changes,
membership removal and clan dissolution use the same clan lock so authorization
and inventory cannot race those mutations. Leadership transfer first locks the
new leader's user row before the clan to keep its foreign-key check in that order.
The database unique constraint also
prevents duplicate clan/item ownership. Staff cannot delete an owned clan item;
they can make it unavailable instead. Artwork edits propagate through the shared
item and its derived metadata; reference-aware cleanup preserves shared media.

Clan detail, list, my-clan, staff list and user/friend clan summaries expose:

```json
{
  "frame_url": "/content/frames/purchased.webp",
  "banner_url": "/content/backgrounds/purchased.webp",
  "active_frame": {
    "id": 1,
    "name": "Gold frame",
    "asset_url": "/content/frames/purchased.webp",
    "asset_preview_url": null,
    "asset_animated": false
  },
  "active_background": {
    "id": 2,
    "name": "Animated landscape",
    "asset_url": "/content/backgrounds/purchased.webp",
    "asset_preview_url": "/content/backgrounds/purchased-preview.webp",
    "asset_animated": true
  }
}
```

These fields are resolved only from active clan purchases. Without an equipped
purchase, the corresponding fields are null. Legacy raw `clans.frame_url` and
`clans.banner_url` columns are retained for recovery but never render as owned
cosmetics. They are not converted into free inventory during migration.

Clan create/update requests reject `frame_url` and `banner_url` with 422. Direct
`/{clan_id}/upload-frame`, `/{clan_id}/upload-banner`, `/uploads/frame`,
`/uploads/banner` and `/uploads/background` uploads also return 422 explaining the
shop requirement. The clan's ordinary logo remains uploadable through
`POST /clans/{clan_id}/upload-avatar`, returning `data.avatar_url`, or the avatar
draft upload used during clan creation.

Migration `e03d284b918a` creates `clan_inventory` without changing historical clan
appearance data. Its PostgreSQL table has RLS enabled and no direct Supabase
`anon`/`authenticated` grants; requests go through the application's authorization.
