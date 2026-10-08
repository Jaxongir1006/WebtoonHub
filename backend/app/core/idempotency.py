"""Persist a receipt in the same transaction as each coin-changing intent."""
import hashlib
import json
import re

from fastapi import HTTPException
from sqlalchemy import Column, DateTime, String, Text, UniqueConstraint, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from app.core.database import Base, BigIntId


class OperationReceipt(Base):
    __tablename__ = 'operation_receipts'
    id = Column(BigIntId, primary_key=True, autoincrement=True)
    actor = Column(String(64), nullable=False)
    operation_key = Column(String(128), nullable=False)
    namespace = Column(String(128), nullable=False)
    request_hash = Column(String(64), nullable=False)
    response_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    __table_args__ = (UniqueConstraint('actor', 'operation_key', name='uq_operation_actor_key'),)


async def begin_operation(db, actor, namespace, operation_key, payload):
    """Reserve after entity locks; a conflicting insert waits for the first commit."""
    if operation_key is None:  # Internal service calls retain their existing API.
        return None, None
    if not re.fullmatch(r'[A-Za-z0-9_-]{8,128}', operation_key):
        raise HTTPException(422, 'Provide a valid operation key')
    serialized = json.dumps({'namespace': namespace, 'payload': payload}, sort_keys=True, separators=(',', ':'), ensure_ascii=False)
    digest = hashlib.sha256(serialized.encode()).hexdigest()
    values = dict(actor=actor, operation_key=operation_key, namespace=namespace, request_hash=digest)
    insert = sqlite_insert if db.bind.dialect.name == 'sqlite' else pg_insert
    result = await db.execute(insert(OperationReceipt).values(**values).on_conflict_do_nothing(
        index_elements=['actor', 'operation_key']).returning(OperationReceipt.id))
    inserted = result.scalar_one_or_none()
    receipt = await db.scalar(select(OperationReceipt).where(
        OperationReceipt.actor == actor, OperationReceipt.operation_key == operation_key).execution_options(populate_existing=True))
    if receipt.request_hash != digest or receipt.namespace != namespace:
        raise HTTPException(409, 'Operation key was already used for a different action')
    if inserted is None:
        if receipt.response_json is None:
            raise HTTPException(409, 'Operation is still in progress; retry with the same key')
        return receipt, json.loads(receipt.response_json)
    return receipt, None


async def commit_operation(db, receipt, response):
    if receipt is not None:
        value = response.model_dump(mode='json') if hasattr(response, 'model_dump') else response
        receipt.response_json = json.dumps(value, separators=(',', ':'), ensure_ascii=False)
    await db.commit()
