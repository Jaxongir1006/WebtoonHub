"""collectible cards, derived artwork metadata, and owned profile showcases

Revision ID: c63ea14d2910
Revises: 8b241e930c45
"""
from alembic import op
import sqlalchemy as sa

revision = 'c63ea14d2910'
down_revision = '8b241e930c45'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('shop_items') as table:
        table.add_column(sa.Column('rarity', sa.String(20)))
        table.add_column(sa.Column('character_name', sa.String(100)))
        table.add_column(sa.Column('series_title', sa.String(255)))
        table.add_column(sa.Column('webtoon_id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite')))
        table.add_column(sa.Column('asset_preview_url', sa.String(500)))
        table.add_column(sa.Column('asset_animated', sa.Boolean(), nullable=False, server_default=sa.false()))
        table.create_foreign_key('fk_shop_item_webtoon', 'webtoons', ['webtoon_id'], ['id'], ondelete='SET NULL')
    op.create_table('user_featured_cards',
        sa.Column('user_id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), nullable=False),
        sa.Column('item_id', sa.Integer(), nullable=False),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('user_id', 'item_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_id'], ['shop_items.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id', 'item_id'], ['user_inventory.user_id', 'user_inventory.item_id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'order_index', name='uq_user_featured_card_order'))


def downgrade():
    op.drop_table('user_featured_cards')
    with op.batch_alter_table('shop_items') as table:
        table.drop_constraint('fk_shop_item_webtoon', type_='foreignkey')
        for name in ['asset_animated', 'asset_preview_url', 'webtoon_id', 'series_title', 'character_name', 'rarity']:
            table.drop_column(name)
