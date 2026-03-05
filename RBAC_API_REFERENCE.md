# RBAC API Reference - Quick Guide

## 🔐 Authentication Required
All RBAC endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 📋 Admin-Only Endpoints

### Initialize Roles (Run Once)
```
POST /rbac/initialize-roles

Description: Initialize all default roles in the database
Response: { "message": "Initialized 7 roles" }

Permissions: Admin only
```

### Get All Roles
```
GET /rbac/roles

Description: Get all available roles with their permissions
Response:
[
  {
    "name": "admin",
    "display_name": "Administrator",
    "permissions": ["view", "edit", "delete", "share", "upload", "download"]
  },
  {
    "name": "manager",
    "display_name": "Manager",
    "permissions": ["view", "edit", "share", "upload", "download"]
  },
  ... (5 more roles)
]

Permissions: Admin only
```

### Get Role Details
```
GET /rbac/roles/{role_name}

Parameters:
  role_name: admin | manager | senior_dev | junior_dev | hr | finance | employee

Response:
{
  "name": "manager",
  "display_name": "Manager",
  "permissions": ["view", "edit", "share", "upload", "download"],
  "categories": ["public", "internal", "confidential"],
  "created_at": "2026-02-02T..."
}

Permissions: Admin only
```

### Get All Categories
```
GET /rbac/categories

Description: Get all available file categories
Response:
[
  { "name": "public", "display_name": "Public" },
  { "name": "internal", "display_name": "Internal" },
  { "name": "confidential", "display_name": "Confidential" },
  { "name": "code", "display_name": "Code" },
  { "name": "finance", "display_name": "Finance" },
  { "name": "hr", "display_name": "HR" },
  { "name": "executive", "display_name": "Executive" }
]

Permissions: Any authenticated user
```

### Get All Permissions
```
GET /rbac/permissions

Description: Get all available permissions
Response:
[
  { "name": "view", "display_name": "View" },
  { "name": "edit", "display_name": "Edit" },
  { "name": "delete", "display_name": "Delete" },
  { "name": "share", "display_name": "Share" },
  { "name": "upload", "display_name": "Upload" },
  { "name": "download", "display_name": "Download" }
]

Permissions: Any authenticated user
```

---

## 👤 User Role Management

### Assign Role to User
```
POST /rbac/assign-role

Query Parameters:
  user_id: string (required) - MongoDB user ID
  role: string (required) - Role name (admin, manager, etc.)
  department: string (optional) - User's department

Example:
POST /rbac/assign-role?user_id=507f1f77bcf86cd799439011&role=manager&department=Engineering

Response:
{
  "message": "Role 'manager' assigned to user 507f1f77bcf86cd799439011",
  "permissions": ["view", "edit", "share", "upload", "download"]
}

Permissions: Admin only
```

### Get User Permissions
```
GET /rbac/user/{user_id}/permissions

Parameters:
  user_id: string - MongoDB user ID

Example:
GET /rbac/user/507f1f77bcf86cd799439011/permissions

Response:
{
  "user_id": "507f1f77bcf86cd799439011",
  "role": "manager",
  "permissions": ["view", "edit", "share", "upload", "download"],
  "department": "Engineering",
  "accessible_categories": ["public", "internal", "confidential"]
}

Permissions: Any authenticated user (can view own, admin can view any)
```

### Check User Permission
```
POST /rbac/check-permission

Query Parameters:
  user_id: string (required)
  permission: string (required) - view, edit, delete, share, upload, download
  file_category: string (optional)

Example:
POST /rbac/check-permission?user_id=507f1f77bcf86cd799439011&permission=edit&file_category=confidential

Response:
{
  "user_id": "507f1f77bcf86cd799439011",
  "user_role": "manager",
  "permission": "edit",
  "has_permission": true,
  "file_category": "confidential",
  "can_access_category": true,
  "can_perform_action": true
}

Permissions: Admin only
```

---

## 📁 File Category Management

### Set File Category
```
POST /rbac/file/set-category

Query Parameters:
  file_id: string (required) - MongoDB file ID
  category: string (required) - public, internal, confidential, code, finance, hr, executive

Example:
POST /rbac/file/set-category?file_id=507f1f77bcf86cd799439012&category=confidential

Response:
{
  "message": "File category set to 'confidential'",
  "allowed_roles": ["manager", "admin"]
}

Permissions: File owner or admin
```

---

## 🔗 File Sharing

### Share File with User
```
POST /rbac/file/share

Query Parameters:
  file_id: string (required)
  target_user_id: string (required)
  permissions: List[string] (required) - view, edit, download, share

Example:
POST /rbac/file/share?file_id=507f1f77bcf86cd799439012&target_user_id=507f1f77bcf86cd799439013&permissions=["view", "download"]

Response:
{
  "message": "File shared with john@company.com with permissions: view, download",
  "shared_with": "john@company.com",
  "permissions": ["view", "download"],
  "expires_at": "2026-03-04T..."
}

Permissions: File owner or admin
```

### Get File Shares
```
GET /rbac/file/{file_id}/shares

Parameters:
  file_id: string - MongoDB file ID

Example:
GET /rbac/file/507f1f77bcf86cd799439012/shares

Response:
{
  "file_id": "507f1f77bcf86cd799439012",
  "shares": [
    {
      "shared_with": "john@company.com",
      "shared_with_id": "507f1f77bcf86cd799439013",
      "permissions": ["view", "download"],
      "shared_by_id": "507f1f77bcf86cd799439011",
      "created_at": "2026-02-02T...",
      "expires_at": "2026-03-04T..."
    }
  ]
}

Permissions: File owner or admin
```

### Remove File Share
```
DELETE /rbac/file/unshare

Query Parameters:
  file_id: string (required)
  target_user_id: string (required)

Example:
DELETE /rbac/file/unshare?file_id=507f1f77bcf86cd799439012&target_user_id=507f1f77bcf86cd799439013

Response:
{
  "message": "File share removed"
}

Permissions: File owner or admin
```

---

## 🔍 File Access Control

### Check File Access
```
GET /rbac/file/{file_id}/access-check

Query Parameters:
  file_id: string (required)
  permission: string (optional, default: "view")

Example:
GET /rbac/file/507f1f77bcf86cd799439012/access-check?permission=edit

Response:
{
  "file_id": "507f1f77bcf86cd799439012",
  "permission": "edit",
  "access_allowed": true,
  "reason": {
    "is_owner": false,
    "is_admin": false,
    "is_shared": true,
    "has_role_permission": true,
    "can_access_category": true,
    "file_category": "internal"
  }
}

Permissions: Any authenticated user (checks own access)
```

---

## 🔐 Role Access Matrix Reference

### Permission Matrix (Role × Permission)
```
┌─────────────┬──────┬──────┬────────┬───────┬────────┬──────────┐
│ Role        │ View │ Edit │ Delete │ Share │ Upload │ Download │
├─────────────┼──────┼──────┼────────┼───────┼────────┼──────────┤
│ Admin       │  ✅  │  ✅  │   ✅   │  ✅   │   ✅   │    ✅    │
│ Manager     │  ✅  │  ✅  │   ❌   │  ✅   │   ✅   │    ✅    │
│ Senior Dev  │  ✅  │  ✅  │   ❌   │  ❌   │   ✅   │    ✅    │
│ Junior Dev  │  ✅  │  ❌  │   ❌   │  ❌   │   ❌   │    ✅    │
│ HR          │  ✅  │  ✅  │   ❌   │  ✅   │   ✅   │    ✅    │
│ Finance     │  ✅  │  ✅  │   ❌   │  ✅   │   ✅   │    ✅    │
│ Employee    │  ✅* │  ❌  │   ❌   │  ❌   │   ❌   │    ✅*   │
└─────────────┴──────┴──────┴────────┴───────┴────────┴──────────┘
*Own files only
```

### Category Access Matrix (Role × Category)
```
┌─────────────┬────────┬──────────┬──────────────┬──────┬─────────┬────┬───────────┐
│ Role        │ Public │ Internal │ Confidential │ Code │ Finance │ HR │ Executive │
├─────────────┼────────┼──────────┼──────────────┼──────┼─────────┼────┼───────────┤
│ Admin       │   ✅   │    ✅    │      ✅      │  ✅  │    ✅   │ ✅ │     ✅    │
│ Manager     │   ✅   │    ✅    │      ✅      │  ❌  │   🔐*   │🔐* │     ❌    │
│ Senior Dev  │   ✅   │    ✅    │      ❌      │  ✅  │    ❌   │ ❌ │     ❌    │
│ Junior Dev  │   ✅   │    ❌    │      ❌      │  ✅  │    ❌   │ ❌ │     ❌    │
│ HR          │   ✅   │    ❌    │      ❌      │  ❌  │    ❌   │ ✅ │     ❌    │
│ Finance     │   ✅   │    ❌    │      ❌      │  ❌  │    ✅   │ ❌ │     ❌    │
│ Employee    │   ✅   │    ❌    │      ❌      │  ❌  │    ❌   │ ❌ │     ❌    │
└─────────────┴────────┴──────────┴──────────────┴──────┴─────────┴────┴───────────┘
🔐* = Department-specific access
```

---

## 📊 Example Workflows

### Workflow 1: Manager Sharing Confidential File

```bash
# 1. Admin assigns manager role
POST /rbac/assign-role?user_id=USER1&role=manager&department=Engineering

# 2. Manager uploads file with confidential category
POST /api/files/upload
{
  "filename": "quarterly_report.pdf",
  "category": "confidential"  # NEW
}

# 3. File automatically gets allowed_roles: ["manager", "admin"]

# 4. Manager shares with specific person
POST /rbac/file/share?file_id=FILE1&target_user_id=USER2&permissions=["view", "download"]

# 5. User2 can now access the file (even if not manager role)
GET /api/files/access?file_id=FILE1
# Returns file with streaming content
```

### Workflow 2: Junior Dev Trying to Upload (Should Fail)

```bash
# 1. Junior dev has limited permissions
GET /rbac/user/JUNIOR_DEV_ID/permissions
# Returns: permissions: ["view", "download"]
# Missing: "upload"

# 2. Try to upload
POST /api/files/upload
{
  "filename": "helper.js",
  "category": "code"
}

# 3. Returns 403 Forbidden - No upload permission
{
  "detail": "User role does not have upload permission"
}
```

### Workflow 3: Employee Accessing Public File

```bash
# 1. Employee has basic access
GET /rbac/user/EMPLOYEE_ID/permissions
# Returns: permissions: ["view", "download"]
# accessible_categories: ["public"]

# 2. Try to access public file
GET /rbac/file/FILE_ID/access-check?permission=view
# Returns: access_allowed: true (public category)

# 3. Access file
POST /api/files/access?file_id=FILE_ID
# File is returned successfully
```

---

## ⚠️ Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 400 | Invalid role name | Role doesn't exist |
| 400 | Invalid category | Category doesn't exist |
| 400 | Invalid user ID | Malformed MongoDB ObjectId |
| 400 | Invalid file ID | Malformed MongoDB ObjectId |
| 403 | Admin access required | User is not admin |
| 403 | User does not have X permission | Role lacks required permission |
| 403 | Cannot access X category | Role cannot access category |
| 403 | Not authorized to share | User is not file owner/admin |
| 404 | User not found | User doesn't exist |
| 404 | File not found | File doesn't exist |
| 404 | Role not found | Role not initialized |
| 500 | Failed to assign role | Database error |
| 500 | Failed to share file | Database error |

---

## 🧪 Quick Test Curl Commands

```bash
# Initialize roles
curl -X POST http://localhost:8000/rbac/initialize-roles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get all roles
curl http://localhost:8000/rbac/roles \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Assign role
curl -X POST "http://localhost:8000/rbac/assign-role?user_id=507f1f77bcf86cd799439011&role=manager" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check permission
curl "http://localhost:8000/rbac/check-permission?user_id=507f1f77bcf86cd799439011&permission=edit&file_category=confidential" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Share file
curl -X POST "http://localhost:8000/rbac/file/share?file_id=FILE_ID&target_user_id=TARGET_USER&permissions=view,download" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check file access
curl "http://localhost:8000/rbac/file/FILE_ID/access-check?permission=view" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

---

## 📚 Related Documentation
- Full implementation guide: [ROLE_BASED_ACCESS_CONTROL_IMPLEMENTATION.md](ROLE_BASED_ACCESS_CONTROL_IMPLEMENTATION.md)
- Remaining work: [RBAC_IMPLEMENTATION_REMAINING_WORK.md](RBAC_IMPLEMENTATION_REMAINING_WORK.md)
- Source code: [app/services/rbac.py](backend/app/services/rbac.py)
- Routes: [app/routes/rbac.py](backend/app/routes/rbac.py)

