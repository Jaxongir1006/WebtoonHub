# API: Economy settings

`GET` and `PATCH /api/v1/staff/economy/settings` require a staff bearer token
and `users:manage`. Supported settings persist in `system_settings` and are
read by registration and reward services; restarting the API retains changes.

The GET response uses the standard success envelope:

```json
{
  "success": true,
  "data": {
    "chapter_read_reward": 5,
    "daily_checkin_reward": 15,
    "welcome_bonus": 50,
    "daily_max_limit": 100,
    "anti_farming_cooldown_min": 0,
    "reset_timezone": "Asia/Tashkent",
    "reset_time": "00:00",
    "creator_chapter_reward": null,
    "comment_reward": null,
    "unsupported_rewards": ["creator_chapter_reward", "comment_reward"]
  }
}
```

These numbers illustrate defaults; GET returns the current configured values.
The two null reward fields are unsupported features, not active rewards.
Timezone comes from server configuration, and the reset time is fixed at midnight.

PATCH accepts only these optional integer fields:

| Field | Allowed range | Meaning |
|---|---|---|
| `chapter_read_reward` | 0–100000 | Configured chapter reward setting; individual chapters retain their explicit reward amount. |
| `daily_checkin_reward` | 0–100000 | Daily check-in bonus. |
| `welcome_bonus` | 0–100000 | Bonus for newly registered accounts. |
| `daily_max_limit` | 0–1000000 | Daily chapter-reward cap; zero disables the cap. |
| `anti_farming_cooldown_min` | 0–1440 | Minimum minutes between successful chapter claims; zero disables the cooldown. |

```json
{
  "daily_checkin_reward": 20,
  "welcome_bonus": 50,
  "daily_max_limit": 150
}
```

Omitted or null fields remain unchanged. PATCH returns the complete current
settings in the same envelope as GET. Unknown fields return 422, including
`creator_chapter_reward`, `comment_reward`, `reset_timezone`, and `reset_time`.
Missing permission returns 403. Chapter rewards also require completed reading
progress and are granted once per reader/chapter; changing settings does not
reset already claimed rewards.
