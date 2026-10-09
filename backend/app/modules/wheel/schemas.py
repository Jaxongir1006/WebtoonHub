from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.modules.shop.schemas import CardFields


# ----------------------------------------------------
# Nested Shop Item Schema for Wheel Item
# ----------------------------------------------------
class WheelShopItemInfo(CardFields):
    id: int
    name: str
    item_type: str
    price_coins: int
    asset_url: str

    model_config = {"from_attributes": True}


# ----------------------------------------------------
# Wheel Item Schemas
# ----------------------------------------------------
class WheelItemResponse(BaseModel):
    id: int
    wheel_id: int
    reward_type: str  # 'coins' | 'shop_item'
    reward_coins: int = 0
    shop_item_id: Optional[int] = None
    shop_item: Optional[WheelShopItemInfo] = None
    label: str
    color: str
    text_color: str
    icon: str
    weight: int
    probability_percent: float = 0.0
    is_jackpot: bool
    order_index: int

    model_config = {"from_attributes": True}


class WheelItemCreateRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    reward_type: Literal['coins'] = 'coins'
    reward_coins: int = Field(0, ge=0, le=1000000)
    shop_item_id: None = None
    label: str = Field(..., min_length=1, max_length=100)
    color: str = Field("#F59E0B", max_length=30)
    text_color: str = Field("#FFFFFF", max_length=30)
    icon: str = Field("coins", max_length=50)
    weight: int = Field(10, ge=1, le=10000)
    is_jackpot: bool = False
    order_index: int = 0


class WheelItemUpdateRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    reward_type: Optional[Literal['coins']] = None
    reward_coins: Optional[int] = Field(None, ge=0, le=1000000)
    shop_item_id: None = None
    label: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = None
    text_color: Optional[str] = None
    icon: Optional[str] = None
    weight: Optional[int] = Field(None, ge=1, le=10000)
    is_jackpot: Optional[bool] = None
    order_index: Optional[int] = None


# ----------------------------------------------------
# Wheel Schemas
# ----------------------------------------------------
class WheelSummaryResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str] = None
    cost_coins: int
    has_daily_free_spin: bool
    is_free_spin_available: bool = False
    icon: str
    color: str
    is_active: bool
    items_count: int

    model_config = {"from_attributes": True}


class WheelDetailResponse(BaseModel):
    id: int
    title: str
    slug: str
    description: Optional[str] = None
    cost_coins: int
    has_daily_free_spin: bool
    is_free_spin_available: bool = False
    icon: str
    color: str
    is_active: bool
    items: List[WheelItemResponse]
    total_spins_count: int = 0

    model_config = {"from_attributes": True}


class WheelCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    slug: Optional[str] = None
    description: Optional[str] = None
    cost_coins: int = Field(100, ge=0)
    has_daily_free_spin: bool = True
    icon: str = "sparkles"
    color: str = "#F59E0B"
    is_active: bool = True
    order_index: int = 0


class WheelUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=100)
    slug: Optional[str] = None
    description: Optional[str] = None
    cost_coins: Optional[int] = Field(None, ge=0)
    has_daily_free_spin: Optional[bool] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    order_index: Optional[int] = None


# ----------------------------------------------------
# Spin Result & History Schemas
# ----------------------------------------------------
class SpinResultResponse(BaseModel):
    spin_id: int
    winning_item: WheelItemResponse
    winning_index: int
    new_balance: int
    is_free_spin: bool
    message: str
    outcome: str = "coins"
    reward_coins: int = 0
    reward_item_name: Optional[str] = None


class SpinHistoryItem(BaseModel):
    id: int
    wheel_id: int
    wheel_title: str
    user_id: int
    user_name: Optional[str] = None
    reward_label: str
    reward_type: str
    reward_coins: int
    shop_item_id: Optional[int] = None
    is_free_spin: bool
    cost_paid: int
    created_at: datetime

    model_config = {"from_attributes": True}
