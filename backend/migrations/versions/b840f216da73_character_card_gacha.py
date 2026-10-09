"""Separate Lightning wheels, purchasable cosmetics, and character card draws."""
from alembic import op
import sqlalchemy as sa

revision = 'b840f216da73'
down_revision = 'aa42ef631d90'
branch_labels = None
depends_on = None

ID = sa.BigInteger().with_variant(sa.Integer(), 'sqlite')


def upgrade():
    connection = op.get_bind()
    # Historical spin receipts and all existing ownership remain intact.
    op.execute("UPDATE wheel_spins SET wheel_item_id = NULL WHERE wheel_item_id IN (SELECT id FROM wheel_items WHERE reward_type != 'coins' OR shop_item_id IS NOT NULL)")
    op.execute("DELETE FROM wheel_items WHERE reward_type != 'coins' OR shop_item_id IS NOT NULL")
    op.execute("UPDATE wheel_items SET reward_coins = 0 WHERE reward_coins IS NULL OR reward_coins < 0")
    op.execute("UPDATE wheels SET is_active = FALSE WHERE (SELECT COUNT(*) FROM wheel_items WHERE wheel_id = wheels.id) < 2")
    op.execute("UPDATE shop_items SET price_coins = 0 WHERE item_type = 'card'")
    with op.batch_alter_table('shop_items') as table:
        table.create_check_constraint('ck_character_card_no_price', "item_type != 'card' OR price_coins = 0")
    with op.batch_alter_table('wheel_items') as table:
        table.create_check_constraint('ck_wheel_lightning_only', "reward_type = 'coins' AND shop_item_id IS NULL AND COALESCE(reward_coins, 0) >= 0")
    op.create_table('gacha_pools',
        sa.Column('id', ID, primary_key=True, autoincrement=True),
        sa.Column('title', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cost_coins', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('rarity_weights', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('cost_coins >= 1', name='ck_gacha_pool_cost'),
        sa.CheckConstraint('version >= 1', name='ck_gacha_pool_version'))
    op.create_table('gacha_pool_cards',
        sa.Column('id', ID, primary_key=True, autoincrement=True),
        sa.Column('pool_id', ID, sa.ForeignKey('gacha_pools.id', ondelete='CASCADE'), nullable=False),
        sa.Column('item_id', sa.Integer(), sa.ForeignKey('shop_items.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('weight', sa.Integer(), nullable=False),
        sa.UniqueConstraint('pool_id', 'item_id', name='uq_gacha_pool_card'),
        sa.CheckConstraint('weight >= 1', name='ck_gacha_card_weight'))
    for name in ('pool_id', 'item_id'):
        op.create_index('ix_gacha_pool_cards_' + name, 'gacha_pool_cards', [name])
    op.create_table('gacha_rolls',
        sa.Column('id', ID, primary_key=True, autoincrement=True),
        sa.Column('user_id', ID, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pool_id', ID, sa.ForeignKey('gacha_pools.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('item_id', sa.Integer(), sa.ForeignKey('shop_items.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('pool_title', sa.String(100), nullable=False),
        sa.Column('pool_version', sa.Integer(), nullable=False),
        sa.Column('card_snapshot', sa.JSON(), nullable=False),
        sa.Column('cost_paid', sa.Integer(), nullable=False),
        sa.Column('is_duplicate', sa.Boolean(), nullable=False),
        sa.Column('refund_coins', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('cost_paid >= 1 AND refund_coins >= 0 AND refund_coins <= cost_paid', name='ck_gacha_roll_cost_refund'))
    for name in ('user_id', 'pool_id', 'item_id', 'created_at'):
        op.create_index('ix_gacha_rolls_' + name, 'gacha_rolls', [name])
    if connection.dialect.name == 'postgresql':
        for table in ('gacha_pools', 'gacha_pool_cards', 'gacha_rolls'):
            op.execute(f'ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY')
            # Local PostgreSQL deployments need not have Supabase API roles.
            for role in ('anon', 'authenticated'):
                if connection.scalar(sa.text('SELECT 1 FROM pg_roles WHERE rolname = :role'), {'role': role}):
                    op.execute(f'REVOKE ALL ON TABLE public.{table} FROM {role}')
                    op.execute(f'REVOKE ALL ON SEQUENCE public.{table}_id_seq FROM {role}')


def downgrade():
    op.drop_table('gacha_rolls')
    op.drop_table('gacha_pool_cards')
    op.drop_table('gacha_pools')
    with op.batch_alter_table('wheel_items') as table:
        table.drop_constraint('ck_wheel_lightning_only', type_='check')
    with op.batch_alter_table('shop_items') as table:
        table.drop_constraint('ck_character_card_no_price', type_='check')
    # Removed wheel prizes and old card prices cannot be reconstructed safely.
