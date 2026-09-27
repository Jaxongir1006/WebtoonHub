import asyncio
from datetime import datetime
import httpx
from httpx import ASGITransport

from app.main import app, lifespan


async def run_tests():
    async with lifespan(app):
        transport = ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test/api/v1", timeout=30.0) as client:
            print("--- 1. Testing Health Check ---")
            res = await client.get("/health")
            assert res.status_code == 200, f"Health check failed: {res.text}"
            print("✓ Health Check: OK")

            # 2. Staff login
            print("\n--- 2. Testing Staff Login ---")
            res = await client.post("/staff/auth/login", json={
                "email": "admin@webtoonhub.uz",
                "password": "AdminPassword123"
            })
            assert res.status_code == 200, f"Staff login failed: {res.text}"
            staff_token = res.json()["data"]["access_token"]
            staff_headers = {"Authorization": f"Bearer {staff_token}"}
            print("✓ Staff Login: OK")

            # 3. Register User 1
            print("\n--- 3. Testing User1 Registration & Login ---")
            ts = int(datetime.now().timestamp())
            u1_email = f"user1_{ts}@test.uz"
            u1_name = f"user1_{ts}"
            res = await client.post("/auth/register", json={
                "email": u1_email,
                "username": u1_name,
                "password": "Password123!"
            })
            assert res.status_code == 201, f"User1 register failed: {res.text}"
            u1_id = res.json()["data"]["user"]["id"]

            res = await client.post("/auth/login", json={
                "email": u1_email,
                "password": "Password123!"
            })
            assert res.status_code == 200, f"User1 login failed: {res.text}"
            u1_token = res.json()["data"]["access_token"]
            u1_headers = {"Authorization": f"Bearer {u1_token}"}
            print(f"✓ User1 Registered & Logged in (id={u1_id}): OK")

            # 4. Register User 2
            print("\n--- 4. Testing User2 Registration & Login ---")
            u2_email = f"user2_{ts}@test.uz"
            u2_name = f"user2_{ts}"
            res = await client.post("/auth/register", json={
                "email": u2_email,
                "username": u2_name,
                "password": "Password123!"
            })
            assert res.status_code == 201, f"User2 register failed: {res.text}"
            u2_id = res.json()["data"]["user"]["id"]

            res = await client.post("/auth/login", json={
                "email": u2_email,
                "password": "Password123!"
            })
            assert res.status_code == 200, f"User2 login failed: {res.text}"
            u2_token = res.json()["data"]["access_token"]
            u2_headers = {"Authorization": f"Bearer {u2_token}"}
            print(f"✓ User2 Registered & Logged in (id={u2_id}): OK")

            # 5. Create Webtoon & Chapter
            print("\n--- 5. Testing Webtoon & Chapter Creation & Approval ---")
            res = await client.get("/genres")
            genres = res.json()["data"]
            genre_ids = [genres[0]["id"]] if genres else []

            dummy_cover = ("cover.jpg", b"fake_jpg_content_here", "image/jpeg")
            res = await client.post(
                "/staff/webtoons",
                headers=staff_headers,
                data={
                    "title": f"Test Webtoon {ts}",
                    "slug": f"test-webtoon-{ts}",
                    "description": "A thrilling manhwa for automated testing",
                    "author": "Solo Author",
                    "artist": "Solo Artist",
                    "genre_ids": str(genre_ids[0]) if genre_ids else "1"
                },
                files={"cover_image": dummy_cover}
            )
            assert res.status_code == 201, f"Webtoon create failed: {res.text}"
            webtoon_id = res.json()["data"]["id"]

            dummy_slice = ("page_01.jpg", b"slice_1_image_bytes", "image/jpeg")
            res = await client.post(
                "/staff/chapters",
                headers=staff_headers,
                data={
                    "webtoon_id": webtoon_id,
                    "chapter_number": 1,
                    "title": "1-bob: Boshlanish"
                },
                files=[("images", dummy_slice)]
            )
            assert res.status_code == 201, f"Chapter create failed: {res.text}"
            chapter_id = res.json()["data"]["id"]
            print(f"✓ Created Webtoon (id={webtoon_id}) and Chapter (id={chapter_id}): OK")

            res = await client.patch(
                f"/staff/chapters/{chapter_id}/status",
                headers=staff_headers,
                json={"status": "published"}
            )
            assert res.status_code == 200, f"Chapter approve failed: {res.text}"
            print("✓ Chapter approved and published: OK")

            # 6. Daily Checkin & Chapter Reward
            print("\n--- 6. Testing Rewards (Daily Checkin & Chapter Read) ---")
            res = await client.post("/rewards/daily-checkin", headers=u1_headers)
            assert res.status_code == 200, f"Daily checkin failed: {res.text}"
            print("✓ User1 daily checkin claimed (+15 coins): OK")

            res = await client.post(f"/chapters/{chapter_id}/reward", headers=u1_headers)
            assert res.status_code == 200, f"Chapter reward claim failed: {res.text}"
            print("✓ User1 chapter reward claimed (+5 coins): OK")

            # Anti-farming: repeat claim should fail with 400
            res = await client.post(f"/chapters/{chapter_id}/reward", headers=u1_headers)
            assert res.status_code == 400, f"Expected 400 on duplicate chapter claim: {res.text}"
            print("✓ Anti-farming check verified (400 Bad Request on repeat): OK")

            # 7. Library / Bookmark Testing
            print("\n--- 7. Testing Library (Bookmarks) ---")
            res = await client.post(
                f"/users/library/{webtoon_id}",
                headers=u1_headers,
                json={"status": "reading"}
            )
            assert res.status_code == 200, f"Bookmark add failed: {res.text}"
            print("✓ Bookmark added: OK")

            res = await client.get("/users/library", headers=u1_headers)
            assert res.status_code == 200, f"Bookmark list failed: {res.text}"
            items = res.json()["data"]
            assert any(b["webtoon"]["id"] == webtoon_id for b in items)
            print("✓ Bookmark retrieved in library: OK")

            # 8. Shop Testing: Staff creates frame, User1 buys and equips
            print("\n--- 8. Testing Shop: Frame Upload, Purchase & Equip ---")
            dummy_frame = ("dragon_frame.png", b"frame_bytes", "image/png")
            res = await client.post(
                "/staff/shop/items",
                headers=staff_headers,
                data={
                    "name": "Dragon Fire Frame",
                    "item_type": "frame",
                    "price_coins": 20
                },
                files={"asset_file": dummy_frame}
            )
            assert res.status_code == 201, f"Shop item create failed: {res.text}"
            item_id = res.json()["data"]["id"]

            res = await client.post(f"/shop/buy/{item_id}", headers=u1_headers)
            assert res.status_code == 200, f"Buy item failed: {res.text}"
            print(f"✓ User1 purchased frame (id={item_id}): OK")

            res = await client.post(f"/shop/equip/{item_id}", headers=u1_headers)
            assert res.status_code == 200, f"Equip item failed: {res.text}"
            print("✓ User1 equipped frame: OK")

            res = await client.get("/auth/me", headers=u1_headers)
            u1_profile = res.json()["data"]
            assert u1_profile["active_frame"] is not None
            assert u1_profile["active_frame"]["id"] == item_id
            print("✓ User1 profile reflects equipped active_frame: OK")

            # 9. Coins Management & Transaction History (NEW)
            print("\n--- 9. Testing Staff Coins Management & Transactions ---")
            res = await client.get("/staff/coins/summary", headers=staff_headers)
            assert res.status_code == 200, f"Coins summary failed: {res.text}"
            c_summary = res.json()["data"]
            assert c_summary["total_transactions_count"] > 0
            print(f"✓ Coins summary (wallets={c_summary['total_coins_in_wallets']}, txs={c_summary['total_transactions_count']}): OK")

            res = await client.get("/staff/coins/transactions", headers=staff_headers)
            assert res.status_code == 200, f"Coins transactions list failed: {res.text}"
            txs = res.json()["data"]["items"]
            assert len(txs) > 0
            print(f"✓ Coins transactions list ({len(txs)} txs recorded): OK")

            # Staff adjusts User1 coins (+100)
            res = await client.post(
                f"/staff/readers/{u1_id}/coins",
                headers=staff_headers,
                json={"amount_delta": 100, "reason": "Bonus rag'batlantirish"}
            )
            assert res.status_code == 200, f"Adjust user coins failed: {res.text}"
            print("✓ Staff adjusted user coins (+100 delta): OK")

            # Staff distributes coins (+25 to all active users)
            res = await client.post(
                "/staff/coins/distribute",
                headers=staff_headers,
                json={"amount": 25, "reason": "Navro'z sovg'asi", "all_active_users": True}
            )
            assert res.status_code == 200, f"Distribute coins failed: {res.text}"
            print("✓ Staff distributed coins (+25 to all users): OK")

            # 10. System Global Settings (NEW)
            print("\n--- 10. Testing System Global Settings ---")
            res = await client.get("/staff/settings", headers=staff_headers)
            assert res.status_code == 200, f"Get settings failed: {res.text}"
            settings_data = res.json()["data"]
            assert len(settings_data) >= 4
            print(f"✓ System settings fetched ({len(settings_data)} keys): OK")

            res = await client.patch(
                "/staff/settings",
                headers=staff_headers,
                json={"settings": [{"key": "register_bonus_coins", "value": "60"}, {"key": "maintenance_mode", "value": "false"}]}
            )
            assert res.status_code == 200, f"Update settings failed: {res.text}"
            print("✓ System settings updated: OK")

            # 11. Staff Roles & Users RBAC Management (NEW)
            print("\n--- 11. Testing Staff Roles & Users RBAC ---")
            res = await client.get("/staff/roles", headers=staff_headers)
            assert res.status_code == 200, f"List roles failed: {res.text}"
            roles = res.json()["data"]

            res = await client.get("/staff/permissions", headers=staff_headers)
            assert res.status_code == 200, f"List permissions failed: {res.text}"
            perms = res.json()["data"]

            # Create a test role
            res = await client.post(
                "/staff/roles",
                headers=staff_headers,
                json={"name": f"test_role_{ts}", "description": "Vaqtinchalik rol", "permission_ids": [perms[0]["id"]]}
            )
            assert res.status_code == 201, f"Create role failed: {res.text}"
            new_role_id = res.json()["data"]["id"]
            print(f"✓ Created test role (id={new_role_id}): OK")

            # Update test role
            res = await client.patch(
                f"/staff/roles/{new_role_id}",
                headers=staff_headers,
                json={"description": "Yangilangan vaqtinchalik rol"}
            )
            assert res.status_code == 200, f"Update role failed: {res.text}"
            print("✓ Updated test role: OK")

            # Create staff user with this role
            temp_staff_email = f"temp_staff_{ts}@webtoonhub.uz"
            res = await client.post(
                "/staff/users",
                headers=staff_headers,
                json={
                    "username": f"temp_staff_{ts}",
                    "email": temp_staff_email,
                    "password": "Password123!",
                    "role_id": new_role_id
                }
            )
            assert res.status_code == 201, f"Create staff user failed: {res.text}"
            temp_staff_id = res.json()["data"]["id"]
            print(f"✓ Created staff user (id={temp_staff_id}): OK")

            # Update staff user
            res = await client.patch(
                f"/staff/users/{temp_staff_id}",
                headers=staff_headers,
                json={"username": f"updated_staff_{ts}"}
            )
            assert res.status_code == 200, f"Update staff user failed: {res.text}"
            print("✓ Updated staff user: OK")

            # Delete staff user
            res = await client.delete(f"/staff/users/{temp_staff_id}", headers=staff_headers)
            assert res.status_code == 200, f"Delete staff user failed: {res.text}"
            print("✓ Deleted staff user: OK")

            # Delete role
            res = await client.delete(f"/staff/roles/{new_role_id}", headers=staff_headers)
            assert res.status_code == 200, f"Delete role failed: {res.text}"
            print("✓ Deleted test role: OK")

            # 12. Readers Management & Sessions Termination (NEW)
            print("\n--- 12. Testing Readers Management & Session Termination ---")
            res = await client.get(f"/staff/readers?search={u2_name}", headers=staff_headers)
            assert res.status_code == 200, f"Search reader failed: {res.text}"
            print("✓ Reader search: OK")

            res = await client.delete(f"/staff/readers/{u2_id}/sessions", headers=staff_headers)
            assert res.status_code == 200, f"Terminate reader sessions failed: {res.text}"
            print("✓ User2 sessions terminated by staff: OK")

            # Verify User2 token is rejected due to invalidated session
            res = await client.get("/auth/me", headers=u2_headers)
            assert res.status_code == 401, f"Expected 401 for terminated session, got {res.status_code}"
            print("✓ Terminated session verified (User2 access token rejected with 401): OK")

            # 13. Genres Full CRUD (NEW)
            print("\n--- 13. Testing Genres CRUD ---")
            g_name = f"Test Janr {ts}"
            res = await client.post("/staff/genres", headers=staff_headers, json={"name": g_name})
            assert res.status_code == 201, f"Create genre failed: {res.text}"
            test_genre_id = res.json()["data"]["id"]
            print(f"✓ Created genre (id={test_genre_id}): OK")

            res = await client.patch(
                f"/staff/genres/{test_genre_id}",
                headers=staff_headers,
                json={"name": f"Yangilangan Janr {ts}"}
            )
            assert res.status_code == 200, f"Update genre failed: {res.text}"
            print("✓ Updated genre: OK")

            res = await client.delete(f"/staff/genres/{test_genre_id}", headers=staff_headers)
            assert res.status_code == 200, f"Delete genre failed: {res.text}"
            print("✓ Deleted genre: OK")

            # 14. Chapters Full CRUD (NEW)
            print("\n--- 14. Testing Chapters Staff List & Update ---")
            res = await client.get(f"/staff/webtoons/{webtoon_id}/chapters", headers=staff_headers)
            assert res.status_code == 200, f"List webtoon chapters staff failed: {res.text}"
            staff_chapters = res.json()["data"]
            assert len(staff_chapters) >= 1
            print(f"✓ Staff listed chapters for webtoon ({len(staff_chapters)} chapters): OK")

            res = await client.patch(
                f"/staff/chapters/{chapter_id}",
                headers=staff_headers,
                json={"title": "1-bob: Yangilangan sarlavha", "reward_coins": 10}
            )
            assert res.status_code == 200, f"Update chapter failed: {res.text}"
            print("✓ Updated chapter: OK")

            # 15. Comments Moderation & Edit (NEW)
            print("\n--- 15. Testing Comments Moderation & Edit ---")
            # User1 posts a comment
            res = await client.post(
                f"/chapters/{chapter_id}/comments",
                headers=u1_headers,
                json={"content": "Bu yerda nojo'ya so'z bor edi!", "parent_id": None}
            )
            assert res.status_code == 201, f"Create comment failed: {res.text}"
            mod_comm_id = res.json()["data"]["id"]

            # Staff edits / censors comment
            res = await client.patch(
                f"/staff/comments/{mod_comm_id}",
                headers=staff_headers,
                json={"content": "[Senzura qilindi] Moderatsiya qoidalariga rioya qiling."}
            )
            assert res.status_code == 200, f"Staff edit comment failed: {res.text}"
            assert "[Senzura qilindi]" in res.json()["data"]["content"]
            print("✓ Staff edited and censored comment: OK")

            # 16. Creator Request with Admin Feedback (NEW)
            print("\n--- 16. Testing Creator Request with Feedback ---")
            # User1 submits creator application
            res = await client.post(
                "/creator-requests",
                headers=u1_headers,
                json={"message": "Salom, man mashhur manhvalarni o'zbek tiliga professional tarjima qilaman."}
            )
            assert res.status_code == 201, f"Submit creator request failed: {res.text}"
            req_id = res.json()["data"]["id"]

            # Staff approves application with feedback
            res = await client.patch(
                f"/staff/creator-requests/{req_id}",
                headers=staff_headers,
                json={
                    "status": "approved",
                    "admin_feedback": "Arizangiz ma'qullandi. Creator sifatida xush kelibsiz!"
                }
            )
            assert res.status_code == 200, f"Review creator request failed: {res.text}"
            assert res.json()["data"]["status"] == "approved"
            assert res.json()["data"]["admin_feedback"] is not None
            print("✓ Staff reviewed creator request with admin_feedback: OK")

            # Verify User1 can now log in via Staff Login with Creator role!
            res = await client.post("/staff/auth/login", json={
                "email": u1_email,
                "password": "Password123!"
            })
            assert res.status_code == 200, f"Creator staff login failed: {res.text}"
            creator_staff_role = res.json()["data"]["staff"]["role"]["name"]
            assert creator_staff_role == "creator"
            print(f"✓ Promoted User1 successfully logged into Staff Panel as role='{creator_staff_role}': OK")

            # 17. Cleanup Chapter & Webtoon
            print("\n--- 17. Testing Chapter & Webtoon Deletion ---")
            res = await client.delete(f"/staff/chapters/{chapter_id}", headers=staff_headers)
            assert res.status_code == 200, f"Delete chapter failed: {res.text}"
            print("✓ Staff deleted chapter: OK")

            res = await client.delete(f"/staff/webtoons/{webtoon_id}", headers=staff_headers)
            assert res.status_code == 200, f"Delete webtoon failed: {res.text}"
            print("✓ Staff deleted webtoon: OK")

            print("\n===========================================================")
            print("ALL 17 COMPREHENSIVE END-TO-END INTEGRATION TESTS PASSED! 🚀")
            print("===========================================================")


if __name__ == "__main__":
    asyncio.run(run_tests())
