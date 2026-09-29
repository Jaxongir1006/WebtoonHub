from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base, BigIntId


class ShopItem(Base):
    __tablename__ = "shop_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    item_type = Column(String(20), nullable=False, index=True) # frame, background
    price_coins = Column(Integer, nullable=False)
    asset_url = Column(String(500), nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    inventories = relationship("UserInventory", back_populates="item", cascade="all, delete-orphan")


class UserInventory(Base):
    __tablename__ = "user_inventory"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("shop_items.id", ondelete="CASCADE"), nullable=False, index=True)
    is_active = Column(Boolean, default=False, nullable=False)
    purchased_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "item_id", name="uq_user_shop_item"),
    )

    user = relationship("User", back_populates="inventory")
    item = relationship("ShopItem", back_populates="inventories")
