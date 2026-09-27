from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class CreatorRequest(Base):
    __tablename__ = "creator_requests"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    message = Column(Text, nullable=False)
    status = Column(String(20), default="pending", nullable=False, index=True) # pending, approved, rejected
    reviewed_by = Column(Integer, ForeignKey("staff_users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    admin_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="creator_request")
    reviewer = relationship("StaffUser")
