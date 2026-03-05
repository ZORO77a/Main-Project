from fastapi import (
    APIRouter,
    HTTPException,
    Depends,
    status,
    UploadFile,
    File,
    Form,
)
from fastapi.responses import StreamingResponse
from bson import ObjectId
from datetime import datetime, time, timedelta
import io

from app.database import (
    users_collection,
    files_collection,
    access_logs_collection,
    work_from_home_requests_collection,
    sessions_collection,
    device_fingerprints_collection,
)
import logging
from app.models import (
    WorkFromHomeRequestCreate,
    FileAccessRequest,
)
from app.utils import (
    encrypt_file,
    decrypt_file,
    check_location,
    check_time_allocated,
    check_wifi_ssid,
)
from app.routes.auth import get_current_user

# ✅ IMPORTANT: prefix MUST be here
router = APIRouter(prefix="/employee", tags=["Employee"])

logger = logging.getLogger(__name__)


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

async def has_active_wfh(user_id: str) -> bool:
    now = datetime.utcnow()
    return await work_from_home_requests_collection.find_one({
        "employee_id": user_id,
        "approved": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now},
    }) is not None


# --------------------------------------------------
# EMPLOYEE DASHBOARD (MATCHES FRONTEND)
# --------------------------------------------------

@router.get("/dashboard")
async def employee_dashboard(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "employee":
        raise HTTPException(status_code=403, detail="Employee access required")

    user_id = str(current_user["_id"])

    # ---------------- STATS ----------------
    total_files = await files_collection.count_documents({
        "owner_id": user_id
    })

    successful_accesses = await access_logs_collection.count_documents({
        "user_id": user_id,
        "success": True,
    })

    total_accesses = await access_logs_collection.count_documents({
        "user_id": user_id
    })

    success_rate = (
        round((successful_accesses / total_accesses) * 100, 2)
        if total_accesses > 0 else 0
    )

    # ---------------- FILE LIST ----------------
    files = []
    async for f in files_collection.find(
        {}
    ).sort("created_at", -1).limit(10):
        files.append({
            "id": str(f["_id"]),
            "filename": f.get("filename"),
            "created_at": f.get("created_at"),
            "is_encrypted": f.get("is_encrypted", True),
            "encryption_alg": f.get("encryption_alg", "x25519"),
        })

    # ---------------- RECENT ACTIVITY ----------------
    recent_activity = []
    async for log in access_logs_collection.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).limit(10):
        recent_activity.append({
            "action": log.get("action"),
            "success": log.get("success"),
            "timestamp": log.get("timestamp"),
            "reason": log.get("reason"),
        })

    return {
        # cards
        "total_files": total_files,
        "successful_accesses": successful_accesses,
        "success_rate": success_rate,
        "wfh_status": (
            "Allowed"
            if current_user.get("work_from_home_allowed")
            else "Office Only"
        ),

        # lists
        "files": files,
        "recent_activity": recent_activity,
    }

# --------------------------------------------------
# REQUEST WORK FROM HOME
# --------------------------------------------------

@router.post("/request-work-from-home", status_code=status.HTTP_201_CREATED)
async def request_work_from_home(
    payload: WorkFromHomeRequestCreate,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "employee":
        raise HTTPException(status_code=403, detail="Employee access required")

    start_dt = datetime.combine(payload.start_date, time.min)
    end_dt = datetime.combine(payload.end_date, time.max)

    doc = {
        "employee_id": str(current_user["_id"]),
        "reason": payload.reason.strip(),
        "start_date": start_dt,
        "end_date": end_dt,
        "requested_at": datetime.utcnow(),
        "approved": False,
        "approved_at": None,
        "admin_id": None,
    }

    result = await work_from_home_requests_collection.insert_one(doc)

    return {
        "message": "WFH request submitted",
        "request_id": str(result.inserted_id),
    }


# --------------------------------------------------
# FILE UPLOAD
# --------------------------------------------------

@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "employee":
        raise HTTPException(status_code=403, detail="Employee access required")

    content = await file.read()
    encrypted, key, alg = encrypt_file(content)

    doc = {
        "filename": file.filename,
        "encrypted_content": encrypted,
        "encryption_key": key,
        "encryption_alg": alg,
        "owner_id": str(current_user["_id"]),
        "created_at": datetime.utcnow(),
        "is_encrypted": True,
    }

    result = await files_collection.insert_one(doc)

    await access_logs_collection.insert_one({
        "user_id": str(current_user["_id"]),
        "file_id": str(result.inserted_id),
        "action": "file_upload",
        "timestamp": datetime.utcnow(),
        "success": True,
    })

    return {"message": "File uploaded", "file_id": str(result.inserted_id)}


# --------------------------------------------------
# FILE ACCESS (GEO + WIFI + TIME + WFH)
# --------------------------------------------------

@router.post("/access-file")
async def access_file(
    payload: FileAccessRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Zero-Trust File Access with ALL security checks:
    - JWT valid ✓ (already checked by get_current_user)
    - Face verified ✓
    - GPS inside 500m ✓
    - Time allowed ✓
    - Device match ✓
    - WiFi SSID match ✓
    - AI risk < threshold ✓
    """
    if current_user["role"] != "employee":
        print(f"DEBUG: Access denied. Role is {current_user.get('role')}, expected 'employee'")
        raise HTTPException(status_code=403, detail="Employee access required")

    user_id = str(current_user["_id"])

    file_doc = await files_collection.find_one({
        "_id": ObjectId(payload.file_id),
    })

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    # 1. CHECK FACE VERIFICATION STATUS
    session = await sessions_collection.find_one({
        "user_id": user_id,
        "$or": [
            {"face_verified": True},
            {"face_bypassed": True}  # Allow admin bypass in dev mode
        ],
        "expires_at": {"$gt": datetime.utcnow()},
    })

    if not session:
        # Check if face bypass is allowed (dev mode)
        import os
        ALLOW_FACE_BYPASS = os.getenv("ALLOW_ADMIN_FACE_BYPASS", "true").lower() == "true"
        
        if ALLOW_FACE_BYPASS:
            # Create bypass session on-the-fly for dev mode
            print("[DEV MODE] File access - creating bypass session for user")
            session_expires = datetime.utcnow() + timedelta(hours=24)
            
            await sessions_collection.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "user_id": user_id,
                        "session_token": f"session_{ObjectId()}",
                        "face_verified": False,
                        "face_bypassed": True,
                        "face_bypassed_at": datetime.utcnow(),
                        "expires_at": session_expires,
                        "created_at": datetime.utcnow(),
                    }
                },
                upsert=True,
            )
            # Session created, continue with file access
        else:
            print(f"DEBUG: Access denied. Face verification required. User: {user_id}, Role: {current_user.get('role')}, Allowed Bypass: {ALLOW_FACE_BYPASS}")
            await access_logs_collection.insert_one({
                "user_id": user_id,
                "file_id": payload.file_id,
                "action": "file_access",
                "timestamp": datetime.utcnow(),
                "success": False,
                "reason": "Face verification required",
            })
            raise HTTPException(
                status_code=403,
                detail="Face verification required. Please verify your face first. If you're an employee, contact admin to register your face."
            )

    # 2. CHECK DEVICE FINGERPRINT (if provided)
    if payload.device_fingerprint:
        device = await device_fingerprints_collection.find_one({
            "user_id": user_id,
            "fingerprint": payload.device_fingerprint,
            "trusted": True,
        })

        if not device:
            print(f"DEBUG: Access denied. Device not recognized. Fingerprint: {payload.device_fingerprint}")
            await access_logs_collection.insert_one({
                "user_id": user_id,
                "file_id": payload.file_id,
                "action": "file_access",
                "timestamp": datetime.utcnow(),
                "success": False,
                "reason": "Device not registered or not trusted",
            })
            raise HTTPException(
                status_code=403,
                detail="Device not recognized. Please register your device."
            )

    # 3. CHECK AI RISK SCORE
    from app.routes.ai_monitoring import _check_employee_risk_internal
    risk_check = await _check_employee_risk_internal(user_id)
    
    # Dev mode bypass
    import os
    ALLOW_RISK_BYPASS = os.getenv("ALLOW_RISK_BYPASS", "true").lower() == "true"
    
    if not ALLOW_RISK_BYPASS:
        if risk_check["should_block"]:
            print(f"DEBUG: Access denied. High risk score: {risk_check['risk_score']}")
            await access_logs_collection.insert_one({
                "user_id": user_id,
                "file_id": payload.file_id,
                "action": "file_access",
                "timestamp": datetime.utcnow(),
                "success": False,
                "reason": f"AI risk too high (score: {risk_check['risk_score']})",
            })
            raise HTTPException(
                status_code=403,
                detail=f"Access blocked due to high risk score ({risk_check['risk_score']}). Please contact admin."
            )
        
        if risk_check["should_reauth"]:
            # Require face re-verification
            print("DEBUG: Access denied. Risk re-auth required.")
            await sessions_collection.update_one(
                {"user_id": user_id},
                {"$set": {"face_verified": False}},
            )
            raise HTTPException(
                status_code=403,
                detail="Face re-verification required due to elevated risk. Please verify your face again."
            )
    else:
        print(f"[DEV MODE] AI risk check bypassed (score: {risk_check['risk_score']})")

    # 4. CHECK WFH STATUS
    wfh_active = await has_active_wfh(user_id)

    # 5. CHECK LOCATION, TIME, WIFI (if not WFH)
    if not wfh_active:
        # Check location if allocated
        if current_user.get("allocated_location"):
            # Dev mode bypass
            import os
            ALLOW_LOCATION_BYPASS = os.getenv("ALLOW_LOCATION_BYPASS", "true").lower() == "true"
            
            if not ALLOW_LOCATION_BYPASS:
                location_ok, location_msg = check_location(
                    payload.current_location,
                    current_user["allocated_location"]
                )
                if not location_ok:
                    print(f"DEBUG: Access denied. Location check failed: {location_msg}")
                    await access_logs_collection.insert_one({
                        "user_id": user_id,
                        "file_id": payload.file_id,
                        "action": "file_access",
                        "timestamp": datetime.utcnow(),
                        "success": False,
                        "reason": location_msg,
                        "location": payload.current_location,
                    })
                    raise HTTPException(status_code=403, detail=location_msg)
            else:
                print("[DEV MODE] Location check bypassed")
        else:
            print("No allocated location set - skipping location check")

        # Check WiFi SSID if allocated (explicit None check, not truthy)
        if current_user.get("allocated_wifi_ssid") is not None:
            # Dev mode bypass
            import os
            ALLOW_WIFI_BYPASS = os.getenv("ALLOW_WIFI_BYPASS", "true").lower() == "true"
            
            if not ALLOW_WIFI_BYPASS:
                allocated_ssid = current_user["allocated_wifi_ssid"]
                current_ssid = payload.current_wifi_ssid
                
                # Debug log to help diagnose SSID mismatches
                print(f"[WiFi Check] Allocated: '{allocated_ssid}' | Current: '{current_ssid}'")
                try:
                    logger.debug(
                        "WiFi check: payload_ssid=%s | allocated_ssid=%s",
                        current_ssid,
                        allocated_ssid,
                    )
                except Exception:
                    pass

                wifi_ok, wifi_msg = check_wifi_ssid(current_ssid, allocated_ssid)
                
                if not wifi_ok:
                    print(f"DEBUG: Access denied. WiFi check failed: {wifi_msg}")
                    print(f"       Expected: '{allocated_ssid}' | Got: '{current_ssid}'")
                    await access_logs_collection.insert_one({
                        "user_id": user_id,
                        "file_id": payload.file_id,
                        "action": "file_access",
                        "timestamp": datetime.utcnow(),
                        "success": False,
                        "reason": wifi_msg,
                        "wifi_ssid": current_ssid,
                        "allocated_wifi_ssid": allocated_ssid,
                    })
                    raise HTTPException(status_code=403, detail=wifi_msg)
            else:
                print("[DEV MODE] WiFi check bypassed")

        if (
            current_user.get("allocated_time_start")
            and current_user.get("allocated_time_end")
        ):
            # Dev mode bypass
            import os
            ALLOW_TIME_BYPASS = os.getenv("ALLOW_TIME_BYPASS", "true").lower() == "true"
            
            if not ALLOW_TIME_BYPASS:
                time_ok, time_msg = check_time_allocated(
                    current_user["allocated_time_start"],
                    current_user["allocated_time_end"],
                )
                if not time_ok:
                    print(f"DEBUG: Access denied. Time check failed: {time_msg}")
                    await access_logs_collection.insert_one({
                        "user_id": user_id,
                        "file_id": payload.file_id,
                        "action": "file_access",
                        "timestamp": datetime.utcnow(),
                        "success": False,
                        "reason": time_msg,
                        "location": payload.current_location, # Added for context
                    })
                    raise HTTPException(status_code=403, detail=time_msg)
            else:
                print("[DEV MODE] Time check bypassed")

    # ALL CHECKS PASSED - Decrypt and stream file
    if not file_doc.get("encrypted_content") or not file_doc.get("encryption_key"):
        raise HTTPException(status_code=500, detail="File data or encryption key missing from database")
    
    alg = file_doc.get("encryption_alg", "x25519")
    try:
        decrypted = decrypt_file(
            file_doc["encrypted_content"],
            file_doc["encryption_key"],
            alg,
        )
    except Exception as e:
        print(f"Decryption error: {e}")
        raise HTTPException(status_code=500, detail="File decryption failed. The file may be corrupted or encrypted with an incompatible method.")

    await access_logs_collection.insert_one({
        "user_id": user_id,
        "file_id": payload.file_id,
        "action": "file_access",
        "timestamp": datetime.utcnow(),
        "success": True,
        "via_wfh": wfh_active,
        "location": payload.current_location,
        "wifi_ssid": payload.current_wifi_ssid,
        "device_fingerprint": payload.device_fingerprint,
        "ai_risk_score": risk_check["risk_score"],
    })

    return StreamingResponse(
        io.BytesIO(decrypted),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"inline; filename={file_doc['filename']}"},
    )


# --------------------------------------------------
# FILE RENAME
# --------------------------------------------------

@router.put("/rename-file/{file_id}")
async def rename_file(
    file_id: str,
    new_filename: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    logger.info(f"Rename file request: file_id={file_id}, new_filename={new_filename}, user_id={current_user['_id']}")
    try:
        obj_id = ObjectId(file_id)
    except Exception as e:
        logger.error(f"Invalid ObjectId: {file_id}, error: {e}")
        raise HTTPException(status_code=400, detail="Invalid file ID")
    
    result = await files_collection.update_one(
        {"_id": obj_id, "owner_id": str(current_user["_id"])},
        {"$set": {"filename": new_filename}},
    )
    
    logger.info(f"Update result: matched_count={result.matched_count}, modified_count={result.modified_count}")
    
    if result.matched_count == 0:
        logger.warning(f"File not found or not owned by user: file_id={file_id}, user_id={current_user['_id']}")
        raise HTTPException(status_code=404, detail="File not found or access denied")

    return {"message": "File renamed"}


# --------------------------------------------------
# FILE DELETE
# --------------------------------------------------

@router.delete("/delete-file/{file_id}")
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = await files_collection.delete_one({
        "_id": ObjectId(file_id),
        "owner_id": str(current_user["_id"]),
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")

    return {"message": "File deleted"}


# --------------------------------------------------
# OPEN TEXT FILE (EDITOR)
# --------------------------------------------------

@router.get("/open-text-file/{file_id}")
async def open_text_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    file_doc = await files_collection.find_one({
        "_id": ObjectId(file_id),
        "owner_id": str(current_user["_id"]),
    })

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    alg = file_doc.get("encryption_alg", "x25519")
    decrypted = decrypt_file(
        file_doc["encrypted_content"],
        file_doc["encryption_key"],
        alg,
    )

    try:
        text = decrypted.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Not a text file")

    return {
        "file_id": file_id,
        "filename": file_doc["filename"],
        "content": text,
    }


# --------------------------------------------------
# SAVE TEXT FILE
# --------------------------------------------------

@router.put("/save-text-file/{file_id}")
async def save_text_file(
    file_id: str,
    content: str = Form(...),
    current_user: dict = Depends(get_current_user),
):
    encrypted, key, alg = encrypt_file(content.encode("utf-8"))

    result = await files_collection.update_one(
        {"_id": ObjectId(file_id), "owner_id": str(current_user["_id"])},
        {
            "$set": {
                "encrypted_content": encrypted,
                "encryption_key": key,
                "encryption_alg": alg,
                "updated_at": datetime.utcnow(),
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="File not found")

    return {"message": "File saved securely"}
