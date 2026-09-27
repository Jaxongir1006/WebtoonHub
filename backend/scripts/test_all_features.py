import asyncio
import httpx
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api/v1"


async def run_tests():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print("--- 1. Testing Health Check ---")
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("✓ Health Check: OK")

        # Staff login
        print("\n--- 2. Testing Staff Login ---")
        res = await client.post("/staff/auth/login", json={
            "email": "admin@webtoonhub.uz",
            "password": "AdminPassword123"
        })
        assert res.status_code == 200, f"Staff login failed: {res.text}"
        staff_token = res.json()["data"]["access_token"]
        staff_headers = {"Authorization": f"Bearer {staff_token}"}
        print("✓ Staff Login: OK")

        # Register User 1
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

        # Register User 2
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

        # Create Webtoon & Chapter
        print("\n--- 5. Testing Webtoon & Chapter Creation & Approval ---")
        res = await client.get("/genres")
        genres = res.json()["data"]
        genre_ids = [genres[0]["id"]] if genres else []

        # Create webtoon as staff
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

        # Create chapter
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
        print(f"✓ Created Webtoon (id={webtoon_id}) and Chapter (id={chapter_id}, status=pending): OK")

        # Approve chapter
        res = await client.patch(
            f"/staff/chapters/{chapter_id}/status",
            headers=staff_headers,
            json={"status": "published"}
        )
        assert res.status_code == 200, f"Chapter approve failed: {res.text}"
        assert res.json()["data"]["status"] == "published"
        print("✓ Chapter approved and published: OK")

        # Library / Bookmark Testing
        print("\n--- 6. Testing Library (Bookmarks) ---")
        # Add bookmark
        res = await client.post(
            f"/users/library/{webtoon_id}",
            headers=u1_headers,
            json={
                "status": "reading"
            }
        )
        assert res.status_code == 200, f"Bookmark add failed: {res.text}"
        print("✓ Bookmark added: OK")

        # List bookmarks
        res = await client.get("/users/library", headers=u1_headers)
        assert res.status_code == 200, f"Bookmark list failed: {res.text}"
        items = res.json()["data"]
        assert any(b["webtoon"]["id"] == webtoon_id for b in items)
        print("✓ Bookmark retrieved in library: OK")

        # Shop Testing: Staff creates frame, User1 buys and equips
        print("\n--- 7. Testing Shop: Frame Upload, Purchase & Equip ---")
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

        # User1 buys frame (user1 starts with 50 coins, price is 20)
        res = await client.post(f"/shop/buy/{item_id}", headers=u1_headers)
        assert res.status_code == 200, f"Buy item failed: {res.text}"
        print(f"✓ User1 purchased frame (id={item_id}): OK")

        # User1 equips frame
        res = await client.post(f"/shop/equip/{item_id}", headers=u1_headers)
        assert res.status_code == 200, f"Equip item failed: {res.text}"
        print("✓ User1 equipped frame: OK")

        # Verify profile has active frame
        res = await client.get("/auth/me", headers=u1_headers)
        u1_profile = res.json()["data"]
        assert u1_profile["active_frame"] is not None
        assert u1_profile["active_frame"]["id"] == item_id
        print("✓ User1 profile reflects equipped active_frame: OK")

        # Comments Testing
        print("\n--- 8. Testing Comments & Hierarchical Replies ---")
        # User1 leaves top-level comment
        res = await client.post(
            f"/chapters/{chapter_id}/comments",
            headers=u1_headers,
            json={
                "content": "Juda ajoyib bob bo'libdi! Tarjima uchun rahmat!",
                "parent_id": None
            }
        )
        assert res.status_code == 201, f"Create comment failed: {res.text}"
        top_comment_id = res.json()["data"]["id"]
        print(f"✓ User1 posted top-level comment (id={top_comment_id}): OK")

        # User2 replies to User1's comment
        res = await client.post(
            f"/chapters/{chapter_id}/comments",
            headers=u2_headers,
            json={
                "content": "Qo'shilaman, chizilishi ham vapshe zo'r!",
                "parent_id": top_comment_id
            }
        )
        assert res.status_code == 201, f"Create reply failed: {res.text}"
        reply_comment_id = res.json()["data"]["id"]
        print(f"✓ User2 posted reply (id={reply_comment_id}): OK")

        # List comments
        res = await client.get(f"/chapters/{chapter_id}/comments")
        assert res.status_code == 200, f"List comments failed: {res.text}"
        comments_list = res.json()["data"]
        assert len(comments_list) >= 1
        found_top = next((c for c in comments_list if c["id"] == top_comment_id), None)
        assert found_top is not None, "Top comment not found in list"
        assert found_top["user"]["active_frame_url"] is not None, "User1's active frame should be present"
        assert len(found_top["replies"]) == 1, "Top comment should have 1 reply"
        assert found_top["replies"][0]["id"] == reply_comment_id
        print(f"✓ Comment list verified with nested replies and active_frame_url: OK")

        # Permission check: User2 attempts to delete User1's comment -> Should fail with 403
        print("\n--- 9. Testing Comments Permissions & Deletion ---")
        res = await client.delete(f"/comments/{top_comment_id}", headers=u2_headers)
        assert res.status_code == 403, f"Expected 403 when User2 deletes User1's comment, got {res.status_code}"
        print("✓ User2 blocked from deleting User1's comment (403 Forbidden): OK")

        # Staff with moderation permission deletes User2's reply
        res = await client.delete(f"/comments/{reply_comment_id}", headers=staff_headers)
        assert res.status_code == 200, f"Staff moderation delete failed: {res.text}"
        print("✓ Staff deleted reply with comments:moderate: OK")

        # User1 deletes own top-level comment
        res = await client.delete(f"/comments/{top_comment_id}", headers=u1_headers)
        assert res.status_code == 200, f"User1 self delete failed: {res.text}"
        print("✓ User1 deleted own comment: OK")

        # Verify comment list is now empty of this comment
        res = await client.get(f"/chapters/{chapter_id}/comments")
        comments_list_after = res.json()["data"]
        assert not any(c["id"] == top_comment_id for c in comments_list_after)
        print("✓ Comment tree cleanly removed: OK")

        # 10. Staff User Management
        print("\n--- 10. Testing Staff User Management ---")
        new_staff_email = f"staff_{ts}@webtoonhub.uz"
        res = await client.post(
            "/staff/users",
            headers=staff_headers,
            json={
                "username": f"staff_{ts}",
                "email": new_staff_email,
                "password": "Password123!",
                "role_id": 3  # moderator
            }
        )
        assert res.status_code == 201, f"Create staff user failed: {res.text}"
        print("✓ Staff user created: OK")

        res = await client.get("/staff/users", headers=staff_headers)
        assert res.status_code == 200, f"List staff users failed: {res.text}"
        staff_list = res.json()["data"]
        assert any(s["email"] == new_staff_email for s in staff_list)
        print("✓ Staff users listed: OK")

        # 11. Readers Management
        print("\n--- 11. Testing Readers Management ---")
        res = await client.get(f"/staff/readers?search={u1_name}", headers=staff_headers)
        assert res.status_code == 200, f"Search reader failed: {res.text}"
        readers = res.json()["data"]["items"]
        assert any(r["id"] == u1_id for r in readers)
        print("✓ Reader search: OK")

        res = await client.patch(
            f"/staff/readers/{u1_id}",
            headers=staff_headers,
            json={"lightning_coins": 350, "is_active": True}
        )
        assert res.status_code == 200, f"Update reader failed: {res.text}"
        assert res.json()["data"]["lightning_coins"] == 350
        print("✓ Reader updated by staff: OK")

        # 12. Dashboard Analytics
        print("\n--- 12. Testing Dashboard Analytics ---")
        res = await client.get("/staff/analytics/dashboard", headers=staff_headers)
        assert res.status_code == 200, f"Dashboard analytics failed: {res.text}"
        dash = res.json()["data"]
        assert dash["total_readers"] >= 2
        assert dash["total_webtoons"] >= 1
        assert dash["total_coins_in_circulation"] >= 350
        print(f"✓ Dashboard analytics (readers={dash['total_readers']}, webtoons={dash['total_webtoons']}): OK")

        # 13. Pending Chapters List
        print("\n--- 13. Testing Pending Chapters Listing ---")
        res = await client.get("/staff/chapters/pending", headers=staff_headers)
        assert res.status_code == 200, f"List pending chapters failed: {res.text}"
        print("✓ Pending chapters listed: OK")

        # 14. Webtoon Management: Edit
        print("\n--- 14. Testing Webtoon Edit ---")
        res = await client.patch(
            f"/staff/webtoons/{webtoon_id}",
            headers=staff_headers,
            data={"title": f"Updated Webtoon {ts}", "status": "completed"}
        )
        assert res.status_code == 200, f"Webtoon update failed: {res.text}"
        assert res.json()["data"]["title"] == f"Updated Webtoon {ts}"
        print("✓ Webtoon updated: OK")

        # 15. Staff Shop Management: List & Update
        print("\n--- 15. Testing Staff Shop Management ---")
        res = await client.get("/staff/shop/items", headers=staff_headers)
        assert res.status_code == 200, f"List staff shop items failed: {res.text}"
        print("✓ Staff shop items listed: OK")

        res = await client.patch(
            f"/staff/shop/items/{item_id}",
            headers=staff_headers,
            json={"price_coins": 25}
        )
        assert res.status_code == 200, f"Update shop item failed: {res.text}"
        assert res.json()["data"]["price_coins"] == 25
        print("✓ Shop item updated: OK")

        # 16. Staff Comments Moderation Listing
        print("\n--- 16. Testing Staff Comments Listing ---")
        res = await client.get("/staff/comments", headers=staff_headers)
        assert res.status_code == 200, f"List staff comments failed: {res.text}"
        print("✓ Staff comments list: OK")

        # 17. User Profile Update
        print("\n--- 17. Testing User Profile Update ---")
        new_u1_username = f"new_user1_{ts}"
        res = await client.patch(
            "/auth/profile",
            headers=u1_headers,
            json={"username": new_u1_username}
        )
        assert res.status_code == 200, f"Update profile username failed: {res.text}"
        assert res.json()["data"]["username"] == new_u1_username
        print("✓ User profile username updated: OK")

        # Update password
        res = await client.patch(
            "/auth/profile",
            headers=u1_headers,
            json={
                "old_password": "Password123!",
                "new_password": "BrandNewPassword123!"
            }
        )
        assert res.status_code == 200, f"Update profile password failed: {res.text}"

        # Login with new password
        res = await client.post("/auth/login", json={
            "email": u1_email,
            "password": "BrandNewPassword123!"
        })
        assert res.status_code == 200, f"Login with new password failed: {res.text}"
        print("✓ User profile password updated & verified login: OK")

        print("\n==========================================")
        print("ALL 17 EXTENDED END-TO-END TESTS PASSED! 🚀")
        print("==========================================")


if __name__ == "__main__":
    asyncio.run(run_tests())
