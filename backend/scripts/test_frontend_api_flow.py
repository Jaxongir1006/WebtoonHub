import httpx
import sys
import uuid

BASE_URL = "http://localhost:5173/api/v1"

def test_flow():
    client = httpx.Client(base_url=BASE_URL, timeout=15.0)
    print("=== Testing Frontend User API Flow through Vite Proxy ===")
    
    # 1. Health
    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    print("✓ 1. Health check passed")

    # 2. Genres
    r = client.get("/genres")
    assert r.status_code == 200
    genres = r.json().get("data", [])
    assert len(genres) > 0, "No genres found"
    print(f"✓ 2. Loaded {len(genres)} genres")

    # 3. Catalog & Search
    r = client.get("/webtoons", params={"limit": 5})
    assert r.status_code == 200
    catalog = r.json().get("data", {})
    assert "items" in catalog
    print(f"✓ 3. Catalog loaded ({catalog.get('total')} webtoons)")

    # 4. Filter by genre
    test_genre = genres[0]["slug"]
    r = client.get("/webtoons", params={"genre": test_genre})
    assert r.status_code == 200
    print(f"✓ 4. Filtered catalog by genre '{test_genre}'")

    # 5. Register new reader user
    unique_id = uuid.uuid4().hex[:8]
    email = f"reader_{unique_id}@webtoonhub.uz"
    username = f"reader_{unique_id}"
    password = "StrongPassword123!"

    reg_payload = {"email": email, "username": username, "password": password}
    r = client.post("/auth/register", json=reg_payload)
    assert r.status_code == 201, f"Register failed: {r.text}"
    reg_data = r.json().get("data", {}).get("user", {})
    assert reg_data.get("lightning_coins") == 50, f"Expected 50 coins on register, got {reg_data.get('lightning_coins')}"
    user_id = reg_data["id"]
    print(f"✓ 5. Registered user #{user_id} with initial 50 Chaqmoq ⚡")

    # 6. Login
    login_payload = {"email": email, "password": password}
    r = client.post("/auth/login", json=login_payload)
    assert r.status_code == 200, f"Login failed: {r.text}"
    tokens = r.json().get("data", {})
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    auth_headers = {"Authorization": f"Bearer {access_token}"}
    print("✓ 6. Login successful, JWT access token acquired")

    # 7. Refresh token
    r = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert r.status_code == 200
    new_access_token = r.json().get("data", {}).get("access_token")
    assert new_access_token, "No new access token from refresh"
    auth_headers = {"Authorization": f"Bearer {new_access_token}"}
    print("✓ 7. JWT access token refresh rotation verified")

    # 8. Get Profile
    r = client.get("/auth/me", headers=auth_headers)
    assert r.status_code == 200
    profile = r.json().get("data", {})
    assert profile["lightning_coins"] == 50
    assert profile["active_frame"] is None
    print("✓ 8. Profile loaded, balance = 50 ⚡")

    # 9. Claim Daily Bonus (+15 ⚡)
    r = client.post("/rewards/daily-checkin", headers=auth_headers)
    assert r.status_code == 200, f"Daily check-in failed: {r.text}"
    checkin_data = r.json().get("data", {})
    assert checkin_data.get("reward_amount") == 15
    assert checkin_data.get("total_lightning_coins") == 65
    print("✓ 9. Daily bonus claimed: +15 ⚡, total balance = 65 ⚡")

    # Double claim rejection
    r = client.post("/rewards/daily-checkin", headers=auth_headers)
    assert r.status_code in [400, 409], f"Expected error on double daily claim, got {r.status_code}"
    print("✓ 10. Anti-double claim for daily check-in verified")

    # 11. Read chapter 1 (+5 ⚡)
    r = client.get("/chapters/1", headers=auth_headers)
    assert r.status_code == 200
    ch_data = r.json().get("data", {})
    assert not ch_data.get("is_reward_claimed"), "Reward should not be claimed yet"
    print(f"✓ 11. Read chapter #{ch_data['id']} '{ch_data['webtoon_title']}' loaded ({len(ch_data['images'])} images)")

    # 12. Claim chapter reward
    r = client.post("/chapters/1/reward", headers=auth_headers)
    assert r.status_code == 200, f"Chapter reward claim failed: {r.text}"
    ch_reward = r.json().get("data", {})
    assert ch_reward.get("reward_amount") == 5
    assert ch_reward.get("total_lightning_coins") == 70
    print("✓ 12. Chapter reward claimed: +5 ⚡, total balance = 70 ⚡")

    # Double claim chapter rejection
    r = client.post("/chapters/1/reward", headers=auth_headers)
    assert r.status_code in [400, 409], "Expected error on double chapter claim"
    print("✓ 13. Anti-farming chapter reward protection verified")

    # 13. Shop items listing
    r = client.get("/shop/items", headers=auth_headers)
    assert r.status_code == 200
    shop_items = r.json().get("data", [])
    assert len(shop_items) > 0, "No shop items available"
    frame_item = next((it for it in shop_items if it["item_type"] == "frame" and it["price_coins"] <= 70), None)
    assert frame_item is not None, "No affordable frame item found"
    print(f"✓ 14. Shop items loaded ({len(shop_items)} items). Selected frame #{frame_item['id']} '{frame_item['name']}' ({frame_item['price_coins']} ⚡)")

    # 14. Buy frame
    r = client.post(f"/shop/buy/{frame_item['id']}", headers=auth_headers)
    assert r.status_code == 200, f"Buy item failed: {r.text}"
    buy_data = r.json().get("data", {})
    expected_remaining = 70 - frame_item["price_coins"]
    assert buy_data.get("remaining_coins") == expected_remaining
    print(f"✓ 15. Bought frame #{frame_item['id']}, remaining coins = {expected_remaining} ⚡")

    # 15. Equip frame
    r = client.post(f"/shop/equip/{frame_item['id']}", headers=auth_headers)
    assert r.status_code == 200, f"Equip item failed: {r.text}"
    print(f"✓ 16. Equipped frame #{frame_item['id']}")

    # 16. Post chapter comment with equipped frame
    r = client.post(
        "/chapters/1/comments",
        headers=auth_headers,
        json={"content": "Bu ajoyib bob! Tarjimani kutamiz!"}
    )
    assert r.status_code == 201, f"Comment post failed: {r.text}"
    comm_data = r.json().get("data", {})
    comm_id = comm_data["id"]
    print(f"✓ 17. Comment #{comm_id} posted")

    # Check comment has equipped frame
    r = client.get("/chapters/1/comments")
    assert r.status_code == 200
    comments = r.json().get("data", [])
    my_comm = next((c for c in comments if c["id"] == comm_id), None)
    assert my_comm is not None, "Comment not found in list"
    assert my_comm["user"]["active_frame_url"] == frame_item["asset_url"], f"Expected frame {frame_item['asset_url']}, got {my_comm['user'].get('active_frame_url')}"
    print(f"✓ 18. Verified author avatar frame displayed in chapter comments")

    # 17. Library bookmarking
    r = client.post("/users/library/1", headers=auth_headers, json={"status": "reading"})
    assert r.status_code == 200
    r = client.get("/users/library", headers=auth_headers)
    assert r.status_code == 200
    library_items = r.json().get("data", [])
    assert any(b["webtoon"]["id"] == 1 and b["reading_status"] == "reading" for b in library_items)
    print("✓ 19. Webtoon bookmarked under 'reading' status in user library")

    # 18. Creator application
    r = client.post(
        "/creator-requests",
        headers=auth_headers,
        json={"message": "Koreys tilidan manhvalarni sifatli tarjima qilish tajribam bor."}
    )
    assert r.status_code == 201
    r = client.get("/creator-requests/my", headers=auth_headers)
    assert r.status_code == 200
    req_data = r.json().get("data", {})
    assert req_data["status"] == "pending"
    print("✓ 20. Creator application submitted and verified as pending")

    # 19. User Sessions
    r = client.get("/auth/sessions", headers=auth_headers)
    assert r.status_code == 200
    sessions = r.json().get("data", [])
    assert len(sessions) >= 1
    assert any(s["is_current"] for s in sessions)
    print(f"✓ 21. User sessions verified ({len(sessions)} active sessions)")

    print("\n========================================================")
    print("ALL 21 FRONTEND-TO-BACKEND INTEGRATION TESTS PASSED! 🎉")
    print("========================================================")

if __name__ == "__main__":
    test_flow()
