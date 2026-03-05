from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId, errors
from datetime import datetime, timedelta
from typing import List

from app.database import (
    users_collection,
    access_logs_collection,
    files_collection,
    work_from_home_requests_collection,
)
from app.models import User, AddEmployeeRequest
from app.utils import hash_password
from app.routes.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---------------------------
# ADMIN DASHBOARD
# ---------------------------

@router.get("/dashboard")
async def admin_dashboard(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    # ---- COUNTS ----
    total_employees = await users_collection.count_documents({"role": "employee"})
    active_employees = await users_collection.count_documents({
        "role": "employee",
        "is_active": True
    })

    encrypted_files = await files_collection.count_documents({
        "is_encrypted": True
    })

    pending_requests_count = await work_from_home_requests_collection.count_documents({
        "approved": False
    })

    # ---- RECENT LOGS ----
    recent_logs = []
    async for log in access_logs_collection.find().sort("timestamp", -1).limit(10):
        recent_logs.append({
            "action": log.get("action"),
            "timestamp": log.get("timestamp"),
            "success": log.get("success"),
            "reason": log.get("reason"),
        })

    # ---- PENDING REQUESTS ----
    pending_requests = []
    async for req in work_from_home_requests_collection.find({"approved": False}):
        employee = await users_collection.find_one(
            {"_id": ObjectId(req["employee_id"])}
        )
        if employee:
            pending_requests.append({
                "id": str(req["_id"]),
                "employee_name": employee.get("name", employee.get("email")),
                "reason": req.get("reason"),
                "start_date": req.get("start_date"),
                "end_date": req.get("end_date"),
                "requested_at": req.get("requested_at"),
            })

    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "encrypted_files": encrypted_files,
        "pending_requests": pending_requests,
        "pending_requests_count": pending_requests_count,
        "recent_logs": recent_logs,
    }

# ---------------------------
# ADD EMPLOYEE
# ---------------------------

@router.post("/add-employee", status_code=status.HTTP_201_CREATED)
async def add_employee(
    payload: AddEmployeeRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if await users_collection.find_one({"email": payload.email}):
        raise HTTPException(status_code=400, detail="Employee already exists")

    user_doc = {
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": "employee",
        "name": payload.name.strip(),
        "phone": payload.phone.strip(),
        "allocated_location": payload.allocated_location,
        "allocated_wifi_ssid": payload.allocated_wifi_ssid,
        "allocated_time_start": payload.allocated_time_start,
        "allocated_time_end": payload.allocated_time_end,
        "is_active": True,
        "work_from_home_allowed": False,
        "created_at": datetime.utcnow(),
    }

    await users_collection.insert_one(user_doc)
    return {"message": "Employee created successfully"}


# ---------------------------
# LIST EMPLOYEES
# ---------------------------

@router.get("/employees")
async def list_employees(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    employees = await users_collection.find({"role": "employee"}).to_list(1000)

    return [{
        "id": str(emp["_id"]),
        "email": emp.get("email"),
        "name": emp.get("name"),
        "phone": emp.get("phone"),
        "is_active": emp.get("is_active", True),
        "work_from_home_allowed": emp.get("work_from_home_allowed", False),
    } for emp in employees]


# ---------------------------
# GET SINGLE EMPLOYEE (EDIT FIX)
# ---------------------------

@router.get("/employee/{employee_id}")
async def get_employee(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        employee = await users_collection.find_one(
            {"_id": ObjectId(employee_id), "role": "employee"}
        )
    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid employee ID")

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {
        "id": str(employee["_id"]),
        "name": employee.get("name"),
        "email": employee.get("email"),
        "phone": employee.get("phone"),
        "allocated_location": employee.get("allocated_location"),
        "allocated_wifi_ssid": employee.get("allocated_wifi_ssid"),
        "allocated_time_start": employee.get("allocated_time_start"),
        "allocated_time_end": employee.get("allocated_time_end"),
        "is_active": employee.get("is_active", True),
        "work_from_home_allowed": employee.get("work_from_home_allowed", False),
    }


# ---------------------------
# DEACTIVATE EMPLOYEE (DELETE FIX)
# ---------------------------

@router.delete("/employee/{employee_id}")
async def deactivate_employee(
    employee_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        result = await users_collection.update_one(
            {"_id": ObjectId(employee_id), "role": "employee"},
            {"$set": {"is_active": False}},
        )
    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid employee ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {"message": "Employee deactivated successfully"}


# ---------------------------
# LIST FILES
# ---------------------------

@router.get("/files")
async def list_files(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    files = await files_collection.find().to_list(1000)
    response = []

    for f in files:
        owner = None
        try:
            owner = await users_collection.find_one(
                {"_id": ObjectId(f.get("owner_id"))}
            )
        except Exception:
            pass

        response.append({
            "id": str(f["_id"]),
            "filename": f.get("filename"),
            "uploaded_at": f.get("created_at"),
            "is_encrypted": f.get("is_encrypted", True),
            "encryption_alg": f.get("encryption_alg", "x25519"),
            "owner_name": owner.get("name") if owner else "Unknown",
            "owner_email": owner.get("email") if owner else "Unknown",
        })

    return response


# ---------------------------
# GET SINGLE FILE (VIEW FILE FIX)
# ---------------------------

@router.get("/files/{file_id}")
async def get_single_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        file = await files_collection.find_one(
            {"_id": ObjectId(file_id)}
        )
    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file ID")

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    owner = None
    try:
        owner = await users_collection.find_one(
            {"_id": ObjectId(file.get("owner_id"))}
        )
    except Exception:
        pass

    return {
        "id": str(file["_id"]),
        "filename": file.get("filename"),
        "uploaded_at": file.get("created_at"),
        "is_encrypted": file.get("is_encrypted", True),
        "encryption_alg": file.get("encryption_alg", "x25519"),
        "owner_name": owner.get("name") if owner else "Unknown",
        "owner_email": owner.get("email") if owner else "Unknown",
    }

# ---------------------------
# CLEANUP OLD FILES
# ---------------------------

@router.delete("/files/cleanup")
async def cleanup_old_files(
    days: int = 30,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    cutoff = datetime.utcnow() - timedelta(days=days)
    result = await files_collection.delete_many({"created_at": {"$lt": cutoff}})

    return {"deleted_files": result.deleted_count}

#----------------------------
#APPROVE WORKFROMHOME
#----------------------------

@router.post("/approve-wfh/{request_id}")
async def approve_wfh(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        result = await work_from_home_requests_collection.update_one(
            {"_id": ObjectId(request_id), "approved": False},
            {
                "$set": {
                    "approved": True,
                    "approved_at": datetime.utcnow(),
                    "admin_id": str(current_user["_id"]),
                }
            },
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="WFH request not found")

    return {"message": "Work-from-home request approved"}


#----------------------------
#REJECT WORKFROMHOME
#----------------------------

@router.post("/reject-wfh/{request_id}")
async def reject_wfh(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        result = await work_from_home_requests_collection.delete_one(
            {"_id": ObjectId(request_id), "approved": False}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="WFH request not found")

    return {"message": "Work-from-home request rejected"}

# ---------------------------
# ACCESS LOGS (FIXED)
# ---------------------------

@router.get("/access-logs")
async def get_access_logs(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    logs_cursor = access_logs_collection.find().sort("timestamp", -1)
    logs = []

    async for log in logs_cursor:
        user = None
        file = None

        # Fetch user
        try:
            user = await users_collection.find_one(
                {"_id": ObjectId(log.get("user_id"))}
            )
        except Exception:
            pass

        # Fetch file (optional)
        try:
            file = await files_collection.find_one(
                {"_id": ObjectId(log.get("file_id"))}
            )
        except Exception:
            pass

        logs.append({
            "id": str(log["_id"]),
            "user_email": user.get("email") if user else "Unknown",
            "filename": file.get("filename") if file else "N/A",
            "action": log.get("action"),
            "success": log.get("success"),
            "reason": log.get("reason"),
            "location": log.get("location"),
            "wifi_ssid": log.get("wifi_ssid"),
            "timestamp": log.get("timestamp"),
        })

    return logs


# ---------------------------
# SYSTEM SETTINGS (FIXED)
# ---------------------------

@router.get("/settings")
async def get_system_settings(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    total_users = await users_collection.count_documents({})
    total_files = await files_collection.count_documents({})
    total_logs = await access_logs_collection.count_documents({})

    today_start = datetime.utcnow().replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    active_today = await access_logs_collection.count_documents({
        "timestamp": {"$gte": today_start}
    })

    return {
        "total_users": total_users,
        "total_files": total_files,
        "access_logs": total_logs,
        "active_today": active_today,
    }


@router.post("/settings/reset-logs")
async def reset_access_logs(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await access_logs_collection.delete_many({})
    return {
        "message": "Access logs cleared successfully",
        "deleted_logs": result.deleted_count,
    }


@router.post("/settings/clear-old-files")
async def clear_old_files(
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    days = payload.get("days", 30)
    cutoff = datetime.utcnow() - timedelta(days=int(days))

    result = await files_collection.delete_many({
        "created_at": {"$lt": cutoff}
    })

    return {
        "message": "Old files cleared successfully",
        "deleted_files": result.deleted_count,
    }

# ---------------------------
# EDIT EMPLOYEE (FINAL FIX)
# ---------------------------

from app.models import EditEmployeeRequest

@router.put("/edit-employee/{employee_id}")
async def edit_employee(
    employee_id: str,
    payload: EditEmployeeRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        obj_id = ObjectId(employee_id)
    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid employee ID")

    update_data = {
        k: v for k, v in payload.dict().items()
        if v is not None
    }

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided for update"
        )

    result = await users_collection.update_one(
        {"_id": obj_id, "role": "employee"},
        {"$set": update_data},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {"message": "Employee updated successfully"}
