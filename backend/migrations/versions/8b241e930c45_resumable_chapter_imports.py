"""private durable resumable chapter imports

Revision ID: 8b241e930c45
Revises: fd7b101e6be6
"""
from alembic import op
import sqlalchemy as sa

revision = '8b241e930c45'
down_revision = 'fd7b101e6be6'
branch_labels = None
depends_on = None


def upgrade():
    identifier = sa.BigInteger().with_variant(sa.Integer(), 'sqlite')
    op.create_table('chapter_imports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('staff_id', sa.Integer(), nullable=False),
        sa.Column('webtoon_id', identifier, nullable=False),
        sa.Column('chapter_number', sa.Float(), nullable=False),
        sa.Column('title', sa.String(255)),
        sa.Column('reward_coins', sa.Integer(), nullable=False),
        sa.Column('idempotency_key', sa.String(128), nullable=False),
        sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('manifest_json', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('chapter_id', identifier),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['staff_id'], ['staff_users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['webtoon_id'], ['webtoons.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('staff_id', 'idempotency_key', name='uq_chapter_import_owner_key'))
    op.create_index('ix_chapter_imports_staff_id', 'chapter_imports', ['staff_id'])
    op.create_index('ix_chapter_imports_webtoon_id', 'chapter_imports', ['webtoon_id'])
    op.create_index('ix_chapter_imports_expires_at', 'chapter_imports', ['expires_at'])
    op.create_table('chapter_import_pages',
        sa.Column('id', identifier, primary_key=True, autoincrement=True),
        sa.Column('import_id', sa.String(36), nullable=False),
        sa.Column('page_index', sa.Integer(), nullable=False),
        sa.Column('original_name', sa.String(255), nullable=False),
        sa.Column('source_size', sa.Integer(), nullable=False),
        sa.Column('sha256', sa.String(64), nullable=False),
        sa.Column('staging_name', sa.String(120), nullable=False),
        sa.Column('width', sa.Integer(), nullable=False),
        sa.Column('height', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['import_id'], ['chapter_imports.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('import_id', 'page_index', name='uq_chapter_import_page_slot'))
    op.create_index('ix_chapter_import_pages_import_id', 'chapter_import_pages', ['import_id'])


def downgrade():
    op.drop_table('chapter_import_pages')
    op.drop_table('chapter_imports')
