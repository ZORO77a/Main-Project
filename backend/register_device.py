import asyncio
import os
from datetime import datetime
from bson import ObjectId
from app.database import device_fingerprints_collection, users_collection

# Mock env vars
os.environ["MONGO_URL"] = "mongodb://localhost:27017"
os.environ["DB_NAME"] = "geocrypt_db"

TARGET_FINGERPRINT = "0e0016116fc142c7a83802698ca6c8775598fad2d31a46b33d217115fc63ea6e"
TARGET_USER_EMAIL = "aswinanaik18@gmail.com"

async def register_device():
    # 1. Find user
    user = await users_collection.find_one({"email": TARGET_USER_EMAIL})
    if not user:
        print(f"User {TARGET_USER_EMAIL} not found!")
        return

    user_id = str(user["_id"])
    print(f"User ID: {user_id}")

    # 2. Check if already exists
    existing = await device_fingerprints_collection.find_one({
        "user_id": user_id,
        "fingerprint": TARGET_FINGERPRINT
    })

    if existing:
        print("Device already exists!")
        if not existing.get("trusted"):
            print("Updating to trusted...")
            await device_fingerprints_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": {"trusted": True}}
            )
            print("Done.")
        else:
            print("Already trusted.")
    else:
        print("Registering new device...")
        device_doc = {
            "user_id": user_id,
            "fingerprint": TARGET_FINGERPRINT,
            "device_info": {"note": "Manually registered via script"},
            "first_seen": datetime.utcnow(),
            "last_seen": datetime.utcnow(),
            "trusted": True,
        }
        await device_fingerprints_collection.insert_one(device_doc)
        print("Device registered successfully.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(register_device())
