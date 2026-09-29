from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base, BigIntId


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    webtoon_id = Column(BigInteger, ForeignKey("webtoons.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="reading", nullable=False, index=True) # reading, plan_to_read, completed, dropped
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "webtoon_id", name="uq_user_webtoon_bookmark"),
    )

    user = relationship("User", back_populates="bookmarks")
    webtoon = relationship("Webtoon", back_populates="bookmarks")
