import asyncio
from motor.motor_asyncio import AsyncIOMotorClient


async def check_all_users():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['geocrypt_db']
    
    # Find all users
    with open("users_dump.txt", "w", encoding="utf-8") as f:
        print("=== All Users in Database ===\n", file=f)
        user_count = 0
        async for user in db.users.find({}):
            user_count += 1
            print(f"ID: {user['_id']}", file=f)
            print(f"Email: {user.get('email')}", file=f)
            print(f"Role: {user.get('role')}", file=f)
            print(f"Name: {user.get('name')}", file=f)
            print(f"Allocated WiFi SSID: '{user.get('allocated_wifi_ssid')}'", file=f)
            print(f"Allocated Location: {user.get('allocated_location')}", file=f)
            print(f"Allocated Time Start: {user.get('allocated_time_start')}", file=f)
            print(f"Allocated Time End: {user.get('allocated_time_end')}", file=f)
            print("-" * 50, file=f)
        
        print(f"\nTotal users found: {user_count}", file=f)
    
    client.close()


if __name__ == "__main__":
    asyncio.run(check_all_users())
