"""
Device Fingerprinting Routes
Handles device registration and verification
"""
from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from datetime import datetime

from app.database import (
    users_collection,
    device_fingerprints_collection,
    access_logs_collection,
)
from app.models import DeviceFingerprintRequest
from app.services.device_fingerprint import (
    generate_device_fingerprint,
    compare_device_fingerprints,
    validate_device_info,
)
from app.routes.auth import get_current_user

router = APIRouter(prefix="/auth/device", tags=["Device Fingerprint"])


@router.post("/register")
async def register_device(
    payload: DeviceFingerprintRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Register device fingerprint for current user
    """
    user_id = str(current_user["_id"])

    # Validate device info
    device_info = payload.dict()
    is_valid, error_msg = validate_device_info(device_info)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Generate fingerprint
    fingerprint_hash = generate_device_fingerprint(device_info)

    # Check if device already registered
    existing = await device_fingerprints_collection.find_one({
        "user_id": user_id,
        "fingerprint": fingerprint_hash,
    })

    if existing:
        # Update last seen
        await device_fingerprints_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"last_seen": datetime.utcnow()}},
        )
        return {
            "message": "Device already registered",
            "device_id": str(existing["_id"]),
            "fingerprint": fingerprint_hash,
        }

    # Register new device
    device_doc = {
        "user_id": user_id,
        "fingerprint": fingerprint_hash,
        "device_info": device_info,
        "first_seen": datetime.utcnow(),
        "last_seen": datetime.utcnow(),
        "trusted": True,  # Admin can mark as untrusted
    }

    result = await device_fingerprints_collection.insert_one(device_doc)

    return {
        "message": "Device registered successfully",
        "device_id": str(result.inserted_id),
        "fingerprint": fingerprint_hash,
    }


@router.post("/verify")
async def verify_device(
    payload: DeviceFingerprintRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Verify device fingerprint
    """
    user_id = str(current_user["_id"])

    # Generate fingerprint from current device info
    device_info = payload.dict()
    fingerprint_hash = generate_device_fingerprint(device_info)

    # Check if device is registered and trusted
    device = await device_fingerprints_collection.find_one({
        "user_id": user_id,
        "fingerprint": fingerprint_hash,
        "trusted": True,
    })

    if not device:
        # Log failed device verification
        await access_logs_collection.insert_one({
            "user_id": user_id,
            "action": "device_verification",
            "timestamp": datetime.utcnow(),
            "success": False,
            "reason": "Device not registered or not trusted",
        })

        raise HTTPException(
            status_code=403,
            detail="Device not recognized. Please register your device first."
        )

    # Update last seen
    await device_fingerprints_collection.update_one(
        {"_id": device["_id"]},
        {"$set": {"last_seen": datetime.utcnow()}},
    )

    return {
        "verified": True,
        "device_id": str(device["_id"]),
        "message": "Device verified successfully",
    }


@router.get("/list")
async def list_devices(current_user: dict = Depends(get_current_user)):
    """
    List all registered devices for current user
    """
    user_id = str(current_user["_id"])

    devices = []
    async for device in device_fingerprints_collection.find({"user_id": user_id}):
        devices.append({
            "id": str(device["_id"]),
            "fingerprint": device["fingerprint"],
            "trusted": device.get("trusted", True),
            "first_seen": device.get("first_seen"),
            "last_seen": device.get("last_seen"),
            "device_info": device.get("device_info", {}),
        })

    return {"devices": devices}


@router.delete("/{device_id}")
async def revoke_device(
    device_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Revoke device (mark as untrusted)
    """
    user_id = str(current_user["_id"])

    try:
        result = await device_fingerprints_collection.update_one(
            {"_id": ObjectId(device_id), "user_id": user_id},
            {"$set": {"trusted": False}},
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Device not found")

        return {"message": "Device revoked successfully"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid device ID")
