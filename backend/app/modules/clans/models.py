from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base, BigIntId
from app.modules.users.models import User


class Clan(Base):
    __tablename__ = "clans"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    tag = Column(String(10), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    frame_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    leader_id = Column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    level = Column(Integer, default=1, nullable=False)
    xp = Column(Integer, default=0, nullable=False)
    max_members = Column(Integer, default=15, nullable=False)
    is_recruiting = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    leader = relationship("User", foreign_keys=[leader_id])
    members = relationship("ClanMember", back_populates="clan", cascade="all, delete-orphan")
    messages = relationship("ClanMessage", back_populates="clan", cascade="all, delete-orphan")


class ClanMember(Base):
    __tablename__ = "clan_members"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    clan_id = Column(BigInteger, ForeignKey("clans.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    role = Column(String(20), default="member", nullable=False)  # leader, co_leader, elder, member
    contribution_points = Column(Integer, default=0, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    clan = relationship("Clan", back_populates="members")
    user = relationship("User", back_populates="clan_membership")


class ClanLevelConfig(Base):
    __tablename__ = "clan_level_configs"

    level = Column(Integer, primary_key=True, index=True)
    required_xp = Column(Integer, nullable=False)
    upgrade_cost_coins = Column(Integer, nullable=False)
    max_members = Column(Integer, nullable=False)
    perks_description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ClanMessage(Base):
    __tablename__ = "clan_messages"

    id = Column(BigIntId, primary_key=True, index=True, autoincrement=True)
    clan_id = Column(BigInteger, ForeignKey("clans.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    message_type = Column(String(20), default="text", nullable=False)  # text, system
    content = Column(Text, nullable=False)
    client_message_id = Column(String(64), nullable=True)
    __table_args__ = (UniqueConstraint("user_id", "client_message_id", name="uq_clan_client_message"),)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    clan = relationship("Clan", back_populates="messages")
    user = relationship("User")
