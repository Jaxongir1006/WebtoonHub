"""Create the first staff superadmin without seeding sample content."""

import argparse
import asyncio
import getpass

import app.models  # Register every SQLAlchemy model before opening a session.
from pydantic import EmailStr, TypeAdapter
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.modules.staff.models import Permission, Role, StaffUser
from app.modules.staff.permissions import DEFAULT_PERMISSIONS


async def create_admin(username: str, email: str, password: str) -> None:
    async with AsyncSessionLocal() as db:
        if await db.scalar(select(StaffUser.id).limit(1)) is not None:
            raise RuntimeError("Staff accounts already exist; bootstrap requires a fresh database")
        from sqlalchemy.orm import selectinload
        existing = (await db.execute(select(Permission))).scalars().all()
        by_code = {permission.code: permission for permission in existing}
        for entry in DEFAULT_PERMISSIONS:
            by_code.setdefault(entry['code'], Permission(**entry))
        permissions = list(by_code.values())
        role = await db.scalar(select(Role).options(selectinload(Role.permissions)).where(Role.system_key == 'superadmin'))
        if role is None:
            role = Role(name='superadmin', system_key='superadmin', scope='global', description='Full platform administration', permissions=permissions)
        else:
            role.permissions = permissions
        creator = await db.scalar(select(Role).options(selectinload(Role.permissions)).where(Role.system_key == 'creator'))
        if creator is None:
            creator = Role(name='creator', system_key='creator', scope='own_content', description='Manage own works')
        creator.permissions = [permission for permission in permissions if permission.code in {'webtoons:create','webtoons:edit','chapters:create','chapters:edit'}]
        db.add(creator)
        from app.modules.clans.models import ClanLevelConfig
        from app.modules.staff.models import SystemSetting
        if not await db.get(SystemSetting, 'clan_creation_cost'):
            db.add(SystemSetting(key='clan_creation_cost', value='300', description='Clan creation fee'))
        for level in range(1, 6):
            if not await db.get(ClanLevelConfig, level):
                db.add(ClanLevelConfig(level=level, required_xp=1000*level, upgrade_cost_coins=500*level, max_members=15+5*(level-1)))
        db.add(StaffUser(
            username=username,
            email=email,
            hashed_password=hash_password(password),
            role=role,
            is_active=True,
        ))
        await db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--username", required=True)
    parser.add_argument("--email", required=True)
    args = parser.parse_args()

    username = args.username.strip()
    if len(username) < 3 or len(username) > 50:
        parser.error("username must be between 3 and 50 characters")
    email = str(TypeAdapter(EmailStr).validate_python(args.email.strip()))
    password = getpass.getpass("New superadmin password: ")
    if len(password) < 6:
        parser.error("password must be at least 6 characters")

    asyncio.run(create_admin(username, email, password))
    print(f"Created superadmin {username} ({email})")


if __name__ == "__main__":
    main()
