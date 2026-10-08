# API: Update a reader's account status

`PATCH /api/v1/staff/readers/{id}` requires a staff bearer token and `users:manage`.
The JSON request accepts only `is_active`; omitted fields remain unchanged.
Unknown fields, including `lightning_coins`, `username`, and `email`, return 422.

```json
{ "is_active": false }
```

A successful response uses the standard `{ "success": true, "data": ... }`
envelope and returns the reader's ID, username, email, current coin balance,
activity status, and creation timestamp. The balance is read-only here.
Disabling a reader revokes their sessions, including linked creator sessions.
A nonexistent reader returns 404; insufficient permission returns 403.

Coin corrections use `POST /api/v1/staff/readers/{id}/coins`, require
`coins:adjust`, and create a ledger entry. See [adjust_user_coins.md](../../rewards/api/adjust_user_coins.md).
Send a stable `Idempotency-Key` for retries of one correction; a new intended
correction needs a new key. Generic account editing never changes wallet balances.
