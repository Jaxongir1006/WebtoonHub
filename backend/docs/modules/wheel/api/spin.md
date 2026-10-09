# Spin a wheel

`POST /api/v1/wheels/{wheel_id}/spin` requires a reader bearer token and an explicit JSON intent. Read `/api/v1/wheels/{wheel_id}` first to display the current free-spin eligibility and price.

```http
Authorization: Bearer <reader_access_token>
Content-Type: application/json
```

```json
{
  "expected_mode": "paid",
  "expected_cost": 100,
  "operation_key": "20cfc1dd-46f9-4923-b583-3a18605b8618"
}
```

`expected_mode` is `free` or `paid`. `expected_cost` is a nonnegative integer: use 0 for a free spin and the displayed price for a paid spin. The server returns 409 if the price or free-spin mode has changed. Refresh wheel details and ask the reader to start a new intent after reviewing the updated terms. Missing or invalid fields return 422.

`operation_key` is required: 8–128 ASCII letters, digits, `_` or `-`. A deliberate spin gets a fresh key. Persist the key and body before submission, and retry an unknown transport outcome with the same values. The key belongs to the authenticated reader. A completed retry returns the original spin, prize and operation balance without charging or spinning again, even after the wheel is disabled, repriced or its free spin is consumed. Reusing the key with another wheel, payload or financial endpoint returns 409. A pre-commit failure rolls back the reservation and can retry safely. See [operation reliability](../../../04_OPERATION_RELIABILITY.md).

New Lucky Wheel spins award Lightning only: staff sector creation/update requires
`reward_type="coins"`, a nonnegative `reward_coins`, and no shop item ID. Frames
and backgrounds are purchase-only; character cards are gacha-only.

The success envelope contains `success`, `data` and `message`. Its `data` contains `spin_id`, `winning_item`, `winning_index`, `new_balance`, `is_free_spin`, `message`, `outcome`, `reward_coins` and `reward_item_name`. New spins have `outcome="coins"` and `reward_item_name=null`. `winning_item` describes the selected sector, while `reward_coins` describes the actual coin reward. Historical receipts retain their earlier item outcomes and metadata. Refresh the wallet to show a current balance if other operations happened after a replayed spin.
