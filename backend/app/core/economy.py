"""Durable economy settings shared by HTTP, rewards and staff controls."""
from fastapi import HTTPException
from pydantic import BaseModel, Field, ConfigDict
from app.core.config import settings
from app.modules.staff.models import SystemSetting

class EconomyUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    chapter_read_reward: int | None = Field(None, ge=0, le=100000)
    daily_checkin_reward: int | None = Field(None, ge=0, le=100000)
    welcome_bonus: int | None = Field(None, ge=0, le=100000)
    daily_max_limit: int | None = Field(None, ge=0, le=1000000)
    anti_farming_cooldown_min: int | None = Field(None, ge=0, le=1440)

DEFAULTS = {'chapter_read_reward': 'CHAPTER_READ_COINS', 'daily_checkin_reward': 'DAILY_LOGIN_COINS',
            'welcome_bonus': 'INITIAL_COINS', 'daily_max_limit': 'DAILY_MAX_COINS',
            'anti_farming_cooldown_min': 'CHAPTER_COOLDOWN_MINUTES'}
ALIASES = {'register_bonus_coins': 'welcome_bonus', 'daily_checkin_coins': 'daily_checkin_reward',
           'chapter_read_coins': 'chapter_read_reward'}

async def economy_value(db, key):
    row = await db.get(SystemSetting, key)
    if row is None:
        for old, canonical in ALIASES.items():
            if canonical == key:
                row = await db.get(SystemSetting, old)
                if row is not None:
                    break
    return int(row.value) if row is not None else getattr(settings, DEFAULTS[key])

async def economy_settings(db):
    result = {key: await economy_value(db, key) for key in DEFAULTS}
    result.update(reset_timezone=settings.TIMEZONE, reset_time='00:00',
                  creator_chapter_reward=None, comment_reward=None,
                  unsupported_rewards=['creator_chapter_reward', 'comment_reward'])
    return result

async def save_economy(db, data):
    for key, value in data.model_dump(exclude_none=True).items():
        row = await db.get(SystemSetting, key)
        if row is None:
            db.add(SystemSetting(key=key, value=str(value)))
        else:
            row.value = str(value)
    await db.commit()
    return await economy_settings(db)
