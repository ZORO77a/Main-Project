import asyncio
from motor.motor_asyncio import AsyncIOMotorClient


async def check_wifi_config():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['geocrypt']
    
    # Find all employees
    print("=== Employee WiFi Configuration ===\n")
    async for user in db.users.find({'role': 'employee'}):
        print(f"Email: {user.get('email')}")
        print(f"Name: {user.get('name')}")
        print(f"Allocated WiFi SSID: '{user.get('allocated_wifi_ssid')}'")
        print(f"Has WFH active? Checking...")
        
        # Check if they have active WFH
        from datetime import datetime
        wfh = await db.work_from_home_requests.find_one({
            'employee_id': str(user['_id']),
            'approved': True,
            'start_date': {'$lte': datetime.utcnow()},
            'end_date': {'$gte': datetime.utcnow()},
        })
        print(f"Active WFH: {wfh is not None}")
        print("-" * 50)
    
    client.close()


if __name__ == "__main__":
    asyncio.run(check_wifi_config())
