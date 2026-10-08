"""Durable coin-operation receipts and unique unordered friendship pairs."""
from alembic import op
import sqlalchemy as sa

revision = 'aa42ef631d90'
down_revision = '76d9c248ab10'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('operation_receipts',
        sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), primary_key=True, autoincrement=True),
        sa.Column('actor', sa.String(64), nullable=False),
        sa.Column('operation_key', sa.String(128), nullable=False),
        sa.Column('namespace', sa.String(128), nullable=False),
        sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('response_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('actor', 'operation_key', name='uq_operation_actor_key'))
    connection = op.get_bind()
    friendships = sa.table('friendships', sa.column('id', sa.BigInteger()), sa.column('user_id', sa.BigInteger()),
        sa.column('friend_id', sa.BigInteger()), sa.column('status', sa.String()))
    rows = connection.execute(sa.select(friendships).order_by(friendships.c.id)).mappings().all()
    winners = {}
    priority = {'accepted': 0, 'pending': 1, 'rejected': 2}
    for row in rows:
        pair = tuple(sorted((row['user_id'], row['friend_id'])))
        old = winners.get(pair)
        if old is None:
            winners[pair] = row
        elif priority.get(row['status'], 3) < priority.get(old['status'], 3):
            connection.execute(friendships.delete().where(friendships.c.id == old['id']))
            winners[pair] = row
        else:
            connection.execute(friendships.delete().where(friendships.c.id == row['id']))
    # Stored generated columns keep the invariant enforceable and inspectable
    # on both PostgreSQL and SQLite (which cannot reflect expression indexes).
    recreate = 'always' if connection.dialect.name == 'sqlite' else 'auto'
    with op.batch_alter_table('friendships', recreate=recreate) as table:
        table.add_column(sa.Column('pair_low', sa.BigInteger(), sa.Computed(
            'CASE WHEN user_id < friend_id THEN user_id ELSE friend_id END', persisted=True)))
        table.add_column(sa.Column('pair_high', sa.BigInteger(), sa.Computed(
            'CASE WHEN user_id < friend_id THEN friend_id ELSE user_id END', persisted=True)))
        table.create_unique_constraint('uq_friendship_pair', ['pair_low', 'pair_high'])


def downgrade():
    with op.batch_alter_table('friendships') as table:
        table.drop_constraint('uq_friendship_pair', type_='unique')
        table.drop_column('pair_low')
        table.drop_column('pair_high')
    op.drop_table('operation_receipts')
