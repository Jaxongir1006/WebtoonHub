import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.storage import StorageService
from app.modules.auth.dependencies import get_current_user, get_optional_user
from app.modules.shop.schemas import ShopItemUpdateRequest, ShopBuyRequest, FeaturedCardsRequest, card_fields
from app.modules.shop.collection import collection_summary, feature_cards
from app.core.card_media import MAX_CARD_BYTES, save_card_async
from app.core.background_media import save_background_async
from app.modules.shop.service import ShopService
from app.modules.staff.dependencies import require_permission, require_any_permission
from app.modules.staff.models import StaffUser
from app.modules.users.models import User

client_router = APIRouter(prefix="/shop", tags=["Shop & Inventory (User)"])
staff_router = APIRouter(prefix="/staff/shop", tags=["Shop Management (Staff)"])


# 1. List Shop Items
@client_router.get("/items", status_code=status.HTTP_200_OK)
async def list_shop_items(
    item_type: Optional[str] = Query(None, pattern=r"^(frame|background|card)$"),
    user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = user.id if user else None
    items = await ShopService.list_items(db, user_id=user_id, item_type=item_type)
    return {
        "success": True,
        "data": items
    }


# 2. Get User Inventory
@client_router.get("/inventory", status_code=status.HTTP_200_OK)
async def get_my_inventory(
    item_type: Optional[str] = Query(None, pattern=r"^(frame|background|card)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    items = await ShopService.list_user_inventory(db, user_id=user.id, item_type=item_type)
    return {
        "success": True,
        "data": items
    }


# 3. Buy Shop Item with Chaqmoq
@client_router.post("/buy/{item_id}", status_code=status.HTTP_200_OK)
async def buy_item(
    item_id: int,
    data: ShopBuyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    receipt = await ShopService.buy_item(db, user.id, item_id, data.expected_price)
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
    name: str = Form(..., min_length=1, max_length=100),
    item_type: str = Form(..., pattern=r"^(frame|background|card)$"),
    price_coins: Optional[int] = Form(None, ge=0),
    asset_file: Optional[UploadFile] = File(None),
    asset_url: Optional[str] = Form(None),
    rarity: Optional[str] = Form(None, pattern=r'^(common|rare|epic|legendary)$'),
    character_name: Optional[str] = Form(None, max_length=100),
    series_title: Optional[str] = Form(None, max_length=255),
    webtoon_id: Optional[int] = Form(None, gt=0),
    _staff: StaffUser = Depends(require_permission("shop:manage")),
    db: AsyncSession = Depends(get_db)
):
    item = await ShopService.create_item(
        db=db,
        name=name,
        item_type=item_type,
        price_coins=price_coins,
        asset_file=asset_file,
        asset_url=asset_url, rarity=rarity, character_name=character_name, series_title=series_title, webtoon_id=webtoon_id
    )
    return {
        "success": True,
        "data": {
            "id": item.id,
            "name": item.name,
            "item_type": item.item_type,
            "price_coins": item.price_coins,
            "asset_url": item.asset_url, **card_fields(item), "owned_count": 0, "identity_locked": False
        },
        "message": "Do'konga yangi buyum muvaffaqiyatli joylandi"
    }


# 6. List All Shop Items (Staff)
@staff_router.get("/items", status_code=status.HTTP_200_OK)
async def list_staff_items(
    _staff: StaffUser = Depends(require_any_permission("shop:manage", "wheel:manage", "settings:manage")),
    db: AsyncSession = Depends(get_db)
):
    items = await ShopService.list_staff_items(db)
    return {
        "success": True,
        "data": items
    }


# 7. Update Shop Item (Staff)
@staff_router.get('/series')
async def list_linkable_series(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=255),
    _staff: StaffUser = Depends(require_permission('shop:manage')), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import select, func
    from app.modules.webtoons.models import Webtoon
    condition = Webtoon.title.ilike('%' + search.strip() + '%') if search and search.strip() else None
    query = select(Webtoon.id, Webtoon.title, Webtoon.type)
    count = select(func.count(Webtoon.id))
    if condition is not None:
        query, count = query.where(condition), count.where(condition)
    total = await db.scalar(count)
    rows = (await db.execute(query.order_by(Webtoon.title, Webtoon.id).offset((page-1)*limit).limit(limit))).all()
    return {'success': True, 'data': {'items': [{'id': row.id, 'title': row.title, 'type': row.type} for row in rows],
        'total': total, 'page': page, 'limit': limit}}


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
        asset_url=data.asset_url,
        is_available=data.is_available, rarity=data.rarity, character_name=data.character_name,
        series_title=data.series_title, webtoon_id=data.webtoon_id, metadata_fields=data.model_fields_set
    )
    from sqlalchemy import func, select
    from app.modules.shop.models import UserInventory
    from app.modules.clans.models import ClanInventory
    personal_count = await db.scalar(select(func.count()).select_from(UserInventory).where(UserInventory.item_id == item.id))
    clan_count = await db.scalar(select(func.count()).select_from(ClanInventory).where(ClanInventory.item_id == item.id))
    owned_count = personal_count + clan_count
    return {
        "success": True,
        "data": {
            "id": item.id,
            "name": item.name,
            "price_coins": item.price_coins,
            "asset_url": item.asset_url,
            "is_available": item.is_available, "item_type": item.item_type, **card_fields(item),
            "owned_count": owned_count, "identity_locked": item.item_type == 'card' and personal_count > 0
        },
        "message": "Buyum muvaffaqiyatli yangilandi"
    }


# 7.1 Upload Shop Asset File (Staff)
@staff_router.post("/items/upload-asset", status_code=status.HTTP_200_OK)
@staff_router.post("/shop/items/upload-asset", status_code=status.HTTP_200_OK)
async def upload_shop_asset(
    file: UploadFile = File(...),
    item_type: str = Form("frame", pattern=r'^(frame|background|card)$'),
    _staff: StaffUser = Depends(require_permission("shop:manage")),
):
    if item_type == 'card':
        data = await save_card_async(await file.read(MAX_CARD_BYTES + 1))
        return {'success': True, 'data': data, 'message': 'Card artwork uploaded'}
    if item_type == 'background':
        data = await save_background_async(await file.read(20 * 1024 * 1024 + 1), file.filename or 'background.png')
        return {'success': True, 'data': data, 'message': 'Background artwork uploaded'}
    ext = os.path.splitext(file.filename or "")[1].lower() or ".png"
    folder = "frames" if item_type == "frame" else "backgrounds"
    object_name = f"{folder}/asset_{uuid.uuid4().hex[:10]}{ext}"
    content = await file.read(20*1024*1024+1)
    content_type = "image/svg+xml" if ext == ".svg" else (file.content_type or "image/png")

    asset_url = await StorageService.upload_file_async(
        bucket_name=settings.MINIO_BUCKET_SHOP,
        object_name=object_name,
        data=content,
        content_type=content_type
    )
    return {
        "success": True,
        "data": {
            "asset_url": asset_url
        },
        "message": "Fayl muvaffaqiyatli yuklandi"
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


@client_router.get('/collection')
async def get_collection(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    summary = await collection_summary(db, user.id)
    summary['cards'] = await ShopService.list_user_inventory(db, user.id, 'card')
    return {'success': True, 'data': summary}


@client_router.get('/collection/{user_id}')
async def get_public_collection(user_id: int, db: AsyncSession = Depends(get_db)):
    target = await db.get(User, user_id)
    if target is None or not target.is_active:
        from fastapi import HTTPException
        raise HTTPException(404, 'User not found')
    return {'success': True, 'data': await collection_summary(db, user_id)}


@client_router.put('/collection/featured')
async def update_featured_cards(data: FeaturedCardsRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return {'success': True, 'data': await feature_cards(db, user.id, data.item_ids)}
