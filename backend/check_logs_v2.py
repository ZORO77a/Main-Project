import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys

# Force UTF-8 for stdout
sys.stdout.reconfigure(encoding='utf-8')

async def check_logs():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['geocrypt_db']
    
    with open("logs_final.txt", "w", encoding="utf-8") as f:
        print("=== Recent Access Logs (Last 5) ===", file=f)
        count = 0
        async for log in db.access_logs.find({"action": "file_access"}).sort('timestamp', -1).limit(5):
            count += 1
            print(f"Log #{count}", file=f)
            print(f"  Time: {log.get('timestamp')}", file=f)
            print(f"  User: {log.get('user_id')}", file=f)
            print(f"  Action: {log.get('action')}", file=f)
            print(f"  Success: {log.get('success')}", file=f)
            print(f"  Reason: {log.get('reason')}", file=f)
            if 'location' in log:
                print(f"  Location: {log.get('location')}", file=f)
            print("-" * 30, file=f)
        
        if count == 0:
            print("No access logs found.", file=f)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_logs())
