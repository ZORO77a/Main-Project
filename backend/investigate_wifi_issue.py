import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime


async def investigate():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['geocrypt_db']  # Match the DB_NAME from .env
    
    print("=== Investigating WiFi SSID Issue ===\n")
    
    # 1. Check all employees and their allocated WiFi SSIDs
    print("1. Employee WiFi Configuration:")
    print("-" * 60)
    employee_count = 0
    async for user in db.users.find({'role': 'employee'}):
        employee_count += 1
        print(f"Email: {user.get('email')}")
        print(f"Name: {user.get('name')}")
        allocated_ssid = user.get('allocated_wifi_ssid')
        print(f"Allocated WiFi SSID: '{allocated_ssid}' (type: {type(allocated_ssid).__name__})")
        print(f"Length: {len(allocated_ssid) if allocated_ssid else 'N/A'}")
        
        # Check if they have active WFH
        wfh = await db.work_from_home_requests.find_one({
            'employee_id': str(user['_id']),
            'approved': True,
            'start_date': {'$lte': datetime.utcnow()},
            'end_date': {'$gte': datetime.utcnow()},
        })
        print(f"Active WFH (bypasses WiFi check): {wfh is not None}")
        
        # Check recent access logs
        recent_log = await db.access_logs.find_one(
            {'user_id': str(user['_id'])},
            sort=[('timestamp', -1)]
        )
        if recent_log:
            print(f"\nLast Access Attempt:")
            print(f"  - Success: {recent_log.get('success')}")
            print(f"  - Reason: {recent_log.get('reason')}")
            print(f"  - WiFi SSID sent: '{recent_log.get('wifi_ssid')}'")
            print(f"  - Location: {recent_log.get('location')}")
        
        print("-" * 60)
    
    print(f"\nTotal employees found: {employee_count}")
    
    # 2. Check if there are any access logs with WiFi failures
    print("\n2. Recent WiFi-related Access Failures:")
    print("-" * 60)
    failure_count = 0
    async for log in db.access_logs.find({'success': False}).sort('timestamp', -1).limit(5):
        if 'WiFi' in log.get('reason', '') or 'wifi' in log.get('reason', '').lower():
            failure_count += 1
            user = await db.users.find_one({'_id': ObjectId(log['user_id'])})
            print(f"User: {user.get('email') if user else 'Unknown'}")
            print(f"Timestamp: {log.get('timestamp')}")
            print(f"Reason: {log.get('reason')}")
            print(f"WiFi SSID sent: '{log.get('wifi_ssid')}'")
            print(f"Allocated SSID: '{user.get('allocated_wifi_ssid') if user else 'N/A'}'")
            print("-" * 60)
    
    if failure_count == 0:
        print("No WiFi-related failures found in recent logs")
    
    client.close()


if __name__ == "__main__":
    from bson import ObjectId
    asyncio.run(investigate())
