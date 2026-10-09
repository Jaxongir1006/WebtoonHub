"""Legacy purchases/wheel receipts survive the acquisition rule change."""
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, MetaData, Table, insert, select
from sqlalchemy.exc import IntegrityError


class GachaMigrationTests(unittest.TestCase):
    def test_migration_preserves_inventory_and_history_removes_item_sectors(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='webtoonhub-gacha-migration-') as folder:
            url = 'sqlite+pysqlite:///' + str(Path(folder) / 'legacy.db').replace(chr(92), '/')
            config = Config(str(root / 'alembic.ini'))
            config.set_main_option('script_location', str(root / 'migrations'))
            config.cmd_opts = SimpleNamespace(x=['db_url=' + url])
            command.upgrade(config, 'aa42ef631d90')
            engine = create_engine(url)
            try:
                metadata = MetaData()
                names = ['users', 'shop_items', 'user_inventory', 'wheels', 'wheel_items', 'wheel_spins']
                tables = {name: Table(name, metadata, autoload_with=engine) for name in names}
                with engine.begin() as db:
                    db.execute(insert(tables['users']), dict(id=1, username='legacy', email='legacy@example.test',
                        hashed_password='unusable-test-hash', lightning_coins=42, is_active=True))
                    db.execute(insert(tables['shop_items']), [dict(id=1, name='Legacy card', item_type='card', price_coins=500,
                        asset_url='/content/card.webp', rarity='rare', character_name='Legacy', asset_animated=False, is_available=True),
                        dict(id=2, name='Legacy frame', item_type='frame', price_coins=300, asset_url='/content/frame.webp',
                        rarity=None, character_name=None, asset_animated=False, is_available=True)])
                    db.execute(insert(tables['user_inventory']), [dict(user_id=1, item_id=1, is_active=False), dict(user_id=1, item_id=2, is_active=True)])
                    db.execute(insert(tables['wheels']), dict(id=1, title='Legacy wheel', slug='legacy-wheel', cost_coins=100,
                        has_daily_free_spin=True, icon='sparkles', color='#123456', is_active=True, order_index=0))
                    for item_id, kind, shop_id in [(1, 'coins', None), (2, 'shop_item', 1), (3, 'shop_item', 2)]:
                        db.execute(insert(tables['wheel_items']), dict(id=item_id, wheel_id=1, reward_type=kind,
                            reward_coins=10 if kind == 'coins' else 0, shop_item_id=shop_id, label='Legacy reward',
                            color='#123456', text_color='#FFFFFF', icon='coins', weight=1, is_jackpot=False, order_index=item_id))
                    db.execute(insert(tables['wheel_spins']), dict(id=1, user_id=1, wheel_id=1, wheel_item_id=2, is_free_spin=False,
                        cost_paid=100, reward_type='shop_item', reward_coins=0, shop_item_id=1, reward_label='Legacy card'))
                command.upgrade(config, 'head')
                metadata = MetaData()
                tables = {name: Table(name, metadata, autoload_with=engine) for name in names}
                with engine.connect() as db:
                    self.assertEqual(len(db.execute(select(tables['user_inventory'])).all()), 2)
                    self.assertEqual(db.scalar(select(tables['users'].c.lightning_coins)), 42)
                    self.assertEqual(db.scalar(select(tables['shop_items'].c.price_coins).where(tables['shop_items'].c.id == 1)), 0)
                    self.assertEqual(db.scalar(select(tables['shop_items'].c.price_coins).where(tables['shop_items'].c.id == 2)), 300)
                    self.assertEqual(len(db.execute(select(tables['wheel_items'])).all()), 1)
                    self.assertFalse(db.scalar(select(tables['wheels'].c.is_active)))
                    receipt = db.execute(select(tables['wheel_spins'])).mappings().one()
                    self.assertEqual(receipt['reward_type'], 'shop_item')
                    self.assertEqual(receipt['shop_item_id'], 1)
                    self.assertEqual(receipt['cost_paid'], 100)
                    self.assertIsNone(receipt['wheel_item_id'])
                with self.assertRaises(IntegrityError), engine.begin() as db:
                    db.execute(tables['shop_items'].update().where(tables['shop_items'].c.id == 1).values(price_coins=1))
                command.check(config)
            finally:
                engine.dispose()
