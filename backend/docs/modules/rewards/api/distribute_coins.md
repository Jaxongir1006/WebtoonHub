# Distribute coins

`POST /api/v1/staff/coins/distribute` requires a staff bearer token and `coins:distribute` permission. The operation awards the same positive integer amount to every matching active reader and records one ledger transaction per recipient.

```http
Authorization: Bearer <staff_access_token>
Content-Type: application/json
Idempotency-Key: 866c116b-7601-4fb6-b47e-3cc5b08cfc06
```

```json
{
  "amount": 30,
  "reason": "Holiday gift",
  "all_active_users": true,
  "target_user_ids": []
}
```

`amount` must be at least 1 and `reason` must contain 2–255 characters. `all_active_users` defaults to true. For selected recipients, set it to false and provide a nonempty `target_user_ids` list. Inactive readers are excluded in both modes. Recipient order and duplicate IDs are normalized for operation identity.

`Idempotency-Key` is required: 8–128 ASCII letters, digits, `_` or `-`. Create a new key for each deliberate distribution. Retry an unknown transport outcome with the same key and payload; an accepted retry returns the original recipient count and amount without distributing again, even if the active-reader population has changed. Reusing the key for another payload or financial endpoint returns 409. Missing/invalid keys, invalid fields or no selected IDs return 422. See [operation reliability](../../../04_OPERATION_RELIABILITY.md).

```json
{
  "success": true,
  "data": {
    "rewarded_users_count": 1420,
    "amount_per_user": 30,
    "total_coins_distributed": 42600,
    "reason": "Holiday gift"
  },
  "message": "Chaqmoqlar foydalanuvchilarga muvaffaqiyatli tarqatildi"
}
```
