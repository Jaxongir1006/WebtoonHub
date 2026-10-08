"""Rotate only accounts still using the original published seed passwords."""

from pathlib import Path
import os
import secrets

import bcrypt
from sqlalchemy import create_engine, text

from app.core.config import settings


ROOT = Path(__file__).resolve().parents[1]
LEGACY = [
    ("staff_users", "admin@webtoonhub.uz", "AdminPassword123"),
    ("users", "ali@webtoonhub.uz", "Password123!"),
    ("users", "madina@webtoonhub.uz", "Password123!"),
]


def main() -> None:
    url = settings.DATABASE_URL.replace("+aiosqlite", "+pysqlite").replace("+asyncpg", "+psycopg2")
    engine = create_engine(url)
    output = ROOT / ".local-seed-credentials.txt"
    if output.exists():
        raise RuntimeError(f"Move or securely store {output} before another rotation")

    rotations = []
    with engine.connect() as connection:
        for table, email, old_password in LEGACY:
            row = connection.execute(text(f"SELECT hashed_password FROM {table} WHERE email = :email"), {"email": email}).first()
            if row and bcrypt.checkpw(old_password.encode(), row.hashed_password.encode()):
                rotations.append((table, email, secrets.token_urlsafe(24)))

    if rotations:
        temporary = output.with_suffix(".txt.tmp")
        temporary.write_text("Rotated local seed credentials\n" + "\n".join(
            f"{email}: {password}" for _, email, password in rotations
        ) + "\n", encoding="utf-8")
        try:
            os.chmod(temporary, 0o600)
            with engine.begin() as connection:
                for table, email, password in rotations:
                    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
                    connection.execute(text(f"UPDATE {table} SET hashed_password = :password WHERE email = :email"),
                                       {"password": password_hash, "email": email})
            temporary.replace(output)
        except Exception:
            temporary.unlink(missing_ok=True)
            raise

    env_file = ROOT / ".env"
    if env_file.exists():
        source = env_file.read_text(encoding="utf-8")
        old_secret = "super-secret-development-key-change-this-in-production-min32chars"
        if f"SECRET_KEY={old_secret}" in source:
            env_file.write_text(source.replace(f"SECRET_KEY={old_secret}",
                                               f"SECRET_KEY={secrets.token_urlsafe(48)}"), encoding="utf-8")
            print("Local JWT signing secret rotated; restart the API to activate it")

    print(f"Rotated {len(rotations)} legacy accounts")
    if rotations:
        print(f"New credentials saved to {output}")


if __name__ == "__main__":
    main()
