from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, get_optional_user
from app.modules.gacha.schemas import PoolCreateRequest, PoolUpdateRequest, RollRequest
from app.modules.gacha.service import GachaService
from app.modules.staff.dependencies import require_any_permission
from app.modules.staff.models import StaffUser
from app.modules.users.models import User

client_router = APIRouter(prefix='/gacha', tags=['Character Card Gacha'])
staff_router = APIRouter(prefix='/staff/gacha', tags=['Character Card Gacha Management'])
manage_gacha = require_any_permission('wheel:manage', 'shop:manage', 'settings:manage')


@client_router.get('/pools')
async def list_pools(user: Optional[User] = Depends(get_optional_user), db: AsyncSession = Depends(get_db)):
    return {'success': True, 'data': await GachaService.list_pools(db, user.id if user else None)}


@client_router.get('/pools/{pool_id}')
async def pool_detail(pool_id: int, user: Optional[User] = Depends(get_optional_user), db: AsyncSession = Depends(get_db)):
    return {'success': True, 'data': await GachaService.detail(db, pool_id, user.id if user else None)}


@client_router.post('/pools/{pool_id}/roll')
async def roll(pool_id: int, intent: RollRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await GachaService.roll(db, user.id, pool_id, intent)
    return {'success': True, 'data': result, 'message': result.message}


@client_router.get('/history')
async def history(limit: int = Query(20, ge=1, le=50), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return {'success': True, 'data': await GachaService.history(db, user_id=user.id, limit=limit)}


@staff_router.get('/pools')
async def staff_pools(_staff: StaffUser = Depends(manage_gacha), db: AsyncSession = Depends(get_db)):
    return {'success': True, 'data': await GachaService.list_pools(db, staff=True)}


@staff_router.post('/pools', status_code=201)
async def create_pool(data: PoolCreateRequest, _staff: StaffUser = Depends(manage_gacha), db: AsyncSession = Depends(get_db)):
    return {'success': True, 'data': await GachaService.configure(db, data)}


@staff_router.patch('/pools/{pool_id}')
async def update_pool(pool_id: int, data: PoolUpdateRequest, _staff: StaffUser = Depends(manage_gacha), db: AsyncSession = Depends(get_db)):
    return {'success': True, 'data': await GachaService.configure(db, data, pool_id)}


@staff_router.delete('/pools/{pool_id}')
async def archive_pool(pool_id: int, _staff: StaffUser = Depends(manage_gacha), db: AsyncSession = Depends(get_db)):
    await GachaService.archive(db, pool_id)
    return {'success': True, 'data': None, 'message': 'Pool archived; draw history retained'}


@staff_router.get('/pools/{pool_id}/history')
async def staff_history(pool_id: int, limit: int = Query(50, ge=1, le=100), _staff: StaffUser = Depends(manage_gacha), db: AsyncSession = Depends(get_db)):
    return {'success': True, 'data': await GachaService.history(db, pool_id=pool_id, limit=limit, staff=True)}
