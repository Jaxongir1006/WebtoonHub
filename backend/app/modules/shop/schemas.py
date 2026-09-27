from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ShopItemResponse(BaseModel):
    id: int
    name: str
    item_type: str
    price_coins: int
    asset_url: str
    is_owned: bool = False

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
    name: Optional[str] = None
    price_coins: Optional[int] = Field(None, ge=1)
    is_available: Optional[bool] = None
