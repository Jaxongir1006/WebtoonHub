from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ReadReward(Base):
    __tablename__ = "read_rewards"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_id = Column(BigInteger, ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    coins_earned = Column(Integer, default=5, nullable=False)
    claimed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "chapter_id", name="uq_user_chapter_reward"),
    )

    user = relationship("User", back_populates="read_rewards")
    chapter = relationship("Chapter", back_populates="rewards")


class CoinTransaction(Base):
    __tablename__ = "coin_transactions"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # musbat: kirim, manfiy: chiqim
    transaction_type = Column(String(50), nullable=False, index=True)  # register_bonus, daily_checkin, chapter_read, shop_purchase, admin_adjustment, admin_gift
    description = Column(Text, nullable=True)
    created_by_staff_id = Column(Integer, ForeignKey("staff_users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    user = relationship("User", back_populates="coin_transactions")
    staff = relationship("StaffUser")
