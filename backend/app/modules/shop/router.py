from typing import Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, get_optional_user
from app.modules.shop.schemas import ShopItemUpdateRequest
from app.modules.shop.service import ShopService
from app.modules.staff.dependencies import require_permission
from app.modules.staff.models import StaffUser
from app.modules.users.models import User

client_router = APIRouter(prefix="/shop", tags=["Shop & Inventory (User)"])
staff_router = APIRouter(prefix="/staff/shop", tags=["Shop Management (Staff)"])


# 1. List Shop Items
@client_router.get("/items", status_code=status.HTTP_200_OK)
async def list_shop_items(
    item_type: Optional[str] = Query(None, pattern=r"^(frame|background)$"),
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = user.id if user else None
    items = await ShopService.list_items(db, user_id=user_id, item_type=item_type)
    return {
        "success": True,
        "data": items
    }


# 2. Buy Shop Item with Chaqmoq
@client_router.post("/buy/{item_id}", status_code=status.HTTP_200_OK)
async def buy_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    receipt = await ShopService.buy_item(db, user.id, item_id)
    return {
        "success": True,
        "data": receipt,
        "message": "Buyum muvaffaqiyatli xarid qilindi va inventaringizga qo'shildi!"
    }


# 3. Equip Item on Profile
@client_router.post("/equip/{item_id}", status_code=status.HTTP_200_OK)
async def equip_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    equipped = await ShopService.equip_item(db, user.id, item_id)
    return {
        "success": True,
        "data": equipped,
        "message": "Buyum profilingizga muvaffaqiyatli o'rnatildi"
    }


# 4. Unequip Item from Profile
@client_router.post("/unequip/{item_id}", status_code=status.HTTP_200_OK)
async def unequip_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await ShopService.unequip_item(db, user.id, item_id)
    return {
        "success": True,
        "data": None,
        "message": "Buyum profildan yechildi"
    }


# 5. Create Shop Item (Staff)
@staff_router.post("/items", status_code=status.HTTP_201_CREATED)
async def create_shop_item(
    name: str = Form(...),
    item_type: str = Form(..., pattern=r"^(frame|background)$"),
    price_coins: int = Form(..., ge=1),
    asset_file: Optional[UploadFile] = File(None),
    asset_url: Optional[str] = Form(None),
    _staff: StaffUser = Depends(require_permission("shop:manage")),
    db: AsyncSession = Depends(get_db)
):
    item = await ShopService.create_item(
        db=db,
        name=name,
        item_type=item_type,
        price_coins=price_coins,
        asset_file=asset_file,
        asset_url=asset_url
    )
    return {
        "success": True,
        "data": {
            "id": item.id,
            "name": item.name,
            "item_type": item.item_type,
            "price_coins": item.price_coins,
            "asset_url": item.asset_url
        },
        "message": "Do'konga yangi buyum muvaffaqiyatli joylandi"
    }


# 6. List All Shop Items (Staff)
@staff_router.get("/items", status_code=status.HTTP_200_OK)
async def list_staff_items(
    _staff: StaffUser = Depends(require_permission("shop:manage")),
    db: AsyncSession = Depends(get_db)
):
    items = await ShopService.list_staff_items(db)
    return {
        "success": True,
        "data": items
    }


# 7. Update Shop Item (Staff)
@staff_router.patch("/items/{id}", status_code=status.HTTP_200_OK)
async def update_shop_item(
    id: int,
    data: ShopItemUpdateRequest,
    _staff: StaffUser = Depends(require_permission("shop:manage")),
    db: AsyncSession = Depends(get_db)
):
    item = await ShopService.update_item(
        db=db,
        item_id=id,
        name=data.name,
        price_coins=data.price_coins,
        is_available=data.is_available
    )
    return {
        "success": True,
        "data": {
            "id": item.id,
            "name": item.name,
            "price_coins": item.price_coins,
            "is_available": item.is_available
        },
        "message": "Buyum muvaffaqiyatli yangilandi"
    }


# 8. Delete Shop Item (Staff)
@staff_router.delete("/items/{id}", status_code=status.HTTP_200_OK)
async def delete_shop_item(
    id: int,
    _staff: StaffUser = Depends(require_permission("shop:manage")),
    db: AsyncSession = Depends(get_db)
):
    await ShopService.delete_item(db, id)
    return {
        "success": True,
        "data": None,
        "message": "Buyum do'kondan muvaffaqiyatli o'chirildi"
    }
