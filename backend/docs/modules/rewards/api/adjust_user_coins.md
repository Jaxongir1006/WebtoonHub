# Adjust a reader's coins

`POST /api/v1/staff/readers/{id}/coins` requires a staff bearer token and `coins:adjust` permission. The reader ID belongs in the route. A negative delta deducts coins; the resulting balance is clamped at zero, and the returned delta records the amount actually applied. Every accepted adjustment records a ledger transaction.

```http
Authorization: Bearer <staff_access_token>
Content-Type: application/json
Idempotency-Key: 12fe9b0e-f25e-4d18-b395-fc9313f0edc2
```

```json
{
  "amount_delta": 50,
  "reason": "Translation contest award"
}
```

`reason` must contain 2–255 characters. `amount` is an accepted alias; `amount_delta` takes precedence when both are supplied. Clients should send one amount field and a nonzero integer for a deliberate correction.

`Idempotency-Key` is required: 8–128 ASCII letters, digits, `_` or `-`. Generate a new key for each deliberate adjustment and keep the same key and payload when retrying an unknown transport outcome. Keys belong to the authenticated staff account, including the target reader in the recorded intent. Replaying an accepted intent returns its original result without changing the balance or adding another ledger entry. Reusing that key with another reader, payload or financial endpoint returns 409. Validation failure returns 422; an unknown reader returns 404.

```json
{
  "success": true,
  "data": {
    "user_id": 5,
    "previous_coins": 120,
    "new_coins": 170,
    "amount_delta": 50,
    "reason": "Translation contest award"
  },
  "message": "Foydalanuvchi chaqmoq balansi muvaffaqiyatli o'zgartirildi"
}
```

The replayed `new_coins` describes that original operation. Refresh the reader before presenting a current balance after later operations. See [operation reliability](../../../04_OPERATION_RELIABILITY.md).
