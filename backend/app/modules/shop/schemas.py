from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ShopBuyRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_price: int = Field(ge=0)


class CardFields(BaseModel):
    rarity: Optional[Literal['common', 'rare', 'epic', 'legendary']] = None
    character_name: Optional[str] = None
    series_title: Optional[str] = None
    webtoon_id: Optional[int] = None
    asset_preview_url: Optional[str] = None
    asset_animated: bool = False


class ShopItemResponse(CardFields):
    id: int
    name: str
    item_type: str
    price_coins: int
    asset_url: str
    is_owned: bool = False

    class Config:
        from_attributes = True


class InventoryItemResponse(CardFields):
    id: int
    name: str
    item_type: str
    price_coins: int
    asset_url: str
    is_active: bool
    purchased_at: datetime

    class Config:
        from_attributes = True


class ShopBuyResponse(BaseModel):
    item_id: int
    item_name: str
    price_paid: int
    remaining_coins: int


class EquipResponse(BaseModel):
    item_id: int
    item_type: str
    is_active: bool


class ShopItemUpdateRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    price_coins: Optional[int] = Field(None, ge=0)
    asset_url: Optional[str] = None
    is_available: Optional[bool] = None
    rarity: Optional[Literal['common', 'rare', 'epic', 'legendary']] = None
    character_name: Optional[str] = Field(None, max_length=100)
    series_title: Optional[str] = Field(None, max_length=255)
    webtoon_id: Optional[int] = Field(None, gt=0)


class FeaturedCardsRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    item_ids: list[int] = Field(max_length=3)

    @field_validator('item_ids')
    @classmethod
    def valid_ids(cls, value):
        if any(item <= 0 for item in value) or len(value) != len(set(value)):
            raise ValueError('Select at most three distinct owned cards')
        return value


def card_fields(item):
    return {key: getattr(item, key) for key in ['rarity', 'character_name', 'series_title', 'webtoon_id', 'asset_animated']} | {
        'asset_preview_url': item.asset_preview_url or (item.asset_url if item.item_type == 'card' else None)}
