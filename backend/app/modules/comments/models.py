from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base, BigIntId


class Comment(Base):
    __tablename__ = "comments"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    chapter_id = Column(BigInteger, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(BigInteger, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="comments")
    chapter = relationship("Chapter", back_populates="comments")
    parent = relationship("Comment", remote_side=[id], back_populates="replies")
    replies = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")
