"""Read local staff credentials for manual integration scripts."""

from pathlib import Path

from app.core.config import settings


def staff_credentials() -> tuple[str, str]:
    if settings.SEED_ADMIN_EMAIL and settings.SEED_ADMIN_PASSWORD:
        return settings.SEED_ADMIN_EMAIL, settings.SEED_ADMIN_PASSWORD

    credentials_file = Path(__file__).resolve().parents[1] / ".local-seed-credentials.txt"
    if credentials_file.exists():
        for line in credentials_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("admin@webtoonhub.uz: "):
                return line.split(": ", 1)[0], line.split(": ", 1)[1]

    raise RuntimeError("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD for staff integration tests")
