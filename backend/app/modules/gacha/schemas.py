from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.modules.shop.schemas import ShopItemResponse

RARITIES = ('common', 'rare', 'epic', 'legendary')


class RarityWeights(BaseModel):
    model_config = ConfigDict(extra='forbid')
    common: int = Field(70, ge=0, le=1000000)
    rare: int = Field(22, ge=0, le=1000000)
    epic: int = Field(7, ge=0, le=1000000)
    legendary: int = Field(1, ge=0, le=1000000)


class PoolCardInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    item_id: int = Field(gt=0)
    weight: int = Field(1, ge=1, le=1000000)


class PoolCreateRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=5000)
    cost_coins: int = Field(100, ge=1, le=1000000)
    is_active: bool = False
    rarity_weights: RarityWeights = Field(default_factory=RarityWeights)
    cards: list[PoolCardInput] = Field(default_factory=list, max_length=500)

    @field_validator('title')
    @classmethod
    def title_not_blank(cls, value):
        if not value.strip():
            raise ValueError('Enter a pool title')
        return value.strip()

    @field_validator('cards')
    @classmethod
    def distinct_cards(cls, value):
        if len({card.item_id for card in value}) != len(value):
            raise ValueError('Select each card once')
        return value


class PoolUpdateRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_version: int = Field(ge=1)
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=5000)
    cost_coins: Optional[int] = Field(None, ge=1, le=1000000)
    is_active: Optional[bool] = None
    rarity_weights: Optional[RarityWeights] = None
    cards: Optional[list[PoolCardInput]] = Field(None, max_length=500)

    @field_validator('title')
    @classmethod
    def title_not_blank(cls, value):
        return PoolCreateRequest.title_not_blank(value) if value is not None else value

    @field_validator('cards')
    @classmethod
    def distinct_cards(cls, value):
        return PoolCreateRequest.distinct_cards(value) if value is not None else value


class RollRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    expected_cost: int = Field(ge=1)
    expected_version: int = Field(ge=1)
    operation_key: str = Field(min_length=8, max_length=128, pattern=r'^[A-Za-z0-9_-]+$')


class RollResponse(BaseModel):
    roll_id: int
    pool_id: int
    winning_card: ShopItemResponse
    animation_cards: list[ShopItemResponse]
    winning_index: int
    new_balance: int
    cost_paid: int
    is_duplicate: bool
    refund_coins: int
    message: str
