import asyncio
import os
from app.database import users_collection, device_fingerprints_collection
from bson import ObjectId

# Mock env vars if needed
os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["DB_NAME"] = "geocrypt_db"

async def list_info():
    print("--- USER DETAILS ---")
    email = "aswinanaik18@gmail.com"
    user = await users_collection.find_one({"email": email})
    if user:
        print(f"User: {user['email']}")
        print(f"Role: {user['role']}")
        print(f"Allocated WiFi: {user.get('allocated_wifi_ssid')}")
        print(f"Allocated Location: {user.get('allocated_location')}")
        print(f"WFH Allowed: {user.get('work_from_home_allowed')}")
    else:
        print(f"User {email} not found")


if __name__ == "__main__":
    import sys
    # Redirect stdout to a file
    with open("debug_devices.log", "w", encoding="utf-8") as f:
        sys.stdout = f
        loop = asyncio.get_event_loop()
        loop.run_until_complete(list_info())
