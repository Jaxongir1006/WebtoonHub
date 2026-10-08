# Linked-series selector

`GET /api/v1/staff/shop/series?page=1&limit=20&search=title` requires `shop:manage`.
It returns `data: {items: [{id, title, type}], total, page, limit}`. Limit is 1–100.
This endpoint provides only the fields needed to link a card to an existing work.
It does not expose unpublished chapter text or confer editorial permissions.

The existing staff item list accepts `shop:manage`, `wheel:manage`, or
`settings:manage`, matching wheel management's prize-selection requirements.
