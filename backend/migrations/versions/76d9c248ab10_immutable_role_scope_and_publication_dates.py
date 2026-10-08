"""Immutable system-role scope and chapter publication ordering.

Revision ID: 76d9c248ab10
Revises: c63ea14d2910
"""
from alembic import op
import sqlalchemy as sa

revision = '76d9c248ab10'
down_revision = 'c63ea14d2910'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('roles') as table:
        table.add_column(sa.Column('system_key', sa.String(50), nullable=True))
        table.add_column(sa.Column('scope', sa.String(20), nullable=False, server_default='global'))
        table.create_unique_constraint('uq_roles_system_key', ['system_key'])
    roles = sa.table('roles', sa.column('name'), sa.column('system_key'), sa.column('scope'))
    op.execute(roles.update().where(roles.c.name == 'creator').values(system_key='creator', scope='own_content'))
    op.execute(roles.update().where(roles.c.name == 'superadmin').values(system_key='superadmin', scope='global'))
    with op.batch_alter_table('chapters') as table:
        table.add_column(sa.Column('published_at', sa.DateTime(timezone=True)))
        table.create_index('ix_chapters_published_at', ['published_at'])
    chapters = sa.table('chapters', sa.column('status'), sa.column('created_at'), sa.column('published_at'))
    op.execute(chapters.update().where(chapters.c.status == 'published').values(published_at=chapters.c.created_at))


def downgrade():
    with op.batch_alter_table('chapters') as table:
        table.drop_index('ix_chapters_published_at')
        table.drop_column('published_at')
    with op.batch_alter_table('roles') as table:
        table.drop_constraint('uq_roles_system_key', type_='unique')
        table.drop_column('scope')
        table.drop_column('system_key')
