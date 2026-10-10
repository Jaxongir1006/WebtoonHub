"""Clan cosmetics are purchased and equipped from the shared shop."""
from alembic import op
import sqlalchemy as sa

revision = 'e03d284b918a'
down_revision = 'b840f216da73'
branch_labels = None
depends_on = None

ID = sa.BigInteger().with_variant(sa.Integer(), 'sqlite')


def upgrade():
    op.create_table('clan_inventory',
        sa.Column('id', ID, primary_key=True, autoincrement=True),
        sa.Column('clan_id', sa.BigInteger(), sa.ForeignKey('clans.id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_id', sa.Integer(), sa.ForeignKey('shop_items.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('purchased_by_user_id', sa.BigInteger(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('price_paid', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('purchased_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('clan_id', 'item_id', name='uq_clan_shop_item'),
        sa.CheckConstraint('price_paid >= 0', name='ck_clan_inventory_price_paid'))
    for name in ('id', 'clan_id', 'item_id', 'purchased_by_user_id'):
        op.create_index('ix_clan_inventory_' + name, 'clan_inventory', [name])
    connection = op.get_bind()
    if connection.dialect.name == 'postgresql':
        op.execute('ALTER TABLE public.clan_inventory ENABLE ROW LEVEL SECURITY')
        for role in ('anon', 'authenticated'):
            if connection.scalar(sa.text('SELECT 1 FROM pg_roles WHERE rolname = :role'), {'role': role}):
                op.execute(f'REVOKE ALL ON TABLE public.clan_inventory FROM {role}')
                op.execute(f'REVOKE ALL ON SEQUENCE public.clan_inventory_id_seq FROM {role}')
    # Keep legacy URLs intact for recovery. They no longer grant ownership and
    # are never returned as equipped cosmetics by the application.


def downgrade():
    op.drop_table('clan_inventory')
