"""Upgrade real legacy rows in a disposable database, including crossed pairs."""
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, MetaData, Table, insert, select
from sqlalchemy.exc import IntegrityError


class ReviewMigrationTests(unittest.TestCase):
    def test_legacy_pairs_role_scope_and_publication_backfill_survive_upgrade(self):
        root=Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory(prefix='webtoonhub-migration-data-') as folder:
            url='sqlite+pysqlite:///'+str(Path(folder)/'legacy.db').replace(chr(92),'/')
            config=Config(str(root/'alembic.ini'))
            config.set_main_option('script_location',str(root/'migrations'))
            config.cmd_opts=SimpleNamespace(x=['db_url='+url])
            command.upgrade(config,'c63ea14d2910')
            engine=create_engine(url)
            try:
                metadata=MetaData()
                users=Table('users',metadata,autoload_with=engine)
                roles=Table('roles',metadata,autoload_with=engine)
                friendships=Table('friendships',metadata,autoload_with=engine)
                works=Table('webtoons',metadata,autoload_with=engine)
                chapters=Table('chapters',metadata,autoload_with=engine)
                with engine.begin() as db:
                    db.execute(insert(users),[dict(id=i,username='legacy'+str(i),email=f'legacy{i}@example.test',hashed_password='unusable-test-hash',lightning_coins=0,is_active=True) for i in range(1,5)])
                    names=set(db.scalars(select(roles.c.name)))
                    for name in ['creator','superadmin','editor']:
                        if name not in names: db.execute(insert(roles),{'name':name})
                    db.execute(insert(friendships),[dict(id=1,user_id=1,friend_id=2,status='pending'),dict(id=2,user_id=2,friend_id=1,status='accepted'),
                        dict(id=3,user_id=3,friend_id=4,status='pending'),dict(id=4,user_id=4,friend_id=3,status='rejected')])
                    db.execute(insert(works),dict(id=1,title='Legacy novel',slug='legacy',type='novel',cover_image_url='/content/synthetic.webp',status='ongoing',view_count=0))
                    db.execute(insert(chapters),[dict(id=1,webtoon_id=1,chapter_number=1,status='published',content_text='Legacy story',reward_coins=0),
                        dict(id=2,webtoon_id=1,chapter_number=2,status='pending',content_text='Pending story',reward_coins=0)])
                command.upgrade(config,'head')
                metadata=MetaData()
                friendships=Table('friendships',metadata,autoload_with=engine)
                roles=Table('roles',metadata,autoload_with=engine)
                chapters=Table('chapters',metadata,autoload_with=engine)
                with engine.connect() as db:
                    pairs=db.execute(select(friendships).order_by(friendships.c.id)).mappings().all()
                    self.assertEqual([(r['id'],r['status'],r['pair_low'],r['pair_high']) for r in pairs],[(2,'accepted',1,2),(3,'pending',3,4)])
                    by_name={r['name']:r for r in db.execute(select(roles)).mappings()}
                    self.assertEqual(by_name['creator']['system_key'],'creator');self.assertEqual(by_name['creator']['scope'],'own_content')
                    self.assertEqual(by_name['superadmin']['system_key'],'superadmin');self.assertIsNone(by_name['editor']['system_key'])
                    chapters_by_id={r['id']:r for r in db.execute(select(chapters)).mappings()}
                    self.assertEqual(chapters_by_id[1]['created_at'],chapters_by_id[1]['published_at'])
                    self.assertIsNone(chapters_by_id[2]['published_at'])
                with self.assertRaises(IntegrityError), engine.begin() as db:
                    db.execute(insert(friendships),dict(user_id=1,friend_id=2,status='pending'))
                command.check(config)
                command.downgrade(config,'c63ea14d2910')
                command.upgrade(config,'head')
            finally:
                engine.dispose()
