from fastapi import APIRouter, Depends
from datetime import datetime
from bson import ObjectId

from app.database import (
    files_collection,
    sessions_collection,
    device_fingerprints_collection,
    work_from_home_requests_collection,
)
from app.models import FileAccessRequest
from app.routes.auth import get_current_user
from app.utils import check_location, check_time_allocated, check_wifi_ssid

router = APIRouter(prefix="/debug", tags=["Debug"])


@router.get("/detect-wifi")
async def detect_current_wifi(current_user: dict = Depends(get_current_user)):
    """
    Detect the WiFi SSID on the server side (for Electron/desktop apps or local server).
    """
    from app.services.wifi_service import WiFiService
    
    ssid = WiFiService.get_connected_ssid()
    return {
        "ssid": ssid,
        "detected": bool(ssid),
        "method": "backend_native"
    }


@router.post("/validate-access")
async def validate_access(payload: FileAccessRequest, current_user: dict = Depends(get_current_user)):
    """Non-blocking validation endpoint that returns detailed results for each access check."""
    user_id = str(current_user["_id"])

    result = {
        "file_found": False,
        # face_session removed (no longer relevant)
        "device_ok": None,
        "ai_risk": None,
        "wfh_active": False,
        "location_ok": None,
        "time_ok": None,
        "wifi_ok": None,
    }

    # File exists?
    try:
        file_doc = await files_collection.find_one({"_id": ObjectId(payload.file_id), "owner_id": user_id})
    except Exception:
        file_doc = None

    result["file_found"] = file_doc is not None

    # face/session check removed - not used anymore

    # Device fingerprint
    if payload.device_fingerprint:
        device = await device_fingerprints_collection.find_one({
            "user_id": user_id,
            "fingerprint": payload.device_fingerprint,
            "trusted": True,
        })
        result["device_ok"] = device is not None
    else:
        result["device_ok"] = None

    # AI risk (quick internal check)
    try:
        from app.routes.ai_monitoring import _check_employee_risk_internal
        risk = await _check_employee_risk_internal(user_id)
        result["ai_risk"] = risk
    except Exception as e:
        result["ai_risk"] = {"error": str(e)}

    # Work-from-home active?
    now = datetime.utcnow()
    wfh = await work_from_home_requests_collection.find_one({
        "employee_id": user_id,
        "approved": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now},
    })
    result["wfh_active"] = wfh is not None

    # Location / Time / WiFi checks (only if not wfh)
    if not result["wfh_active"]:
        # Location
        if current_user.get("allocated_location"):
            loc_ok, loc_msg = check_location(payload.current_location, current_user["allocated_location"])
            result["location_ok"] = {"ok": loc_ok, "message": loc_msg}
        else:
            result["location_ok"] = {"ok": True, "message": "No allocated location"}

        # Time
        if current_user.get("allocated_time_start") and current_user.get("allocated_time_end"):
            time_ok, time_msg = check_time_allocated(current_user["allocated_time_start"], current_user["allocated_time_end"])
            result["time_ok"] = {"ok": time_ok, "message": time_msg}
        else:
            result["time_ok"] = {"ok": True, "message": "No time window set"}

        # WiFi - explicit None check, not truthy
        if current_user.get("allocated_wifi_ssid") is not None:
            wifi_ok, wifi_msg = check_wifi_ssid(payload.current_wifi_ssid, current_user["allocated_wifi_ssid"])
            result["wifi_ok"] = {"ok": wifi_ok, "message": wifi_msg, "payload_ssid": payload.current_wifi_ssid, "allocated_ssid": current_user.get("allocated_wifi_ssid")}
        else:
            result["wifi_ok"] = {"ok": True, "message": "No WiFi restriction"}
    else:
        result["location_ok"] = {"ok": True, "message": "WFH active"}
        result["time_ok"] = {"ok": True, "message": "WFH active"}
        result["wifi_ok"] = {"ok": True, "message": "WFH active"}

    # Overall simulated decision
    allowed = True
    if not result["file_found"]:
        allowed = False
    # face check removed - allow based on other factors
    if result["device_ok"] is False:
        allowed = False
    if isinstance(result["ai_risk"], dict) and result["ai_risk"].get("should_block"):
        allowed = False
    if not result["location_ok"]["ok"]:
        allowed = False
    if not result["time_ok"]["ok"]:
        allowed = False
    if not result["wifi_ok"]["ok"]:
        allowed = False

    result["allowed"] = allowed

    return result
