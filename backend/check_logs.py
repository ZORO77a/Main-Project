import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

async def check_logs():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['geocrypt_db']
    
    print("=== Recent Access Logs (Last 5) ===\n")
    async for log in db.access_logs.find().sort('timestamp', -1).limit(5):
        print(f"Time: {log.get('timestamp')}")
        print(f"User: {log.get('user_id')}")
        print(f"Action: {log.get('action')}")
        print(f"Success: {log.get('success')}")
        print(f"Reason: {log.get('reason')}")
        print(f"WiFi SSID: {log.get('wifi_ssid')}")
        if 'location' in log:
            print(f"Location: {log.get('location')}")
        print("-" * 50)
        
    client.close()

if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    asyncio.run(check_logs())
