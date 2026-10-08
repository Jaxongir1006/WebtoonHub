from sqlalchemy import BigInteger, Column, Computed, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base, BigIntId
from app.modules.users.models import User


class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    friend_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pair_low = Column(BigInteger, Computed('CASE WHEN user_id < friend_id THEN user_id ELSE friend_id END', persisted=True))
    pair_high = Column(BigInteger, Computed('CASE WHEN user_id < friend_id THEN friend_id ELSE user_id END', persisted=True))
    status = Column(String(20), default="pending", nullable=False)  # pending, accepted, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "friend_id", name="uq_friendship_user_friend"),
        UniqueConstraint('pair_low', 'pair_high', name='uq_friendship_pair'),
    )

    user = relationship("User", foreign_keys=[user_id], back_populates="sent_friend_requests")
    friend = relationship("User", foreign_keys=[friend_id], back_populates="received_friend_requests")
