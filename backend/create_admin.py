import asyncio
import os
from datetime import datetime

from app.database import users_collection
from app.utils import hash_password


async def create_initial_admin():
    # Check if admin already exists
    existing_admin = await users_collection.find_one({"role": "admin"})
    if existing_admin:
        print("Admin user already exists")
        return

    # allow overriding via environment variables, but fall back to fixed defaults
    admin_email = os.getenv("INITIAL_ADMIN_EMAIL", "ananthakrishnan272004@gmail.com")
    admin_password = os.getenv("INITIAL_ADMIN_PASSWORD", "admin")

    # if the defaults are still unset (which won't happen) raise an error
    if not admin_email or not admin_password:
        raise RuntimeError(
            "Environment variables INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set"
        )

    admin_doc = {
        "email": admin_email,
        "password_hash": hash_password(admin_password),
        "role": "admin",
        "name": "System Admin",
        "phone": "9074433418",
        "is_active": True,
        "work_from_home_allowed": True,
        "created_at": datetime.utcnow(),
    }

    result = await users_collection.insert_one(admin_doc)

    print("Initial admin created successfully")
    print(f"Admin ID: {result.inserted_id}")
    print(f"Email: {admin_email}")
    print("Password: [HIDDEN]")
    print("Please change the password after first login!")


if __name__ == "__main__":
    asyncio.run(create_initial_admin())
