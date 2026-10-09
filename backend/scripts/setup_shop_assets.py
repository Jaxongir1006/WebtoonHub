import os
import sys
import sqlite3
import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.dirname(ROOT_DIR)

PUBLIC_CONTENT = os.path.join(ROOT_DIR, "public_content")
FRONTEND_PUBLIC = os.path.join(PROJECT_DIR, "frontend", "public")

def ensure_dirs():
    dirs = [
        os.path.join(PUBLIC_CONTENT, "frames"),
        os.path.join(PUBLIC_CONTENT, "backgrounds"),
        os.path.join(FRONTEND_PUBLIC, "content", "frames"),
        os.path.join(FRONTEND_PUBLIC, "content", "backgrounds"),
        os.path.join(FRONTEND_PUBLIC, "assets", "frames"),
        os.path.join(FRONTEND_PUBLIC, "assets", "backgrounds"),
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

# -------------------------------------------------------------------------
# 1. High-Quality SVG Avatar Frames
# -------------------------------------------------------------------------

# Frame 1: Neon Cyberpunk (Electric Cyan & Amber glowing HUD)
SVG_NEON_LIGHTNING = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F2FE" />
      <stop offset="50%" stop-color="#4FACFE" />
      <stop offset="100%" stop-color="#00F2FE" />
    </linearGradient>
    <linearGradient id="neonGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Outer Ambient Glow Ring -->
  <circle cx="256" cy="256" r="215" fill="none" stroke="url(#neonCyan)" stroke-width="3" opacity="0.4" filter="url(#glowCyan)" />

  <!-- Segmented Tech Ring -->
  <circle cx="256" cy="256" r="210" fill="none" stroke="url(#neonCyan)" stroke-width="4" stroke-dasharray="24 16 8 16" filter="url(#glowCyan)" />

  <!-- Outer Glowing Solid Ring -->
  <circle cx="256" cy="256" r="198" fill="none" stroke="#00F2FE" stroke-width="2.5" opacity="0.7" />

  <!-- Main Cyber Bezel Ring -->
  <circle cx="256" cy="256" r="185" fill="none" stroke="url(#neonGold)" stroke-width="6" filter="url(#glowGold)" />

  <!-- Inner Trim Ring -->
  <circle cx="256" cy="256" r="172" fill="none" stroke="#FDE047" stroke-width="2.5" opacity="0.9" />

  <!-- 4 Corner Cyberpunk Tech Nodes & Lightning Bolts -->
  <!-- Top Node -->
  <g transform="translate(256, 42)">
    <polygon points="0,-18 10,-4 4,-4 8,14 -10,0 -4,0" fill="url(#neonGold)" filter="url(#glowGold)" />
    <circle cx="0" cy="18" r="5" fill="#00F2FE" filter="url(#glowCyan)" />
  </g>
  <!-- Bottom Node -->
  <g transform="translate(256, 470) rotate(180)">
    <polygon points="0,-18 10,-4 4,-4 8,14 -10,0 -4,0" fill="url(#neonGold)" filter="url(#glowGold)" />
    <circle cx="0" cy="18" r="5" fill="#00F2FE" filter="url(#glowCyan)" />
  </g>
  <!-- Right Node -->
  <g transform="translate(470, 256) rotate(90)">
    <polygon points="0,-18 10,-4 4,-4 8,14 -10,0 -4,0" fill="url(#neonGold)" filter="url(#glowGold)" />
    <circle cx="0" cy="18" r="5" fill="#00F2FE" filter="url(#glowCyan)" />
  </g>
  <!-- Left Node -->
  <g transform="translate(42, 256) rotate(270)">
    <polygon points="0,-18 10,-4 4,-4 8,14 -10,0 -4,0" fill="url(#neonGold)" filter="url(#glowGold)" />
    <circle cx="0" cy="18" r="5" fill="#00F2FE" filter="url(#glowCyan)" />
  </g>

  <!-- Diagonal Tech Ticks (45, 135, 225, 315 deg) -->
  <g transform="rotate(45, 256, 256)">
    <rect x="253" y="52" width="6" height="18" rx="3" fill="#00F2FE" filter="url(#glowCyan)" />
    <rect x="253" y="442" width="6" height="18" rx="3" fill="#00F2FE" filter="url(#glowCyan)" />
    <circle cx="256" cy="78" r="3.5" fill="#FDE047" />
    <circle cx="256" cy="434" r="3.5" fill="#FDE047" />
  </g>
  <g transform="rotate(135, 256, 256)">
    <rect x="253" y="52" width="6" height="18" rx="3" fill="#00F2FE" filter="url(#glowCyan)" />
    <rect x="253" y="442" width="6" height="18" rx="3" fill="#00F2FE" filter="url(#glowCyan)" />
    <circle cx="256" cy="78" r="3.5" fill="#FDE047" />
    <circle cx="256" cy="434" r="3.5" fill="#FDE047" />
  </g>
</svg>"""

# Frame 2: Imperial Gold Laurels & Royal Crown
SVG_GOLD_HERO = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" />
      <stop offset="35%" stop-color="#F59E0B" />
      <stop offset="70%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#B45309" />
    </linearGradient>
    <linearGradient id="rubyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDA4AF" />
      <stop offset="50%" stop-color="#E11D48" />
      <stop offset="100%" stop-color="#881337" />
    </linearGradient>
    <filter id="royalGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Outer Beaded Gold Ring -->
  <circle cx="256" cy="256" r="208" fill="none" stroke="url(#goldGradient)" stroke-width="3" stroke-dasharray="6 8" filter="url(#royalGlow)" />

  <!-- Main Ornate Outer Gold Ring -->
  <circle cx="256" cy="256" r="196" fill="none" stroke="url(#goldGradient)" stroke-width="7" filter="url(#royalGlow)" />

  <!-- Inner Embossed Gold Ring -->
  <circle cx="256" cy="256" r="176" fill="none" stroke="#FDE047" stroke-width="3" opacity="0.9" />

  <!-- Laurel Leaves along Left Side -->
  <g fill="url(#goldGradient)" filter="url(#royalGlow)">
    <!-- Left Leaves -->
    <path d="M 64,256 C 50,230 65,210 80,225 C 75,200 95,190 108,206 C 98,175 125,165 140,185 C 130,150 160,140 178,162" fill="none" stroke="url(#goldGradient)" stroke-width="5" stroke-linecap="round" />
    <path d="M 64,256 C 50,282 65,302 80,287 C 75,312 95,322 108,306 C 98,337 125,347 140,327 C 130,362 160,372 178,350" fill="none" stroke="url(#goldGradient)" stroke-width="5" stroke-linecap="round" />

    <!-- Right Leaves -->
    <path d="M 448,256 C 462,230 447,210 432,225 C 437,200 417,190 404,206 C 414,175 387,165 372,185 C 382,150 352,140 334,162" fill="none" stroke="url(#goldGradient)" stroke-width="5" stroke-linecap="round" />
    <path d="M 448,256 C 462,282 447,302 432,287 C 437,312 417,322 404,306 C 414,337 387,347 372,327 C 382,362 352,372 334,350" fill="none" stroke="url(#goldGradient)" stroke-width="5" stroke-linecap="round" />
  </g>

  <!-- Royal Crown at Top Center -->
  <g transform="translate(256, 52)" filter="url(#royalGlow)">
    <!-- Crown Base -->
    <path d="M -45,18 L 45,18 L 38,28 L -38,28 Z" fill="url(#goldGradient)" stroke="#FEF08A" stroke-width="1.5" />
    <!-- Crown Peaks -->
    <path d="M -42,18 L -48,-14 L -20,6 L 0,-28 L 20,6 L 48,-14 L 42,18 Z" fill="url(#goldGradient)" stroke="#FEF08A" stroke-width="2" />
    <!-- Center Inlaid Ruby Gem -->
    <polygon points="0,-12 12,0 0,12 -12,0" fill="url(#rubyGradient)" stroke="#FECDD3" stroke-width="1.5" />
    <!-- Side Small Diamonds -->
    <circle cx="-48" cy="-14" r="4.5" fill="#FEF08A" />
    <circle cx="0" cy="-28" r="6" fill="#FEF08A" />
    <circle cx="48" cy="-14" r="4.5" fill="#FEF08A" />
  </g>

  <!-- Bottom Crest Ornament -->
  <g transform="translate(256, 452)" filter="url(#royalGlow)">
    <polygon points="0,-14 16,0 0,14 -16,0" fill="url(#rubyGradient)" stroke="#FEF08A" stroke-width="2" />
    <circle cx="-28" cy="0" r="4" fill="url(#goldGradient)" />
    <circle cx="28" cy="0" r="4" fill="url(#goldGradient)" />
  </g>
</svg>"""

# Frame 3: Dragon Fire (Blazing Crimson & Solar Flames)
SVG_DRAGON_FIRE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="fireGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#DC2626" />
      <stop offset="40%" stop-color="#EA580C" />
      <stop offset="75%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#FEF08A" />
    </linearGradient>
    <filter id="flameGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Burning Ambient Halo -->
  <circle cx="256" cy="256" r="210" fill="none" stroke="#EA580C" stroke-width="3" opacity="0.5" filter="url(#flameGlow)" />

  <!-- Magma Core Ring -->
  <circle cx="256" cy="256" r="192" fill="none" stroke="url(#fireGrad1)" stroke-width="8" filter="url(#flameGlow)" />

  <!-- Inner Ember Ring -->
  <circle cx="256" cy="256" r="175" fill="none" stroke="#FDE047" stroke-width="3" opacity="0.9" />

  <!-- Swirling Flame Tendrils radiating out -->
  <g fill="url(#fireGrad1)" filter="url(#flameGlow)">
    <!-- Top Right Dragon Horn / Blazing Crescent -->
    <path d="M 230,68 C 280,30 350,50 380,100 C 370,80 340,70 300,85 C 330,60 270,55 230,68 Z" />
    <path d="M 370,110 C 430,140 460,200 455,260 C 445,220 420,180 380,160 C 410,180 395,130 370,110 Z" />

    <!-- Bottom Right Blazing Arc -->
    <path d="M 445,280 C 455,340 420,410 360,445 C 380,410 380,370 355,340 C 380,360 385,300 445,280 Z" />
    <path d="M 330,450 C 280,480 210,480 160,445 C 190,450 230,440 250,420 C 220,430 180,420 160,445 Z" />

    <!-- Bottom Left Flame -->
    <path d="M 140,435 C 80,400 50,340 55,270 C 65,310 90,340 130,360 C 100,340 115,390 140,435 Z" />

    <!-- Top Left Horn & Arc -->
    <path d="M 65,240 C 50,180 90,110 150,75 C 130,110 130,150 155,180 C 130,155 125,220 65,240 Z" />
    <path d="M 170,70 C 210,45 270,40 300,55 C 265,55 235,68 210,90 C 235,70 190,65 170,70 Z" />
  </g>

  <!-- Glowing Embers Particles -->
  <circle cx="210" cy="48" r="4.5" fill="#FEF08A" filter="url(#flameGlow)" />
  <circle cx="400" cy="85" r="5" fill="#FEF08A" filter="url(#flameGlow)" />
  <circle cx="468" cy="220" r="4" fill="#FDE047" filter="url(#flameGlow)" />
  <circle cx="420" cy="420" r="5.5" fill="#FEF08A" filter="url(#flameGlow)" />
  <circle cx="100" cy="440" r="4" fill="#FEF08A" filter="url(#flameGlow)" />
  <circle cx="45" cy="200" r="5" fill="#FDE047" filter="url(#flameGlow)" />
</svg>"""

# Frame 4: Cosmic Void & Celestial Rings
SVG_COSMIC_VOID = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="cosmicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="35%" stop-color="#818CF8" />
      <stop offset="70%" stop-color="#C084FC" />
      <stop offset="100%" stop-color="#F472B6" />
    </linearGradient>
    <filter id="cosmicGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="7" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Ambient Deep Violet Halo -->
  <circle cx="256" cy="256" r="215" fill="none" stroke="#818CF8" stroke-width="2.5" opacity="0.4" filter="url(#cosmicGlow)" />

  <!-- Elliptical Tilted Gyroscope Orbital Ring 1 -->
  <ellipse cx="256" cy="256" rx="228" ry="120" fill="none" stroke="url(#cosmicGrad)" stroke-width="3.5" transform="rotate(-30, 256, 256)" filter="url(#cosmicGlow)" stroke-dasharray="120 18 40 18" />

  <!-- Elliptical Tilted Gyroscope Orbital Ring 2 -->
  <ellipse cx="256" cy="256" rx="228" ry="120" fill="none" stroke="url(#cosmicGrad)" stroke-width="3" transform="rotate(40, 256, 256)" opacity="0.75" filter="url(#cosmicGlow)" stroke-dasharray="80 25 15 25" />

  <!-- Main Arcane Stellar Ring -->
  <circle cx="256" cy="256" r="192" fill="none" stroke="url(#cosmicGrad)" stroke-width="6.5" filter="url(#cosmicGlow)" />

  <!-- Inner Starlight Ring -->
  <circle cx="256" cy="256" r="174" fill="none" stroke="#E0E7FF" stroke-width="2.5" opacity="0.9" />

  <!-- Crescent Moon at Top Right (1:30 position) -->
  <g transform="translate(378, 120) rotate(-25)" filter="url(#cosmicGlow)">
    <path d="M 0,-18 A 18,18 0 1,1 -14,14 A 14,14 0 1,0 0,-18 Z" fill="#FDF4FF" stroke="#C084FC" stroke-width="1.5" />
  </g>

  <!-- 4 Point Diamond Stars & Constellation Nodes -->
  <g fill="#FDF4FF" filter="url(#cosmicGlow)">
    <!-- Top Star -->
    <path d="M 256,42 Q 256,54 268,54 Q 256,54 256,66 Q 256,54 244,54 Q 256,54 256,42 Z" />
    <!-- Bottom Star -->
    <path d="M 256,446 Q 256,458 268,458 Q 256,458 256,470 Q 256,458 244,458 Q 256,458 256,446 Z" />
    <!-- Left Star -->
    <path d="M 44,256 Q 44,268 56,268 Q 44,268 44,280 Q 44,268 32,268 Q 44,268 44,256 Z" />
    <!-- Right Star -->
    <path d="M 468,256 Q 468,268 480,268 Q 468,268 468,280 Q 468,268 456,268 Q 468,268 468,256 Z" />
  </g>

  <!-- Glowing Stardust Beads around ring -->
  <circle cx="150" cy="98" r="3.5" fill="#38BDF8" filter="url(#cosmicGlow)" />
  <circle cx="360" cy="400" r="4" fill="#F472B6" filter="url(#cosmicGlow)" />
  <circle cx="110" cy="370" r="3.5" fill="#C084FC" filter="url(#cosmicGlow)" />
</svg>"""

FRAMES_CONFIG = [
    {
        "filename": "neon_lightning.svg",
        "name": "Neon Chaqmoq Ramkasi",
        "content": SVG_NEON_LIGHTNING,
        "price_coins": 50
    },
    {
        "filename": "gold_hero.svg",
        "name": "Oltin Qahramon Ramkasi",
        "content": SVG_GOLD_HERO,
        "price_coins": 100
    },
    {
        "filename": "dragon_fire.svg",
        "name": "Ajdaho Olovi Ramkasi",
        "content": SVG_DRAGON_FIRE,
        "price_coins": 150
    },
    {
        "filename": "cosmic_void.svg",
        "name": "Koinot Bo'shlig'i Ramkasi",
        "content": SVG_COSMIC_VOID,
        "price_coins": 200
    }
]

# -------------------------------------------------------------------------
# 2. Real High-Resolution Wallpaper Backgrounds
# -------------------------------------------------------------------------
BACKGROUNDS_CONFIG = [
    {
        "filename": "bg_cyber_tokyo.jpg",
        "name": "Neon Cyber Tokio",
        "url": "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1600&q=80",
        "price_coins": 80
    },
    {
        "filename": "bg_magic_castle.jpg",
        "name": "Sehrli Qasr & Qutb Yog'dusi",
        "url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80",
        "price_coins": 120
    },
    {
        "filename": "bg_sunset_horizon.jpg",
        "name": "Anime Quyosh Botishi",
        "url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
        "price_coins": 100
    },
    {
        "filename": "bg_shadow_realm.jpg",
        "name": "Soyalar Hukmdori Zindoni",
        "url": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80",
        "price_coins": 250
    }
]

def save_frames():
    print("--- Saving SVG Frames ---")
    dest_dirs = [
        os.path.join(PUBLIC_CONTENT, "frames"),
        os.path.join(FRONTEND_PUBLIC, "content", "frames"),
        os.path.join(FRONTEND_PUBLIC, "assets", "frames"),
    ]
    for frame in FRAMES_CONFIG:
        content = frame["content"].encode("utf-8")
        for d in dest_dirs:
            filepath = os.path.join(d, frame["filename"])
            with open(filepath, "wb") as f:
                f.write(content)
        print(f"Created frame: {frame['filename']} ({frame['name']})")

def download_backgrounds():
    print("\n--- Downloading Background Wallpapers ---")
    headers = {"User-Agent": "Mozilla/5.0"}
    with httpx.Client(timeout=30.0, headers=headers, follow_redirects=True) as client:
        for bg in BACKGROUNDS_CONFIG:
            print(f"Downloading {bg['name']}...")
            try:
                r = client.get(bg["url"])
                if r.status_code == 200:
                    data = r.content
                    dest_dirs = [
                        os.path.join(PUBLIC_CONTENT, "backgrounds"),
                        os.path.join(FRONTEND_PUBLIC, "content", "backgrounds"),
                        os.path.join(FRONTEND_PUBLIC, "assets", "backgrounds"),
                    ]
                    for d in dest_dirs:
                        filepath = os.path.join(d, bg["filename"])
                        with open(filepath, "wb") as f:
                            f.write(data)
                    print(f"Saved: {bg['filename']} ({len(data)} bytes)")
                else:
                    print(f"Failed {bg['filename']}: HTTP {r.status_code}")
            except Exception as e:
                print(f"Error downloading {bg['filename']}: {e}")

def update_database():
    print("\n--- Updating SQLite Database Shop Items ---")
    db_path = os.path.join(ROOT_DIR, "webtoonhub.db")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Clear existing shop items or re-seed cleanly
    # First delete any orphaned user inventory for safety
    c.execute("DELETE FROM user_inventory")
    c.execute("DELETE FROM shop_items")

    # Insert 4 Avatar Frames
    inserted_frames = []
    for f in FRAMES_CONFIG:
        asset_url = f"/content/frames/{f['filename']}"
        c.execute("""
            INSERT INTO shop_items (name, item_type, price_coins, asset_url, is_available)
            VALUES (?, 'frame', ?, ?, 1)
        """, (f["name"], f["price_coins"], asset_url))
        inserted_frames.append(c.lastrowid)

    # Insert 4 Backgrounds
    inserted_bgs = []
    for bg in BACKGROUNDS_CONFIG:
        asset_url = f"/content/backgrounds/{bg['filename']}"
        c.execute("""
            INSERT INTO shop_items (name, item_type, price_coins, asset_url, is_available)
            VALUES (?, 'background', ?, ?, 1)
        """, (bg["name"], bg["price_coins"], asset_url))
        inserted_bgs.append(c.lastrowid)

    print(f"Inserted {len(inserted_frames)} frames and {len(inserted_bgs)} backgrounds into shop_items!")

    # Ensure test user (id 1 or first user) has enough coins and owns some items to test immediately
    c.execute("SELECT id, username, lightning_coins FROM users ORDER BY id ASC LIMIT 2")
    users = c.fetchall()
    for u in users:
        u_id = u[0]
        # Give generous test coins (1000 Chaqmoq)
        c.execute("UPDATE users SET lightning_coins = MAX(lightning_coins, 1000) WHERE id = ?", (u_id,))

        # Give user the 1st frame and equip it
        c.execute("""
            INSERT INTO user_inventory (user_id, item_id, is_active)
            VALUES (?, ?, 1)
        """, (u_id, inserted_frames[0]))

        # Give user the 1st background and equip it
        c.execute("""
            INSERT INTO user_inventory (user_id, item_id, is_active)
            VALUES (?, ?, 1)
        """, (u_id, inserted_bgs[0]))

        print(f"User ID #{u_id} ({u[1]}): Equipped Frame ID #{inserted_frames[0]} and Background ID #{inserted_bgs[0]} + 1000 coins!")

    conn.commit()
    conn.close()
    print("Database update complete!")

if __name__ == "__main__":
    ensure_dirs()
    save_frames()
    download_backgrounds()
    update_database()
