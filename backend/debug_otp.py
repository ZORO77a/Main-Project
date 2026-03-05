"""
Debug script to check OTP status in database
Run this to see what OTPs are stored for debugging
"""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")

async def check_otps():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    otp_collection = db["otp"]
    
    print("\n=== OTP Debug Information ===\n")
    
    # Get all OTPs
    otps = await otp_collection.find({}).sort("expires_at", -1).to_list(100)
    
    if not otps:
        print("No OTPs found in database.")
        return
    
    print(f"Found {len(otps)} OTP records:\n")
    
    for i, otp in enumerate(otps, 1):
        expires_at = otp.get("expires_at")
        is_expired = expires_at < datetime.utcnow() if expires_at else True
        is_used = otp.get("used", False)
        
        status = "✅ VALID" if not is_expired and not is_used else "❌ INVALID"
        if is_expired:
            status += " (EXPIRED)"
        if is_used:
            status += " (USED)"
        
        print(f"{i}. Email: {otp.get('email')}")
        print(f"   Status: {status}")
        print(f"   Expires: {expires_at}")
        print(f"   Used: {is_used}")
        print(f"   Created: {otp.get('_id').generation_time if otp.get('_id') else 'Unknown'}")
        print()

if __name__ == "__main__":
    asyncio.run(check_otps())
