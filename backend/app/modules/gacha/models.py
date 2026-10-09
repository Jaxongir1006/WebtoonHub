from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base, BigIntId


class GachaPool(Base):
    __tablename__ = 'gacha_pools'
    id = Column(BigIntId, primary_key=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    cost_coins = Column(Integer, nullable=False, default=100)
    is_active = Column(Boolean, nullable=False, default=False)
    version = Column(Integer, nullable=False, default=1)
    rarity_weights = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    cards = relationship('GachaPoolCard', cascade='all, delete-orphan', order_by='GachaPoolCard.item_id')
    __table_args__ = (CheckConstraint('cost_coins >= 1', name='ck_gacha_pool_cost'), CheckConstraint('version >= 1', name='ck_gacha_pool_version'))


class GachaPoolCard(Base):
    __tablename__ = 'gacha_pool_cards'
    id = Column(BigIntId, primary_key=True, autoincrement=True)
    pool_id = Column(BigIntId, ForeignKey('gacha_pools.id', ondelete='CASCADE'), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey('shop_items.id', ondelete='RESTRICT'), nullable=False, index=True)
    weight = Column(Integer, nullable=False, default=1)
    item = relationship('ShopItem')
    __table_args__ = (UniqueConstraint('pool_id', 'item_id', name='uq_gacha_pool_card'), CheckConstraint('weight >= 1', name='ck_gacha_card_weight'))


class GachaRoll(Base):
    __tablename__ = 'gacha_rolls'
    id = Column(BigIntId, primary_key=True, autoincrement=True)
    user_id = Column(BigIntId, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    pool_id = Column(BigIntId, ForeignKey('gacha_pools.id', ondelete='RESTRICT'), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey('shop_items.id', ondelete='RESTRICT'), nullable=False, index=True)
    pool_title = Column(String(100), nullable=False)
    pool_version = Column(Integer, nullable=False)
    card_snapshot = Column(JSON, nullable=False)
    cost_paid = Column(Integer, nullable=False)
    is_duplicate = Column(Boolean, nullable=False)
    refund_coins = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    __table_args__ = (CheckConstraint('cost_paid >= 1 AND refund_coins >= 0 AND refund_coins <= cost_paid', name='ck_gacha_roll_cost_refund'),)
