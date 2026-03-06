from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from datetime import datetime, timedelta
import os
import smtplib
from email.mime.text import MIMEText

from app.database import users_collection, otp_collection, access_logs_collection
from app.models import LoginRequest, OTPVerifyRequest, ResendOTPRequest
from app.utils import (
    verify_password,
    generate_otp,
    create_jwt_token,
    verify_jwt_token,
    hash_password,
)
from app.services.wifi_service import WiFiService

router = APIRouter(prefix="/auth", tags=["Auth"])
security = HTTPBearer()

OTP_EXPIRY_SECONDS = int(os.getenv("OTP_EXPIRY_SECONDS", "300"))

# ======================================================
# OTP EMAIL
# ======================================================

def send_otp_email(email: str, otp: str):
    smtp_user = os.getenv("EMAIL_USERNAME")
    smtp_pass = os.getenv("EMAIL_PASSWORD")

    # Dev mode fallback
    if not smtp_user or not smtp_pass:
        print(f"[DEV MODE] OTP for {email}: {otp}")
        return

    msg = MIMEText(f"Your GeoCrypt login OTP is: {otp}\n\nValid for 5 minutes.")
    msg["Subject"] = "GeoCrypt Login OTP"
    msg["From"] = smtp_user
    msg["To"] = email

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, email, msg.as_string())


# ======================================================
# AUTH DEPENDENCY (SINGLE SOURCE OF TRUTH)
# ======================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    payload = verify_jwt_token(credentials.credentials)

    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    try:
        user_id = ObjectId(payload["user_id"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = await users_collection.find_one({"_id": user_id})

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ======================================================
# LOGIN → SEND OTP
# ======================================================

@router.post("/login")
async def login(request: LoginRequest):
    user = await users_collection.find_one({"email": request.email})

    if not user or not verify_password(request.password, user["password_hash"]):
        await access_logs_collection.insert_one({
            "user_id": str(user["_id"]) if user else "unknown",
            "action": "login",
            "timestamp": datetime.utcnow(),
            "success": False,
            "reason": "Invalid credentials",
        })
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # BYPASS MODE: Skip OTP - directly issue full token
    from app.database import sessions_collection
    
    # Create session
    session_expires = datetime.utcnow() + timedelta(hours=24)
    await sessions_collection.update_one(
        {"user_id": str(user["_id"])},
        {
            "$set": {
                "user_id": str(user["_id"]),
                "session_token": f"session_{ObjectId()}",
                "face_verified": True,
                "face_bypassed": True,
                "expires_at": session_expires,
                "created_at": datetime.utcnow(),
            }
        },
        upsert=True,
    )

    # Issue full token with bypass flags
    token = create_jwt_token({
        "user_id": str(user["_id"]),
        "otp_verified": True,
        "face_verified": True,
        "auth_bypassed": True,
    })

    await access_logs_collection.insert_one({
        "user_id": str(user["_id"]),
        "action": "login",
        "timestamp": datetime.utcnow(),
        "success": True,
        "reason": "Bypassed authentication (OTP + Face)",
    })

    return {
        "token": token,
        "message": "Login successful (authentication bypassed)",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
            "role": user["role"],
        },
        "requires_face_verification": False,
    }


# ======================================================
# VERIFY OTP → ISSUE JWT (BYPASSED IN DEV MODE)
# ======================================================

@router.post("/verify-otp")
async def verify_otp(request: OTPVerifyRequest):
    # BYPASS MODE: Skip OTP verification and face verification
    user = await users_collection.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.database import sessions_collection
    
    # Create session
    session_expires = datetime.utcnow() + timedelta(hours=24)
    await sessions_collection.update_one(
        {"user_id": str(user["_id"])},
        {
            "$set": {
                "user_id": str(user["_id"]),
                "session_token": f"session_{ObjectId()}",
                "face_verified": True,
                "face_bypassed": True,
                "expires_at": session_expires,
                "created_at": datetime.utcnow(),
            }
        },
        upsert=True,
    )

    # Issue full token
    token = create_jwt_token({
        "user_id": str(user["_id"]),
        "otp_verified": True,
        "face_verified": True,
        "auth_bypassed": True,
    })

    await access_logs_collection.insert_one({
        "user_id": str(user["_id"]),
        "action": "otp_verified",
        "timestamp": datetime.utcnow(),
        "success": True,
        "reason": "OTP & Face verification bypassed",
    })

    return {
        "token": token,
        "message": "Login successful (OTP & Face verification bypassed)",
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
            "role": user["role"],
        },
    }


# ======================================================
# RESEND OTP
# ======================================================

@router.post("/resend-otp")
async def resend_otp(request: ResendOTPRequest):
    user = await users_collection.find_one({"email": request.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await otp_collection.update_many(
        {"email": request.email, "used": False},
        {"$set": {"used": True}},
    )

    otp_plain = generate_otp()
    otp_hash = hash_password(otp_plain)
    expires_at = datetime.utcnow() + timedelta(seconds=OTP_EXPIRY_SECONDS)

    await otp_collection.insert_one({
        "email": request.email,
        "otp_hash": otp_hash,
        "expires_at": expires_at,
        "used": False,
    })

    send_otp_email(request.email, otp_plain)

    await access_logs_collection.insert_one({
        "user_id": str(user["_id"]),
        "action": "resend_otp",
        "timestamp": datetime.utcnow(),
        "success": True,
    })

    return {"message": "OTP resent successfully"}


# ======================================================
# WIFI SSID DETECTION
# ======================================================

@router.get("/wifi-ssid")
async def get_wifi_ssid(current_user: dict = Depends(get_current_user)):
    """
    Get the currently connected WiFi SSID.
    Requires authentication.
    """
    ssid = WiFiService.get_connected_ssid()
    return {"ssid": ssid}
