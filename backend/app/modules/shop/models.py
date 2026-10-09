from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, DateTime, ForeignKey, ForeignKeyConstraint, Integer, String, UniqueConstraint, func, false
from sqlalchemy.orm import relationship
from app.core.database import Base, BigIntId


class ShopItem(Base):
    __tablename__ = "shop_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    item_type = Column(String(20), nullable=False, index=True) # frame, background
    price_coins = Column(Integer, nullable=False)
    asset_url = Column(String(500), nullable=False)
    rarity = Column(String(20), nullable=True)
    character_name = Column(String(100), nullable=True)
    series_title = Column(String(255), nullable=True)
    webtoon_id = Column(BigIntId, ForeignKey('webtoons.id', name='fk_shop_item_webtoon', ondelete='SET NULL'), nullable=True)
    asset_preview_url = Column(String(500), nullable=True)
    asset_animated = Column(Boolean, default=False, server_default=false(), nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    inventories = relationship("UserInventory", back_populates="item", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("item_type != 'card' OR price_coins = 0", name='ck_character_card_no_price'),)


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


class UserFeaturedCard(Base):
    __tablename__ = 'user_featured_cards'
    user_id = Column(BigIntId, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    item_id = Column(Integer, ForeignKey('shop_items.id', ondelete='CASCADE'), primary_key=True)
    order_index = Column(Integer, nullable=False)
    __table_args__ = (
        ForeignKeyConstraint(['user_id', 'item_id'], ['user_inventory.user_id', 'user_inventory.item_id'], ondelete='CASCADE'),
        UniqueConstraint('user_id', 'order_index', name='uq_user_featured_card_order'),
    )
