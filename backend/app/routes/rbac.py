"""
RBAC Routes - Role-Based Access Control Management
Handles role assignment, permission checks, and file sharing
"""

from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId, errors
from datetime import datetime, timedelta
from typing import List, Optional
import logging

from app.database import (
    users_collection,
    files_collection,
    access_logs_collection,
    roles_collection,
    file_sharing_collection,
)
from app.routes.auth import get_current_user
from app.services.rbac import (
    RBACService,
    FileSharingService,
    DEFAULT_ROLES,
    UserRole,
    FileCategory,
    Permission,
)

router = APIRouter(prefix="/rbac", tags=["RBAC - Role Management"])
logger = logging.getLogger(__name__)


# ============================================================
# INITIALIZATION ROUTES
# ============================================================

@router.post("/initialize-roles", status_code=status.HTTP_201_CREATED)
async def initialize_roles(current_user: dict = Depends(get_current_user)):
    """
    Initialize default roles in the database
    Only admin can execute this
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    existing_count = await roles_collection.count_documents({})
    if existing_count > 0:
        raise HTTPException(status_code=400, detail="Roles already initialized")

    try:
        for role in DEFAULT_ROLES:
            role["created_at"] = datetime.utcnow()
            await roles_collection.insert_one(role)
        
        logger.info(f"Initialized {len(DEFAULT_ROLES)} default roles")
        return {"message": f"Initialized {len(DEFAULT_ROLES)} roles"}
    except Exception as e:
        logger.error(f"Error initializing roles: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to initialize roles")


# ============================================================
# ROLE LISTING & RETRIEVAL
# ============================================================

@router.get("/roles")
async def get_all_roles(current_user: dict = Depends(get_current_user)):
    """
    Get all available roles with their permissions
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return RBACService.get_all_roles()


@router.get("/roles/{role_name}")
async def get_role_details(
    role_name: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed information about a specific role
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if not RBACService.validate_role(role_name):
        raise HTTPException(status_code=400, detail="Invalid role name")

    role_doc = await roles_collection.find_one({"name": role_name})
    if not role_doc:
        raise HTTPException(status_code=404, detail="Role not found")

    return {
        "name": role_doc.get("name"),
        "display_name": role_doc.get("display_name"),
        "permissions": role_doc.get("permissions", []),
        "categories": RBACService.get_role_categories(role_name),
        "created_at": role_doc.get("created_at"),
    }


@router.get("/categories")
async def get_all_categories(current_user: dict = Depends(get_current_user)):
    """
    Get all available file categories
    """
    return RBACService.get_all_categories()


@router.get("/permissions")
async def get_all_permissions(current_user: dict = Depends(get_current_user)):
    """
    Get all available permissions
    """
    return RBACService.get_all_permissions()


# ============================================================
# USER ROLE MANAGEMENT
# ============================================================

@router.post("/assign-role")
async def assign_role(
    user_id: str,
    role: str,
    department: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Assign a role to a user
    Only admin can assign roles
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if not RBACService.validate_role(role):
        raise HTTPException(status_code=400, detail="Invalid role name")

    try:
        user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        update_data = {
            "role": role,
            "permissions": RBACService.get_role_permissions(role),
            "updated_at": datetime.utcnow(),
        }

        if department:
            update_data["department"] = department

        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )

        # Log the action
        await access_logs_collection.insert_one({
            "user_id": str(current_user["_id"]),
            "action": "assign_role",
            "target_user_id": user_id,
            "target_role": role,
            "timestamp": datetime.utcnow(),
            "success": True,
        })

        return {
            "message": f"Role '{role}' assigned to user {user_id}",
            "permissions": RBACService.get_role_permissions(role)
        }

    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    except Exception as e:
        logger.error(f"Error assigning role: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to assign role")


@router.get("/user/{user_id}/permissions")
async def get_user_permissions(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all permissions for a specific user
    """
    try:
        user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "user_id": user_id,
            "role": user_doc.get("role"),
            "permissions": user_doc.get("permissions", []),
            "department": user_doc.get("department"),
            "accessible_categories": RBACService.get_role_categories(user_doc.get("role")),
        }

    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user ID")


# ============================================================
# FILE CATEGORY & PERMISSIONS
# ============================================================

@router.post("/file/set-category")
async def set_file_category(
    file_id: str,
    category: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Set or update file category
    Only file owner or admin can set category
    """
    if not RBACService.validate_category(category):
        raise HTTPException(status_code=400, detail="Invalid category")

    try:
        file_doc = await files_collection.find_one({"_id": ObjectId(file_id)})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")

        # Check authorization
        is_owner = str(file_doc["owner_id"]) == str(current_user["_id"])
        is_admin = current_user["role"] == "admin"

        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not authorized to set category")

        # Set default permissions based on category
        category_permissions = {
            FileCategory.PUBLIC.value: [UserRole.EMPLOYEE.value, UserRole.JUNIOR_DEV.value, UserRole.SENIOR_DEV.value, UserRole.MANAGER.value, UserRole.HR.value, UserRole.FINANCE.value, UserRole.ADMIN.value],
            FileCategory.INTERNAL.value: [UserRole.SENIOR_DEV.value, UserRole.MANAGER.value, UserRole.ADMIN.value],
            FileCategory.CONFIDENTIAL.value: [UserRole.MANAGER.value, UserRole.ADMIN.value],
            FileCategory.CODE.value: [UserRole.JUNIOR_DEV.value, UserRole.SENIOR_DEV.value, UserRole.ADMIN.value],
            FileCategory.FINANCE.value: [UserRole.FINANCE.value, UserRole.ADMIN.value],
            FileCategory.HR.value: [UserRole.HR.value, UserRole.ADMIN.value],
            FileCategory.EXECUTIVE.value: [UserRole.ADMIN.value],
        }

        await files_collection.update_one(
            {"_id": ObjectId(file_id)},
            {
                "$set": {
                    "category": category,
                    "allowed_roles": category_permissions.get(category, []),
                    "updated_at": datetime.utcnow(),
                }
            }
        )

        # Log the action
        await access_logs_collection.insert_one({
            "user_id": str(current_user["_id"]),
            "file_id": file_id,
            "action": "set_file_category",
            "category": category,
            "timestamp": datetime.utcnow(),
            "success": True,
        })

        return {
            "message": f"File category set to '{category}'",
            "allowed_roles": category_permissions.get(category, [])
        }

    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file ID")
    except Exception as e:
        logger.error(f"Error setting file category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to set category")


# ============================================================
# FILE SHARING
# ============================================================

@router.post("/file/share")
async def share_file(
    file_id: str,
    target_user_id: str,
    permissions: List[str],
    current_user: dict = Depends(get_current_user)
):
    """
    Share a file with another user with specific permissions
    File owner or admin can share
    """
    try:
        # Validate file exists
        file_doc = await files_collection.find_one({"_id": ObjectId(file_id)})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")

        # Check authorization
        is_owner = str(file_doc["owner_id"]) == str(current_user["_id"])
        is_admin = current_user["role"] == "admin"

        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not authorized to share")

        # Validate target user exists
        target_user = await users_collection.find_one({"_id": ObjectId(target_user_id)})
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")

        # Validate share request
        is_valid, error_msg = FileSharingService.validate_share_request(
            current_user["role"],
            file_doc.get("category", "public"),
            target_user.get("role", "employee"),
            permissions,
            current_user.get("department")
        )

        if not is_valid:
            raise HTTPException(status_code=403, detail=error_msg)

        # Create/update sharing record
        sharing_doc = {
            "file_id": file_id,
            "shared_by": str(current_user["_id"]),
            "shared_with": str(target_user_id),
            "permissions": permissions,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=30),  # 30-day default
        }

        result = await file_sharing_collection.update_one(
            {"file_id": file_id, "shared_with": str(target_user_id)},
            {"$set": sharing_doc},
            upsert=True
        )

        # Log the action
        await access_logs_collection.insert_one({
            "user_id": str(current_user["_id"]),
            "file_id": file_id,
            "action": "share_file",
            "target_user_id": target_user_id,
            "permissions": permissions,
            "timestamp": datetime.utcnow(),
            "success": True,
        })

        return {
            "message": f"File shared with {target_user.get('email')} with permissions: {', '.join(permissions)}",
            "shared_with": target_user.get("email"),
            "permissions": permissions,
            "expires_at": sharing_doc["expires_at"]
        }

    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file or user ID")
    except Exception as e:
        logger.error(f"Error sharing file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to share file")


@router.get("/file/{file_id}/shares")
async def get_file_shares(
    file_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all shares for a file
    File owner or admin can view
    """
    try:
        file_doc = await files_collection.find_one({"_id": ObjectId(file_id)})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")

        # Check authorization
        is_owner = str(file_doc["owner_id"]) == str(current_user["_id"])
        is_admin = current_user["role"] == "admin"

        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not authorized to view shares")

        shares = []
        async for share in file_sharing_collection.find({"file_id": file_id}):
            # Check if not expired
            if share.get("expires_at") and share["expires_at"] > datetime.utcnow():
                target_user = await users_collection.find_one(
                    {"_id": ObjectId(share["shared_with"])}
                )
                if target_user:
                    shares.append({
                        "shared_with": target_user.get("email"),
                        "shared_with_id": share["shared_with"],
                        "permissions": share.get("permissions", []),
                        "shared_by_id": share.get("shared_by"),
                        "created_at": share.get("created_at"),
                        "expires_at": share.get("expires_at"),
                    })

        return {"file_id": file_id, "shares": shares}

    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file ID")


@router.delete("/file/unshare")
async def unshare_file(
    file_id: str,
    target_user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove file sharing with a user
    """
    try:
        file_doc = await files_collection.find_one({"_id": ObjectId(file_id)})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")

        # Check authorization
        is_owner = str(file_doc["owner_id"]) == str(current_user["_id"])
        is_admin = current_user["role"] == "admin"

        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not authorized to unshare")

        await file_sharing_collection.delete_one({
            "file_id": file_id,
            "shared_with": target_user_id
        })

        # Log the action
        await access_logs_collection.insert_one({
            "user_id": str(current_user["_id"]),
            "file_id": file_id,
            "action": "unshare_file",
            "target_user_id": target_user_id,
            "timestamp": datetime.utcnow(),
            "success": True,
        })

        return {"message": "File share removed"}

    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file or user ID")


# ============================================================
# PERMISSION CHECKING
# ============================================================

@router.post("/check-permission")
async def check_permission(
    user_id: str,
    permission: str,
    file_category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Check if a user has a specific permission
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")

        user_role = user_doc.get("role", "employee")
        user_department = user_doc.get("department")

        has_perm = RBACService.has_permission(user_role, permission)

        result = {
            "user_id": user_id,
            "user_role": user_role,
            "permission": permission,
            "has_permission": has_perm,
        }

        if file_category:
            can_access = RBACService.can_access_category(user_role, file_category, user_department)
            can_perform = RBACService.can_perform_action(
                user_role, file_category, permission, user_department
            )
            result["file_category"] = file_category
            result["can_access_category"] = can_access
            result["can_perform_action"] = can_perform

        return result

    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user ID")


# ============================================================
# FILE ACCESS CONTROL
# ============================================================

@router.get("/file/{file_id}/access-check")
async def check_file_access(
    file_id: str,
    permission: str = "view",
    current_user: dict = Depends(get_current_user)
):
    """
    Check if current user can perform an action on a file
    """
    try:
        file_doc = await files_collection.find_one({"_id": ObjectId(file_id)})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")

        user_id = str(current_user["_id"])
        user_role = current_user.get("role", "employee")
        user_department = current_user.get("department")

        file_category = file_doc.get("category", "public")
        file_owner = str(file_doc.get("owner_id"))

        # Check various access conditions
        is_owner = user_id == file_owner
        is_admin = user_role == "admin"

        # Check role permission
        has_perm = RBACService.has_permission(user_role, permission)

        # Check category access
        can_access_cat = RBACService.can_access_category(user_role, file_category, user_department)

        # Check if shared with user
        is_shared = await file_sharing_collection.find_one({
            "file_id": file_id,
            "shared_with": user_id,
            "expires_at": {"$gt": datetime.utcnow()}
        })

        # Determine if access is allowed
        if is_admin or is_owner:
            access_allowed = has_perm
        elif is_shared:
            # User is explicitly shared with
            shared_perms = is_shared.get("permissions", [])
            access_allowed = permission in shared_perms
        else:
            # Check if public or user has category access
            access_allowed = can_access_cat and has_perm

        return {
            "file_id": file_id,
            "permission": permission,
            "access_allowed": access_allowed,
            "reason": {
                "is_owner": is_owner,
                "is_admin": is_admin,
                "is_shared": bool(is_shared),
                "has_role_permission": has_perm,
                "can_access_category": can_access_cat,
                "file_category": file_category,
            }
        }

    except errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid file ID")
