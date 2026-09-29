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
        if await db.scalar(select(Role.id).limit(1)) is not None:
            raise RuntimeError("Roles already exist; bootstrap requires a fresh database")

        permissions = [Permission(**entry) for entry in DEFAULT_PERMISSIONS]
        role = Role(
            name="superadmin",
            description="Full platform administration",
            permissions=permissions,
        )
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
