# RBAC Implementation - Remaining Work & Next Steps

## ✅ Completed Implementation

### 1. **Backend Infrastructure**
- ✅ `app/services/rbac.py` - Complete RBAC service with:
  - Role and permission definitions
  - Permission checking functions
  - Category access matrix
  - File sharing validation
  - 7 default roles with complete permissions
  - Default role initialization data

- ✅ `app/routes/rbac.py` - Complete RBAC management routes with:
  - Role initialization endpoint
  - Role listing and details endpoints
  - User role assignment
  - File category management
  - File sharing with permissions
  - File unsharing
  - Permission checking endpoints
  - File access control endpoints

- ✅ Updated `app/models.py`:
  - Expanded UserRole enum (7 roles)
  - Added `department` field to User
  - Added `permissions` field to User
  - Added `category` field to File
  - Added `allowed_roles` field to File
  - Added `allowed_users` field to File

- ✅ Updated `app/database.py`:
  - Added `roles_collection`
  - Added `file_sharing_collection`

- ✅ Updated `app/main.py`:
  - Registered RBAC routes

---

## 📋 Remaining Implementation Tasks

### Phase 1: File Access Route Updates (2-3 hours)

#### Task 1.1: Update File Upload Route
**File:** [backend/app/routes/employee.py](backend/app/routes/employee.py)

**Current:** Files are uploaded without category/permissions

**Changes needed:**
```python
# In the file upload endpoint (likely in employee.py or admin.py):
# Add these checks before saving:

1. Get file category from request (default to "public")
2. Validate category using RBACService.validate_category()
3. Check if user has UPLOAD permission using RBACService.has_permission()
4. Set default allowed_roles based on category
5. Store category and allowed_roles in file document

Example code to add:
```python
from app.services.rbac import RBACService, FileCategory

# In file upload handler:
category = request.get("category", "public")

# Validate category
if not RBACService.validate_category(category):
    raise HTTPException(status_code=400, detail="Invalid category")

# Check upload permission
if not RBACService.has_permission(current_user["role"], "upload"):
    raise HTTPException(status_code=403, detail="No upload permission")

# Define category-based access
category_permissions = {
    FileCategory.PUBLIC.value: ["employee", "junior_dev", "senior_dev", "manager", "hr", "finance", "admin"],
    FileCategory.INTERNAL.value: ["senior_dev", "manager", "admin"],
    FileCategory.CONFIDENTIAL.value: ["manager", "admin"],
    FileCategory.CODE.value: ["junior_dev", "senior_dev", "admin"],
    FileCategory.FINANCE.value: ["finance", "admin"],
    FileCategory.HR.value: ["hr", "admin"],
    FileCategory.EXECUTIVE.value: ["admin"],
}

# Store in file document
file_doc = {
    # ... existing fields ...
    "category": category,
    "allowed_roles": category_permissions.get(category, []),
    "allowed_users": [],
}
```

#### Task 1.2: Update File Access Route
**File:** [backend/app/routes/files.py](backend/app/routes/files.py)

**Current:** File access check is based on owner only

**Changes needed:**
```python
# In the file access endpoint (around line 50-70):
# Add RBAC checks before location/time checks:

from app.services.rbac import RBACService

# After JWT and face verification checks, add:

1. Check if user has VIEW permission
2. Check if user can access file category
3. Check if file is shared with user
4. Check allowed_roles

Example code structure:
```python
# 1. CHECK RBAC PERMISSIONS
user_role = current_user.get("role", "employee")
user_id = str(current_user["_id"])
user_department = current_user.get("department")
file_category = file_doc.get("category", "public")

# Check if user has view permission
if not RBACService.has_permission(user_role, "view"):
    await access_logs_collection.insert_one({
        "user_id": user_id,
        "file_id": payload.file_id,
        "action": "file_access_view",
        "timestamp": datetime.utcnow(),
        "success": False,
        "reason": "User role does not have view permission",
    })
    raise HTTPException(status_code=403, detail="No view permission")

# Check if user can access category
is_owner = user_id == str(file_doc["owner_id"])
is_admin = user_role == "admin"

if not is_owner and not is_admin:
    # Check if role can access category
    if not RBACService.can_access_category(user_role, file_category, user_department):
        # Check if explicitly shared
        is_shared = await file_sharing_collection.find_one({
            "file_id": payload.file_id,
            "shared_with": user_id,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not is_shared or "view" not in is_shared.get("permissions", []):
            await access_logs_collection.insert_one({
                "user_id": user_id,
                "file_id": payload.file_id,
                "action": "file_access_view",
                "timestamp": datetime.utcnow(),
                "success": False,
                "reason": f"Cannot access {file_category} category",
            })
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied to {file_category} files"
            )
```

#### Task 1.3: Update File Listing Route
**File:** [backend/app/routes/employee.py](backend/app/routes/employee.py) - in dashboard

**Current:** Shows all files

**Changes needed:**
```python
# In employee_dashboard() function:
# Filter files based on user's permissions

Example:
```python
# Get accessible file IDs
accessible_file_ids = []

# 1. Get files by role access
allowed_files = await files_collection.find({
    "allowed_roles": user_role
}).to_list(1000)

for f in allowed_files:
    accessible_file_ids.append(str(f["_id"]))

# 2. Get files explicitly shared with user
shared_files = await file_sharing_collection.find({
    "shared_with": user_id
}).to_list(1000)

for s in shared_files:
    accessible_file_ids.append(s["file_id"])

# 3. Get user's own files
own_files = await files_collection.find({
    "owner_id": user_id
}).to_list(1000)

for f in own_files:
    accessible_file_ids.append(str(f["_id"]))

# Remove duplicates and fetch
accessible_file_ids = list(set(accessible_file_ids))
files = await files_collection.find({
    "_id": {"$in": [ObjectId(fid) for fid in accessible_file_ids]}
}).sort("created_at", -1).limit(10).to_list(10)
```

---

### Phase 2: Admin Routes Updates (2 hours)

#### Task 2.1: Update Add Employee Route
**File:** [backend/app/routes/admin.py](backend/app/routes/admin.py)

**Current:** Only assigns "employee" role

**Changes needed:**
```python
# Update AddEmployeeRequest model to include:
class AddEmployeeRequest(BaseModel):
    email: EmailStr
    name: str
    phone: str
    password: str
    role: str = "employee"  # NEW: Allow role selection
    department: Optional[str] = None  # NEW: Department field
    allocated_location: Dict[str, float]
    allocated_wifi_ssid: str
    allocated_time_start: str
    allocated_time_end: str

# In add_employee handler, add:
if not RBACService.validate_role(payload.role):
    raise HTTPException(status_code=400, detail="Invalid role")

user_doc = {
    # ... existing fields ...
    "role": payload.role,
    "department": payload.department,
    "permissions": RBACService.get_role_permissions(payload.role),
}
```

#### Task 2.2: Create Edit Employee Role Endpoint
**File:** [backend/app/routes/admin.py](backend/app/routes/admin.py)

**Add new endpoint:**
```python
@router.post("/employee/{employee_id}/change-role")
async def change_employee_role(
    employee_id: str,
    role: str,
    department: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Use RBACService to assign role
    # Log the action
    # Return success message
```

#### Task 2.3: Update Edit Employee Endpoint
**File:** [backend/app/routes/admin.py](backend/app/routes/admin.py)

**Changes needed:**
```python
# Update EditEmployeeRequest to include role/department
class EditEmployeeRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None  # NEW
    department: Optional[str] = None  # NEW
    allocated_location: Optional[Dict[str, float]] = None
    allocated_wifi_ssid: Optional[str] = None
    allocated_time_start: Optional[str] = None
    allocated_time_end: Optional[str] = None

# In edit_employee handler, validate and update role/department
```

---

### Phase 3: Frontend Updates (5-6 hours)

#### Task 3.1: Update File Upload Component
**File:** [frontend/src/pages/admin/AdminFiles.js](frontend/src/pages/admin/AdminFiles.js)

**Changes needed:**
```javascript
// Add file category dropdown in upload form
// Options: public, internal, confidential, code, finance, hr, executive

// When uploading, send:
{
    file: fileBlob,
    filename: fileName,
    category: selectedCategory,  // NEW
    currentLocation: location,
    currentWifiSSID: wifiSSID,
    deviceFingerprint: fingerprint,
}
```

#### Task 3.2: Update File Listing Component
**File:** [frontend/src/pages/employee/FileAccess.js](frontend/src/pages/employee/FileAccess.js)

**Changes needed:**
```javascript
// 1. Show file category as a badge
// 2. Filter files based on user permissions
// 3. Show only accessible files
// 4. Add permission indicators (view, edit, share, download)

Example:
<div className="file-list">
    {files.map(file => (
        <div key={file.id} className="file-item">
            <span className="filename">{file.filename}</span>
            <span className="category-badge">{file.category}</span>
            <div className="permissions">
                {permissions.view && <button>View</button>}
                {permissions.edit && <button>Edit</button>}
                {permissions.share && <button>Share</button>}
                {permissions.download && <button>Download</button>}
            </div>
        </div>
    ))}
</div>
```

#### Task 3.3: Create File Sharing Modal
**File:** [frontend/src/components/FileSharing.jsx](frontend/src/components/FileSharing.jsx) (NEW FILE)

**Functionality:**
```javascript
// New component for file sharing
// Features:
// 1. Search and select user to share with
// 2. Choose permissions (view, edit, download)
// 3. Set expiration date
// 4. Display current shares
// 5. Remove share access

// API calls:
POST /rbac/file/share
GET /rbac/file/{fileId}/shares
DELETE /rbac/file/unshare
```

#### Task 3.4: Create Role Management UI
**File:** [frontend/src/pages/admin/RoleManagement.js](frontend/src/pages/admin/RoleManagement.js) (NEW FILE)

**Functionality:**
```javascript
// Admin page for role management
// Features:
// 1. List all roles with permissions
// 2. Assign roles to employees
// 3. Change employee departments
// 4. View permission matrix

// API calls:
GET /rbac/roles
GET /rbac/user/{userId}/permissions
POST /rbac/assign-role
```

#### Task 3.5: Update Employee List Component
**File:** [frontend/src/pages/admin/Employees.js](frontend/src/pages/admin/Employees.js)

**Changes needed:**
```javascript
// Add columns:
// 1. Role (with dropdown to change)
// 2. Department (editable)
// 3. Permissions (view-only)

// Update add employee form to include:
// 1. Role selection dropdown
// 2. Department selection dropdown
```

#### Task 3.6: Update File Viewer
**File:** [frontend/src/components/FileViewer.jsx](frontend/src/components/FileViewer.jsx)

**Changes needed:**
```javascript
// Before viewing file, call:
GET /rbac/file/{fileId}/access-check?permission=view

// Show permission-based actions:
// - View: Always (if access check passes)
// - Edit: Only if permission.edit
// - Delete: Only if permission.delete
// - Share: Only if permission.share
// - Download: Only if permission.download
```

---

### Phase 4: Database Migration (1-2 hours)

#### Task 4.1: Create Migration Script
**File:** [backend/migrate_rbac.py](backend/migrate_rbac.py) (NEW FILE)

**Purpose:** Migrate existing users and files to new RBAC schema

```python
# Script to:
# 1. Add default roles to roles_collection
# 2. Update all existing users:
#    - Set role (default: employee)
#    - Set department (default: null)
#    - Set permissions based on role
# 3. Update all existing files:
#    - Set category (default: public)
#    - Set allowed_roles based on category
#    - Set allowed_users as empty
# 4. Log migration results

async def migrate_rbac():
    # Initialize roles
    # Update users
    # Update files
    # Return migration summary
```

---

### Phase 5: Testing (3-4 hours)

#### Test Cases to Create:

**1. RBAC Service Tests**
```python
# Test RBACService functions
- has_permission()
- can_access_category()
- can_perform_action()
- validate_role()
- validate_category()
```

**2. Integration Tests**
```python
# Test RBAC routes
- Role assignment
- File category setting
- File sharing
- Permission checks
- File access with permissions
```

**3. Scenario Tests**
```python
# Test real-world scenarios:
- Manager accessing confidential file
- Junior Dev uploading file
- Employee accessing HR file (should fail)
- Shared file access with custom permissions
- File access after sharing expires
```

---

## 📊 Implementation Checklist

### Phase 1: File Access Updates
- [ ] Update file upload to accept category
- [ ] Update file access route with RBAC checks
- [ ] Update file listing to filter by permissions
- [ ] Add integration with file_sharing_collection

### Phase 2: Admin Updates
- [ ] Update AddEmployeeRequest with role/department
- [ ] Create change-role endpoint
- [ ] Update edit-employee endpoint for role changes
- [ ] Add validation for role and department

### Phase 3: Frontend
- [ ] File upload with category dropdown
- [ ] File listing with permission indicators
- [ ] File sharing modal component
- [ ] Role management page
- [ ] Employee role/department editing
- [ ] File viewer permission checks

### Phase 4: Database
- [ ] Create migration script
- [ ] Test migration on dev database
- [ ] Run migration on production

### Phase 5: Testing
- [ ] Unit tests for RBAC service
- [ ] Integration tests for routes
- [ ] Scenario tests for real workflows
- [ ] Manual testing of all features

---

## 🔍 Key Integration Points

### 1. **Existing Security Checks**
All current security checks (JWT, face verification, device fingerprint, location, time, WiFi) should be applied **BEFORE** RBAC checks. RBAC is an additional layer.

### 2. **Access Logs**
Add these fields to access_logs when logging file access:
```python
{
    "user_role": "manager",
    "required_permission": "view",
    "has_permission": true,
    "file_category": "confidential",
    "can_access_category": true,
    "access_method": "direct" | "shared",  # How user accessed
}
```

### 3. **File Sharing Expiry**
Implement a background job to:
- Check file_sharing_collection for expired shares
- Remove expired shares automatically
- Log expiration events

### 4. **Audit Trail**
Track all RBAC changes:
- Role assignments
- File sharing/unsharing
- Category changes
- Permission modifications

---

## 🚀 Deployment Steps

1. **Backup Database**
   ```
   Backup all MongoDB collections
   ```

2. **Deploy Backend Changes**
   ```
   - Push code changes
   - Install new dependencies (if any)
   - Restart backend server
   ```

3. **Run Migration Script**
   ```
   python migrate_rbac.py
   ```

4. **Initialize Roles**
   ```
   POST /rbac/initialize-roles
   ```

5. **Deploy Frontend Changes**
   ```
   - Push code changes
   - Build and deploy frontend
   - Clear browser cache
   ```

6. **Verify Deployment**
   ```
   - Test role assignment
   - Test file access with different roles
   - Test file sharing
   - Check audit logs
   ```

---

## 📞 Support & Documentation

**Generated Documentation:**
- Implementation slide: [ROLE_BASED_ACCESS_CONTROL_IMPLEMENTATION.md](ROLE_BASED_ACCESS_CONTROL_IMPLEMENTATION.md)
- This file: [RBAC_IMPLEMENTATION_REMAINING_WORK.md](RBAC_IMPLEMENTATION_REMAINING_WORK.md)

**Code References:**
- RBAC Service: [app/services/rbac.py](backend/app/services/rbac.py)
- RBAC Routes: [app/routes/rbac.py](backend/app/routes/rbac.py)
- Models Update: [app/models.py](backend/app/models.py)
- Database: [app/database.py](backend/app/database.py)

