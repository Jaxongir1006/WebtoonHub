from sqlalchemy import BigInteger, Column, DateTime, Float, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base, BigIntId


class WebtoonGenre(Base):
    __tablename__ = "webtoon_genres"

    webtoon_id = Column(BigInteger, ForeignKey("webtoons.id", ondelete="CASCADE"), primary_key=True)
    genre_id = Column(Integer, ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True)


class Genre(Base):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(60), unique=True, index=True, nullable=False)

    webtoons = relationship("Webtoon", secondary="webtoon_genres", back_populates="genres")


class Webtoon(Base):
    __tablename__ = "webtoons"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), index=True, nullable=False)
    slug = Column(String(280), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(20), default="manhwa", nullable=False, index=True) # manhwa, manga, novel
    cover_image_url = Column(String(500), nullable=False)
    author_name = Column(String(100), nullable=True)
    uploader_staff_id = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    status = Column(String(20), default="ongoing", nullable=False) # ongoing, completed
    view_count = Column(BigInteger, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    genres = relationship("Genre", secondary="webtoon_genres", back_populates="webtoons")
    chapters = relationship("Chapter", back_populates="webtoon", cascade="all, delete-orphan", order_by="Chapter.chapter_number.asc()")
    uploader = relationship("StaffUser", back_populates="webtoons")
    bookmarks = relationship("Bookmark", back_populates="webtoon", cascade="all, delete-orphan")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    webtoon_id = Column(BigInteger, ForeignKey("webtoons.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_number = Column(Float, nullable=False, index=True)
    title = Column(String(255), nullable=True)
    status = Column(String(20), default="pending", nullable=False, index=True) # pending, published, rejected
    content_text = Column(Text, nullable=True) # Markdown/rich text for novel chapters
    reward_coins = Column(Integer, default=5, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    webtoon = relationship("Webtoon", back_populates="chapters")
    images = relationship("ChapterImage", back_populates="chapter", cascade="all, delete-orphan", order_by="ChapterImage.order_index.asc()")
    comments = relationship("Comment", back_populates="chapter", cascade="all, delete-orphan")
    rewards = relationship("ReadReward", back_populates="chapter", cascade="all, delete-orphan")


class ChapterImage(Base):
    __tablename__ = "chapter_images"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    chapter_id = Column(BigInteger, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    order_index = Column(Integer, nullable=False, index=True)

    chapter = relationship("Chapter", back_populates="images")
