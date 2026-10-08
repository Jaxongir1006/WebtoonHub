"""account recovery reading continuity and data integrity

Revision ID: f1ddbfdecbb4
Revises: 9a8af726b732
Create Date: 2026-10-03 14:33:46.877901
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1ddbfdecbb4'
down_revision: Union[str, None] = '9a8af726b732'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Fail before modifying the schema; never silently delete or renumber creator content.
    duplicate = op.get_bind().execute(sa.text('SELECT webtoon_id, chapter_number FROM chapters GROUP BY webtoon_id, chapter_number HAVING COUNT(*) > 1 LIMIT 1')).first()
    if duplicate:
        raise RuntimeError('Resolve duplicate chapter numbers before migrating (no data has been changed)')
    op.create_table('password_resets',
    sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('password_resets', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_password_resets_token_hash'), ['token_hash'], unique=True)
        batch_op.create_index(batch_op.f('ix_password_resets_user_id'), ['user_id'], unique=False)

    op.create_table('reading_progress',
    sa.Column('id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), nullable=False),
    sa.Column('webtoon_id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), nullable=False),
    sa.Column('chapter_id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), nullable=False),
    sa.Column('page_index', sa.Integer(), nullable=False),
    sa.Column('anchor', sa.String(length=200), nullable=True),
    sa.Column('progress_percent', sa.Float(), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('completed', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['chapter_id'], ['chapters.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['webtoon_id'], ['webtoons.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'chapter_id', name='uq_reader_chapter_progress')
    )
    with op.batch_alter_table('reading_progress', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_reading_progress_chapter_id'), ['chapter_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_reading_progress_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_reading_progress_webtoon_id'), ['webtoon_id'], unique=False)

    with op.batch_alter_table('chapter_images', schema=None) as batch_op:
        batch_op.add_column(sa.Column('width', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('height', sa.Integer(), nullable=True))

    with op.batch_alter_table('chapters', schema=None) as batch_op:
        batch_op.add_column(sa.Column('moderation_feedback', sa.String(length=1000), nullable=True))
        batch_op.create_unique_constraint('uq_work_chapter_number', ['webtoon_id', 'chapter_number'])

    with op.batch_alter_table('clan_messages', schema=None) as batch_op:
        batch_op.add_column(sa.Column('client_message_id', sa.String(length=64), nullable=True))
        batch_op.create_unique_constraint('uq_clan_client_message', ['user_id', 'client_message_id'])

    with op.batch_alter_table('staff_users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.BigInteger().with_variant(sa.Integer(), 'sqlite'), nullable=True))
        batch_op.create_index(batch_op.f('ix_staff_users_user_id'), ['user_id'], unique=True)
        batch_op.create_foreign_key('fk_staff_reader_user', 'users', ['user_id'], ['id'], ondelete='SET NULL')

    # Link established creators to the reader identity; independent staff accounts remain independent.
    op.get_bind().execute(sa.text("UPDATE staff_users SET user_id = (SELECT users.id FROM users WHERE users.email = staff_users.email) WHERE role_id IN (SELECT roles.id FROM roles WHERE name = 'creator') AND EXISTS (SELECT 1 FROM users WHERE users.email = staff_users.email)"))
    # Bootstrap defaults also cover databases initially created without a creator role.
    connection = op.get_bind()
    creator = connection.execute(sa.text("SELECT id FROM roles WHERE name = 'creator'")).scalar()
    if creator is None:
        connection.execute(sa.text("INSERT INTO roles (name, description) VALUES ('creator', 'Manage own works')"))
        creator = connection.execute(sa.text("SELECT id FROM roles WHERE name = 'creator'")).scalar()
        for code in ['webtoons:create', 'webtoons:edit', 'chapters:create', 'chapters:edit']:
            permission = connection.execute(sa.text('SELECT id FROM permissions WHERE code = :code'), {'code': code}).scalar()
            if permission:
                connection.execute(sa.text('INSERT INTO role_permissions (role_id, permission_id) VALUES (:role,:permission)'), {'role': creator, 'permission': permission})


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('staff_users', schema=None) as batch_op:
        # WARNING: constraint name is None; this directive will fail as
        # rendered.  Add a name, or use a naming convention; see
        # https://alembic.sqlalchemy.org/en/latest/naming.html
        batch_op.drop_constraint('fk_staff_reader_user', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_staff_users_user_id'))
        batch_op.drop_column('user_id')

    with op.batch_alter_table('clan_messages', schema=None) as batch_op:
        batch_op.drop_constraint('uq_clan_client_message', type_='unique')
        batch_op.drop_column('client_message_id')

    with op.batch_alter_table('chapters', schema=None) as batch_op:
        batch_op.drop_constraint('uq_work_chapter_number', type_='unique')
        batch_op.drop_column('moderation_feedback')

    with op.batch_alter_table('chapter_images', schema=None) as batch_op:
        batch_op.drop_column('height')
        batch_op.drop_column('width')

    with op.batch_alter_table('reading_progress', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_reading_progress_webtoon_id'))
        batch_op.drop_index(batch_op.f('ix_reading_progress_user_id'))
        batch_op.drop_index(batch_op.f('ix_reading_progress_chapter_id'))

    op.drop_table('reading_progress')
    with op.batch_alter_table('password_resets', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_password_resets_user_id'))
        batch_op.drop_index(batch_op.f('ix_password_resets_token_hash'))

    op.drop_table('password_resets')
    # ### end Alembic commands ###
