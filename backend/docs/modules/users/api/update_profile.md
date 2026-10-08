# Reader profile update

`PATCH /api/v1/users/profile` requires the initiating reader's bearer access token.
It updates username and biography together in one transaction. Optional fields:

```json
{"username":"reader_name","bio":"About me"}
```

Username contains 3–50 ASCII letters, digits, `_` or `-`; it must be unique.
Biography accepts at most 500 characters; an empty string clears it. `avatar_url`
is also supported only for a validated avatar uploaded by this reader. Success
returns the updated `id`, `username`, `bio` and `avatar_url` inside `data`.

Password changes use a separate `PATCH /api/v1/auth/profile` action with
`old_password` and `new_password`. A successful change revokes all reader and
linked creator sessions, including the current one; the client clears its session
and asks the reader to sign in with the new password. A failed password action
does not undo an already saved profile. The legacy username field on
`/auth/profile` remains supported for compatibility.
