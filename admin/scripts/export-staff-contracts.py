"""Export or verify the request schemas used by studio contract regressions."""
import argparse
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "backend"))
from app.modules.shop.schemas import ShopItemUpdateRequest
from app.modules.webtoons.schemas import ChapterUpdateRequest
from app.modules.staff.schemas import ReaderUpdateRequest
from app.core.economy import EconomyUpdate

schemas = {model.__name__: model.model_json_schema() for model in (
    ShopItemUpdateRequest, ChapterUpdateRequest, ReaderUpdateRequest, EconomyUpdate
)}
target = Path(__file__).resolve().parent / "fixtures" / "staff-contracts.json"
parser = argparse.ArgumentParser()
parser.add_argument("--check", action="store_true")
args = parser.parse_args()
if args.check:
    if not target.exists() or json.loads(target.read_text(encoding="utf-8")) != schemas:
        raise SystemExit("Studio request fixtures differ from backend schemas. Run export-staff-contracts.py.")
    print("Studio request fixtures match backend Pydantic schemas.")
else:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(schemas, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Exported studio request contract fixtures.")
