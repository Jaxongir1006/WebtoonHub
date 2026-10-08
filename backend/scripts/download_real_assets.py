import os
import sys
import httpx

PUBLIC_CONTENT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public_content")

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)

def download_file(url: str, dest_path: str):
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        print(f"Already exists: {dest_path}")
        return
    print(f"Downloading {url} -> {dest_path}...")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    with httpx.Client(timeout=30.0, headers=headers, follow_redirects=True) as client:
        r = client.get(url)
        if r.status_code == 200:
            with open(dest_path, "wb") as f:
                f.write(r.content)
            print(f"Saved: {dest_path} ({len(r.content)} bytes)")
        else:
            print(f"Failed to download {url}: HTTP {r.status_code}")

def download_all():
    ensure_dir(os.path.join(PUBLIC_CONTENT, "covers"))
    ensure_dir(os.path.join(PUBLIC_CONTENT, "manhwa", "solo-leveling", "ch1"))
    ensure_dir(os.path.join(PUBLIC_CONTENT, "manga", "death-note", "ch1"))

    # 1. Download Covers
    covers = {
        "solo-leveling.jpg": "https://uploads.mangadex.org/covers/32d76d19-8a05-4db0-9fc2-e0b0648fe9d0/dc37c1fb-5ead-4a7c-933f-811193c0cc7e.jpg",
        "death-note.jpg": "https://uploads.mangadex.org/covers/695e6ed1-9823-486e-87bf-ec1fa536f0c1/1fa9dc00-0202-473c-80f5-d2e1a47eda1d.jpg",
        "lord-of-mysteries.jpg": "https://uploads.mangadex.org/covers/c4b36f15-4ee5-425f-a77d-c2e7cbb970d8/58f719b2-f42d-4a16-9506-91d943d823ea.jpg"
    }
    for name, url in covers.items():
        download_file(url, os.path.join(PUBLIC_CONTENT, "covers", name))

    # 2. Solo Leveling Manhwa Chapter 1 (12 panels)
    print("\n--- Fetching Solo Leveling Chapter 1 Pages ---")
    sl_ch_id = "a05e77dc-ff36-44e3-99a9-a36529a341a2"
    with httpx.Client(timeout=30.0) as client:
        srv = client.get(f"https://api.mangadex.org/at-home/server/{sl_ch_id}").json()
        base = srv["baseUrl"]
        h = srv["chapter"]["hash"]
        pages = srv["chapter"]["data"][:12]
        for idx, page in enumerate(pages, start=1):
            page_url = f"{base}/data/{h}/{page}"
            dest = os.path.join(PUBLIC_CONTENT, "manhwa", "solo-leveling", "ch1", f"p{idx:02d}.jpg")
            download_file(page_url, dest)

    # 3. Death Note Manga Chapter 1 (14 pages)
    print("\n--- Fetching Death Note Chapter 1 Pages ---")
    dn_ch_id = "527abf66-f3f2-4b5c-8a21-dedc844bcb15"
    with httpx.Client(timeout=30.0) as client:
        srv = client.get(f"https://api.mangadex.org/at-home/server/{dn_ch_id}").json()
        base = srv["baseUrl"]
        h = srv["chapter"]["hash"]
        pages = srv["chapter"]["data"][:14]
        for idx, page in enumerate(pages, start=1):
            page_url = f"{base}/data/{h}/{page}"
            dest = os.path.join(PUBLIC_CONTENT, "manga", "death-note", "ch1", f"p{idx:02d}.jpg")
            download_file(page_url, dest)

    print("\nAll real assets downloaded successfully to backend/public_content!")

if __name__ == "__main__":
    download_all()
