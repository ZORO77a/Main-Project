import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_user():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['geocrypt_db']
    
    email = "aswinanaik18@gmail.com"
    
    # Actual User Location (from logs)
    new_location = {'lat': 9.4127425, 'lng': 76.64202374999999}
    new_ssid = "Mtech lab 5G"
    
    print(f"Updating user {email}...")
    result = await db.users.update_one(
        {"email": email},
        {"$set": {
            "allocated_location": new_location,
            "allocated_wifi_ssid": new_ssid
        }}
    )
    
    if result.modified_count > 0:
        print("✅ User configuration updated successfully!")
        print(f"New Location: {new_location}")
        print(f"New WiFi SSID: {new_ssid}")
    else:
        print("⚠️ User not found or no changes made.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_user())
