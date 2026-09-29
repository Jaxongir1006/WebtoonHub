from datetime import datetime
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base, BigIntId


class Wheel(Base):
    __tablename__ = "wheels"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    cost_coins = Column(Integer, default=100, nullable=False)
    has_daily_free_spin = Column(Boolean, default=True, nullable=False)
    icon = Column(String(50), default="sparkles", nullable=False)
    color = Column(String(30), default="#F59E0B", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    order_index = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    items = relationship("WheelItem", back_populates="wheel", cascade="all, delete-orphan", order_by="WheelItem.order_index")
    spins = relationship("WheelSpin", back_populates="wheel", cascade="all, delete-orphan")


class WheelItem(Base):
    __tablename__ = "wheel_items"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    wheel_id = Column(BigIntId, ForeignKey("wheels.id", ondelete="CASCADE"), nullable=False, index=True)
    reward_type = Column(String(30), nullable=False, default="coins")  # 'coins' | 'shop_item'
    reward_coins = Column(Integer, nullable=True, default=0)
    shop_item_id = Column(Integer, ForeignKey("shop_items.id", ondelete="SET NULL"), nullable=True)
    label = Column(String(100), nullable=False)
    color = Column(String(30), default="#F59E0B", nullable=False)
    text_color = Column(String(30), default="#FFFFFF", nullable=False)
    icon = Column(String(50), default="coins", nullable=False)
    weight = Column(Integer, default=10, nullable=False)  # Relative probability weight
    is_jackpot = Column(Boolean, default=False, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    wheel = relationship("Wheel", back_populates="items")
    shop_item = relationship("ShopItem")


class WheelSpin(Base):
    __tablename__ = "wheel_spins"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    wheel_id = Column(BigIntId, ForeignKey("wheels.id", ondelete="CASCADE"), nullable=False, index=True)
    wheel_item_id = Column(BigIntId, ForeignKey("wheel_items.id", ondelete="SET NULL"), nullable=True)
    is_free_spin = Column(Boolean, default=False, nullable=False)
    cost_paid = Column(Integer, default=0, nullable=False)
    reward_type = Column(String(30), nullable=False)  # 'coins' | 'shop_item'
    reward_coins = Column(Integer, default=0, nullable=False)
    shop_item_id = Column(Integer, nullable=True)
    reward_label = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    user = relationship("User")
    wheel = relationship("Wheel", back_populates="spins")
    wheel_item = relationship("WheelItem")
