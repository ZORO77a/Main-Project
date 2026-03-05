"""
Reset admin user password to a known value for testing.
Uses the correct field name 'password_hash' as used by auth.py

Run: venv\Scripts\python.exe reset_admin_pw.py
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()

NEW_PASSWORD = "Admin@123"


async def main():
    from motor.motor_asyncio import AsyncIOMotorClient
    import bcrypt

    client = AsyncIOMotorClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    db = client[os.getenv("DB_NAME", "geocrypt_db")]

    users = await db.users.find({}, {"email": 1, "name": 1, "role": 1}).to_list(50)
    print(f"All users ({len(users)}):")
    for u in users:
        print(f"  [{u.get('role')}] {u.get('email')} — {u.get('name', 'N/A')}")

    # Use 'password_hash' field (as used by auth.py line 82)
    hashed = bcrypt.hashpw(NEW_PASSWORD.encode(), bcrypt.gensalt()).decode()
    result = await db.users.update_many(
        {"role": "admin"},
        {"$set": {"password_hash": hashed}}
    )
    print(f"\nReset password_hash for {result.modified_count} admin user(s) to: {NEW_PASSWORD}")
    print("Login with the admin email above and password:", NEW_PASSWORD)
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
