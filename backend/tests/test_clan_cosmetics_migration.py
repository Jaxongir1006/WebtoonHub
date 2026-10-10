"""Upgrade legacy clan appearance data without granting free shop ownership."""
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest

from alembic import command
from alembic.config import Config
from sqlalchemy import MetaData, Table, create_engine, event, insert, select
from sqlalchemy.exc import IntegrityError


class ClanCosmeticsMigrationTests(unittest.TestCase):
    def test_legacy_urls_and_wallets_survive_new_inventory_constraints_and_roundtrip(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='webtoonhub-clan-migration-') as folder:
            url = 'sqlite+pysqlite:///' + str(Path(folder) / 'legacy.db').replace(chr(92), '/')
            config = Config(str(root / 'alembic.ini'))
            config.set_main_option('script_location', str(root / 'migrations'))
            config.cmd_opts = SimpleNamespace(x=['db_url=' + url])
            command.upgrade(config, 'b840f216da73')
            engine = create_engine(url)
            @event.listens_for(engine, 'connect')
            def enforce_foreign_keys(connection, _):
                connection.execute('PRAGMA foreign_keys=ON')
            try:
                metadata = MetaData()
                users = Table('users', metadata, autoload_with=engine)
                clans = Table('clans', metadata, autoload_with=engine)
                shop = Table('shop_items', metadata, autoload_with=engine)
                with engine.begin() as db:
                    db.execute(insert(users), [dict(id=i, username='legacy' + str(i),
                        email=f'legacy{i}@example.test', hashed_password='unusable-test-hash',
                        lightning_coins=42, is_active=True) for i in [1, 2]])
                    db.execute(insert(clans), dict(id=1, name='Legacy clan', tag='LEG', leader_id=1,
                        avatar_url='/content/logo.png', frame_url='/content/legacy-frame.png',
                        banner_url='/content/legacy-banner.png', level=1, xp=0, max_members=15, is_recruiting=True))
                    db.execute(insert(shop), dict(id=1, name='A sold frame', item_type='frame',
                        price_coins=25, asset_url='/content/sold-frame.webp', asset_animated=False, is_available=True))
                command.upgrade(config, 'head')
                inventory = Table('clan_inventory', MetaData(), autoload_with=engine)
                with engine.connect() as db:
                    legacy = db.execute(select(clans)).mappings().one()
                    self.assertEqual([legacy[name] for name in ['avatar_url', 'frame_url', 'banner_url']],
                        ['/content/logo.png', '/content/legacy-frame.png', '/content/legacy-banner.png'])
                    self.assertEqual(db.scalars(select(users.c.lightning_coins).order_by(users.c.id)).all(), [42, 42])
                    self.assertEqual(db.execute(select(inventory)).all(), [])
                grant = dict(clan_id=1, item_id=1, purchased_by_user_id=2, price_paid=25)
                with engine.begin() as db:
                    db.execute(insert(inventory), grant)
                with self.assertRaises(IntegrityError), engine.begin() as db:
                    db.execute(insert(inventory), grant)
                with self.assertRaises(IntegrityError), engine.begin() as db:
                    db.execute(inventory.update().values(price_paid=-1))
                with self.assertRaises(IntegrityError), engine.begin() as db:
                    db.execute(shop.delete().where(shop.c.id == 1))
                with engine.begin() as db:
                    db.execute(users.delete().where(users.c.id == 2))
                with engine.connect() as db:
                    row = db.execute(select(inventory)).mappings().one()
                    self.assertIsNone(row['purchased_by_user_id'])
                    self.assertEqual(row['price_paid'], 25)
                    self.assertFalse(row['is_active'])
                command.check(config)
                command.downgrade(config, 'b840f216da73')
                command.upgrade(config, 'head')
                inventory = Table('clan_inventory', MetaData(), autoload_with=engine)
                with engine.connect() as db:
                    self.assertEqual(db.execute(select(inventory)).all(), [])
                    legacy = db.execute(select(clans)).mappings().one()
                    self.assertEqual(legacy['frame_url'], '/content/legacy-frame.png')
                    self.assertEqual(legacy['banner_url'], '/content/legacy-banner.png')
                    self.assertEqual(db.scalar(select(users.c.lightning_coins)), 42)
                with engine.begin() as db:
                    db.execute(insert(inventory), grant | {'purchased_by_user_id': None})
                    db.execute(clans.delete().where(clans.c.id == 1))
                with engine.connect() as db:
                    self.assertEqual(db.execute(select(inventory)).all(), [])
            finally:
                engine.dispose()
