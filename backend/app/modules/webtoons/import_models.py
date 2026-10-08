"""Durable private upload state; chapters appear only when all pages finalize."""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Float, String, Text, UniqueConstraint, func
from app.core.database import Base, BigIntId


class ChapterImport(Base):
    __tablename__ = 'chapter_imports'
    id = Column(String(36), primary_key=True)
    staff_id = Column(Integer, ForeignKey('staff_users.id', ondelete='CASCADE'), nullable=False, index=True)
    webtoon_id = Column(BigIntId, ForeignKey('webtoons.id', ondelete='CASCADE'), nullable=False, index=True)
    chapter_number = Column(Float, nullable=False)
    title = Column(String(255), nullable=True)
    reward_coins = Column(Integer, nullable=False)
    idempotency_key = Column(String(128), nullable=False)
    request_hash = Column(String(64), nullable=False)
    manifest_json = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default='uploading')
    chapter_id = Column(BigIntId, ForeignKey('chapters.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    __table_args__ = (UniqueConstraint('staff_id', 'idempotency_key', name='uq_chapter_import_owner_key'),)


class ChapterImportPage(Base):
    __tablename__ = 'chapter_import_pages'
    id = Column(BigIntId, primary_key=True, autoincrement=True)
    import_id = Column(String(36), ForeignKey('chapter_imports.id', ondelete='CASCADE'), nullable=False, index=True)
    page_index = Column(Integer, nullable=False)
    original_name = Column(String(255), nullable=False)
    source_size = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False)
    staging_name = Column(String(120), nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    __table_args__ = (UniqueConstraint('import_id', 'page_index', name='uq_chapter_import_page_slot'),)
