import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()

async def main():
    from motor.motor_asyncio import AsyncIOMotorClient
    import bcrypt
    client = AsyncIOMotorClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    db = client[os.getenv("DB_NAME", "geocrypt_db")]
    users = await db.users.find({}, {"email": 1, "name": 1, "role": 1, "password": 1}).to_list(50)
    print(f"Total users: {len(users)}")
    for u in users:
        print(f"  role={u.get('role')} email={u.get('email')} name={u.get('name')}")
    test_pws = ["admin123", "Admin@123", "Admin123", "password", "geocrypt123",
                "admin", "123456", "Aswin@123", "test123", "aswin123", "Aswin123"]
    print("Password test:")
    for u in users:
        email = u.get("email", "")
        ph = (u.get("password") or "").encode()
        found = False
        for pw in test_pws:
            try:
                if ph and bcrypt.checkpw(pw.encode(), ph):
                    print(f"  FOUND: {email} / {pw}")
                    found = True
                    break
            except Exception:
                pass
        if not found:
            print(f"  No match for: {email}")
    client.close()

asyncio.run(main())
