import asyncio
import os
from datetime import datetime

from app.database import users_collection
from app.utils import hash_password


async def create_employee():
    # allow overriding via environment variables, but fall back to requested defaults
    employee_email = os.getenv("EMPLOYEE_EMAIL", "pta22cc016@cek.ac.in")
    employee_password = os.getenv("EMPLOYEE_PASSWORD", "ananthan")

    if not employee_email or not employee_password:
        raise RuntimeError(
            "Set EMPLOYEE_EMAIL and EMPLOYEE_PASSWORD environment variables"
        )

    existing_employee = await users_collection.find_one({"email": employee_email})
    if existing_employee:
        print("Employee user already exists")
        return

    employee_doc = {
        "email": employee_email,
        "password_hash": hash_password(employee_password),
        "role": "employee",
        "name": "Ananthakrishnan",
        "phone": "+1234567890",
        "allocated_location": {"lat": 12.9716, "lng": 77.5946},
        "allocated_wifi_ssid": "Office_WiFi",
        "allocated_time_start": "09:00",
        "allocated_time_end": "18:00",
        "is_active": True,
        "work_from_home_allowed": False,
        "created_at": datetime.utcnow(),
    }

    result = await users_collection.insert_one(employee_doc)

    print("Employee created successfully")
    print(f"Employee ID: {result.inserted_id}")
    print(f"Email: {employee_email}")
    print("Password: [HIDDEN]")
    print("Please change the password after first login!")


if __name__ == "__main__":
    asyncio.run(create_employee())
