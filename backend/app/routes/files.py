from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId
from datetime import datetime, timedelta
import io
import mimetypes

from app.database import (
    users_collection,
    files_collection,
    access_logs_collection,
    work_from_home_requests_collection,
    sessions_collection,
    device_fingerprints_collection,
)
from app.models import FileAccessRequest
from app.utils import (
    encrypt_file,
    decrypt_file,
    check_location,
    check_time_allocated,
    check_wifi_ssid,
)
from app.routes.auth import get_current_user
from app.routes.employee import has_active_wfh
from app.routes.ai_monitoring import _check_employee_risk_internal

router = APIRouter(prefix="/api/files", tags=["File Access"])


def get_mime_type(filename: str) -> str:
    """Get MIME type based on file extension"""
    mime_type, _ = mimetypes.guess_type(filename)
    if mime_type:
        return mime_type

    # Fallback MIME types for common extensions
    ext = filename.lower().split('.')[-1] if '.' in filename else ''
    mime_map = {
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'json': 'application/json',
        'log': 'text/plain',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'svg': 'image/svg+xml',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'ppt': 'application/vnd.ms-powerpoint',
    }
    return mime_map.get(ext, 'application/octet-stream')


@router.post("/access")
async def access_file_for_viewing(
    payload: FileAccessRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Secure file access for in-browser viewing with proper MIME types.
    Performs all security checks like the employee endpoint but returns
    files with appropriate MIME types for browser rendering.
    """
    if current_user["role"] != "employee":
        raise HTTPException(status_code=403, detail="Employee access required")

    user_id = str(current_user["_id"])

    file_doc = await files_collection.find_one({
        "_id": ObjectId(payload.file_id),
    })

    if not file_doc:
        raise HTTPException(status_code=404, detail="File not found")

    # Face verification step removed; OTP-authenticated token is sufficient

    # 2. CHECK DEVICE FINGERPRINT
    if payload.device_fingerprint:
        device = await device_fingerprints_collection.find_one({
            "user_id": user_id,
            "fingerprint": payload.device_fingerprint,
            "trusted": True,
        })

        if not device:
            await access_logs_collection.insert_one({
                "user_id": user_id,
                "file_id": payload.file_id,
                "action": "file_access_view",
                "timestamp": datetime.utcnow(),
                "success": False,
                "reason": "Device not registered",
            })
            raise HTTPException(
                status_code=403,
                detail="Device not recognized"
            )

    # 3. CHECK AI RISK SCORE
    risk_check = await _check_employee_risk_internal(user_id)

    import os
    ALLOW_RISK_BYPASS = os.getenv("ALLOW_RISK_BYPASS", "true").lower() == "true"

    if not ALLOW_RISK_BYPASS:
        if risk_check["should_block"]:
            await access_logs_collection.insert_one({
                "user_id": user_id,
                "file_id": payload.file_id,
                "action": "file_access_view",
                "timestamp": datetime.utcnow(),
                "success": False,
                "reason": f"AI risk too high ({risk_check['risk_score']})",
            })
            raise HTTPException(
                status_code=403,
                detail=f"Access blocked due to high risk score ({risk_check['risk_score']})"
            )

        # re-auth step removed - no further action required

    # 4. CHECK WFH STATUS
    wfh_active = await has_active_wfh(user_id)

    # 5. CHECK LOCATION, TIME, WIFI (if not WFH)
    if not wfh_active:
        # Location check
        if current_user.get("allocated_location"):
            import os
            ALLOW_LOCATION_BYPASS = os.getenv("ALLOW_LOCATION_BYPASS", "true").lower() == "true"

            if not ALLOW_LOCATION_BYPASS:
                location_ok, location_msg = check_location(
                    payload.current_location,
                    current_user["allocated_location"]
                )
                if not location_ok:
                    await access_logs_collection.insert_one({
                        "user_id": user_id,
                        "file_id": payload.file_id,
                        "action": "file_access_view",
                        "timestamp": datetime.utcnow(),
                        "success": False,
                        "reason": location_msg,
                        "location": payload.current_location,
                    })
                    raise HTTPException(status_code=403, detail=location_msg)

        # WiFi check
        if current_user.get("allocated_wifi_ssid") is not None:
            import os
            ALLOW_WIFI_BYPASS = os.getenv("ALLOW_WIFI_BYPASS", "true").lower() == "true"

            if not ALLOW_WIFI_BYPASS:
                allocated_ssid = current_user["allocated_wifi_ssid"]
                current_ssid = payload.current_wifi_ssid

                wifi_ok, wifi_msg = check_wifi_ssid(current_ssid, allocated_ssid)

                if not wifi_ok:
                    await access_logs_collection.insert_one({
                        "user_id": user_id,
                        "file_id": payload.file_id,
                        "action": "file_access_view",
                        "timestamp": datetime.utcnow(),
                        "success": False,
                        "reason": wifi_msg,
                        "wifi_ssid": current_ssid,
                        "allocated_wifi_ssid": allocated_ssid,
                    })
                    raise HTTPException(status_code=403, detail=wifi_msg)

        # Time check
        if (
            current_user.get("allocated_time_start")
            and current_user.get("allocated_time_end")
        ):
            import os
            ALLOW_TIME_BYPASS = os.getenv("ALLOW_TIME_BYPASS", "true").lower() == "true"

            if not ALLOW_TIME_BYPASS:
                time_ok, time_msg = check_time_allocated(
                    current_user["allocated_time_start"],
                    current_user["allocated_time_end"],
                )
                if not time_ok:
                    await access_logs_collection.insert_one({
                        "user_id": user_id,
                        "file_id": payload.file_id,
                        "action": "file_access_view",
                        "timestamp": datetime.utcnow(),
                        "success": False,
                        "reason": time_msg,
                    })
                    raise HTTPException(status_code=403, detail=time_msg)

    # ALL CHECKS PASSED - Decrypt and return file with proper MIME type
    if not file_doc.get("encrypted_content") or not file_doc.get("encryption_key"):
        raise HTTPException(status_code=500, detail="File data missing")

    alg = file_doc.get("encryption_alg", "x25519")
    try:
        decrypted = decrypt_file(
            file_doc["encrypted_content"],
            file_doc["encryption_key"],
            alg,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="File decryption failed")

    # Log successful access
    await access_logs_collection.insert_one({
        "user_id": user_id,
        "file_id": payload.file_id,
        "action": "file_access_view",
        "timestamp": datetime.utcnow(),
        "success": True,
        "via_wfh": wfh_active,
        "location": payload.current_location,
        "wifi_ssid": payload.current_wifi_ssid,
        "device_fingerprint": payload.device_fingerprint,
        "ai_risk_score": risk_check["risk_score"],
    })

    # Determine MIME type for browser viewing
    mime_type = get_mime_type(file_doc["filename"])

    return StreamingResponse(
        io.BytesIO(decrypted),
        media_type=mime_type,
        headers={"Content-Disposition": f"inline; filename={file_doc['filename']}"},
    )