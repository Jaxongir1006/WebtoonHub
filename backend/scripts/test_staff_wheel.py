import urllib.request
import json
import sys
from scripts._test_credentials import staff_credentials

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# 1. Login as staff admin
staff_email, staff_password = staff_credentials()
data = json.dumps({'email': staff_email, 'password': staff_password}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8000/api/v1/staff/auth/login', data=data, headers={'Content-Type': 'application/json', 'X-Device-Type': 'Desktop'})
try:
    res = urllib.request.urlopen(req)
    token = json.loads(res.read().decode())['data']['access_token']
    print('Staff Login OK')
except Exception as e:
    print('Staff Login Failed:', e)
    sys.exit(1)

# 2. Test create new wheel
wheel_data = json.dumps({
    'title': 'Test Yangi Charx',
    'description': 'Sinov tavsif',
    'cost_coins': 150,
    'has_daily_free_spin': True,
    'color': '#8B5CF6',
    'is_active': True
}).encode('utf-8')
req2 = urllib.request.Request('http://127.0.0.1:8000/api/v1/staff/wheels', data=wheel_data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
try:
    res2 = urllib.request.urlopen(req2)
    created_wheel = json.loads(res2.read().decode())
    print('Create Wheel Success:', created_wheel)
    new_wheel_id = created_wheel['data']['id']
except urllib.error.HTTPError as e:
    print('Create Wheel Error:', e.code, e.read().decode())
    sys.exit(1)

# 3. Test add item to new wheel
item_data = json.dumps({
    'reward_type': 'coins',
    'reward_coins': 50,
    'label': '+50 ⚡ Test',
    'color': '#10B981',
    'text_color': '#FFFFFF',
    'icon': 'coins',
    'weight': 15,
    'is_jackpot': False,
    'order_index': 0
}).encode('utf-8')
req3 = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/staff/wheels/{new_wheel_id}/items', data=item_data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
try:
    res3 = urllib.request.urlopen(req3)
    created_item = json.loads(res3.read().decode())
    print('Create Wheel Item Success:', created_item)
except urllib.error.HTTPError as e:
    print('Create Wheel Item Error:', e.code, e.read().decode())
