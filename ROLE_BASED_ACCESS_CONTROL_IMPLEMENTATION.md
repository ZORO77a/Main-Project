# Role-Based Access Control (RBAC) Implementation Slide

## 📊 Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 ROLE-BASED ACCESS CONTROL                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  USER ROLES:                    FILE PERMISSIONS:             │
│  ├─ Admin                       ├─ view                       │
│  ├─ Manager                     ├─ edit                       │
│  ├─ Senior Developer            ├─ delete                     │
│  ├─ Junior Developer            ├─ share                      │
│  ├─ HR                          ├─ download                   │
│  ├─ Finance                     └─ upload                     │
│  └─ Employee                                                  │
│                                                               │
│  FILE CATEGORIES:               ROLE MAPPING:                │
│  ├─ Public                      ├─ Admin: ALL permissions     │
│  ├─ Internal                    ├─ Manager: view,edit,share   │
│  ├─ Confidential                ├─ Senior Dev: view,edit      │
│  ├─ Finance                     ├─ Junior Dev: view only      │
│  ├─ HR                          ├─ HR: view (HR only)         │
│  ├─ Legal                       ├─ Finance: view (Fin only)   │
│  └─ Executive                   └─ Employee: view (own only)  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Role & Permission Model

### **User Roles (7 Types)**
| Role | Description | Permissions | File Categories Access |
|------|-------------|-------------|----------------------|
| **Admin** | System administrator | All permissions | All categories |
| **Manager** | Team lead/Department head | view, edit, share, approve | Internal, Confidential, Department-specific |
| **Senior Developer** | Senior technical staff | view, edit, upload, download | Public, Internal, Code |
| **Junior Developer** | Junior technical staff | view, download | Public, Internal |
| **HR** | Human Resources | view, edit, share | HR, Public |
| **Finance** | Finance team | view, edit, share | Finance, Public |
| **Employee** | Regular employee | view (own only), download | Public |

### **File Permissions (6 Types)**
- ✅ **VIEW** - Read/display file content
- ✅ **EDIT** - Modify file content
- ✅ **DELETE** - Remove file from system
- ✅ **SHARE** - Grant access to other users
- ✅ **UPLOAD** - Create new files
- ✅ **DOWNLOAD** - Export file to local system

### **File Categories (7 Types)**
1. **Public** - Accessible to all authenticated users
2. **Internal** - Accessible to managers and above
3. **Confidential** - Restricted to specific departments
4. **Code** - Accessible to developers only
5. **Finance** - Accessible to finance team only
6. **HR** - Accessible to HR team only
7. **Executive** - Accessible to admin and executives only

---

## 🏗️ Implementation Steps

### **Step 1: Update Database Models**
```python
# models.py - Add new fields to User model
- role: str (admin, manager, senior_dev, junior_dev, hr, finance, employee)
- department: str (Engineering, HR, Finance, etc.)
- permissions: List[str] (view, edit, delete, share, upload, download)

# Add new File model fields
- category: str (public, internal, confidential, code, finance, hr, executive)
- allowed_roles: List[str]
- allowed_users: List[str]
- created_by: str (user_id)

# Add new Permission model
- role: str
- permissions: List[str]
- category: str
```

### **Step 2: Create Permission Checker Service**
```python
# services/rbac.py
Functions:
- get_user_permissions(user_role, department)
- can_access_file(user, file, permission)
- can_access_category(user_role, category)
- has_permission(user, permission)
- assign_role(user_id, role)
- assign_permissions(user_id, permissions)
```

### **Step 3: Update File Access Logic**
```python
# routes/files.py
Changes:
- Add role-based permission check
- Verify user has required permission
- Check file category access
- Implement per-user/per-role file filtering
- Add file sharing mechanism
```

### **Step 4: Create Role Management Routes**
```python
# routes/rbac.py
Endpoints:
- POST /rbac/assign-role - Assign role to user
- GET /rbac/roles - List all roles
- GET /rbac/permissions/{role} - Get role permissions
- POST /rbac/file/set-category - Set file category
- POST /rbac/file/share - Share file with user/role
```

### **Step 5: Update Frontend**
```javascript
// components/FileAccess.jsx
Changes:
- Show/hide actions based on user permissions
- Implement edit/delete/share modals
- Add file category selector
- Add role-based UI rendering
```

---

## 📋 Database Schema Changes

### **Users Collection**
```json
{
  "_id": ObjectId,
  "email": "user@example.com",
  "password_hash": "...",
  "role": "manager",                    // NEW
  "department": "Engineering",           // NEW
  "permissions": ["view", "edit"],      // NEW
  "allocated_location": {...},
  "allocated_wifi_ssid": "...",
  "allocated_time_start": "09:00",
  "allocated_time_end": "18:00",
  "is_active": true,
  "created_at": "2026-02-02T..."
}
```

### **Files Collection**
```json
{
  "_id": ObjectId,
  "filename": "report.pdf",
  "encrypted_content": "...",
  "encryption_key": "...",
  "owner_id": "user_id",
  "category": "confidential",            // NEW
  "allowed_roles": ["admin", "manager"], // NEW
  "allowed_users": ["user1", "user2"],   // NEW
  "permissions": {                        // NEW
    "admin": ["view", "edit", "delete", "share"],
    "manager": ["view", "edit", "share"],
    "employee": ["view"]
  },
  "created_at": "2026-02-02T...",
  "is_encrypted": true
}
```

### **New: Roles Collection**
```json
{
  "_id": ObjectId,
  "name": "manager",
  "display_name": "Manager",
  "permissions": ["view", "edit", "share", "upload", "download"],
  "categories": ["internal", "confidential"],
  "created_at": "2026-02-02T..."
}
```

### **New: File Sharing Collection**
```json
{
  "_id": ObjectId,
  "file_id": "file_id",
  "shared_by": "user_id",
  "shared_with": {
    "user_id": "user_id",
    "permissions": ["view", "edit"]
  },
  "created_at": "2026-02-02T...",
  "expires_at": "2026-03-02T..."  // Optional expiry
}
```

---

## 🔄 Access Control Flow

```
┌─ User Requests File Access
│
├─ 1️⃣ AUTHENTICATION CHECK
│   └─ Is JWT valid? ✓ Continue : ✗ Reject
│
├─ 2️⃣ ROLE VERIFICATION
│   └─ Does user have role? ✓ Continue : ✗ Reject
│
├─ 3️⃣ PERMISSION CHECK
│   └─ Does role have permission? ✓ Continue : ✗ Reject
│
├─ 4️⃣ CATEGORY VERIFICATION
│   └─ Can role access category? ✓ Continue : ✗ Reject
│
├─ 5️⃣ FILE-LEVEL SHARING
│   └─ Is user in allowed_users? ✓ Continue : ✗ Reject
│
├─ 6️⃣ EXISTING SECURITY CHECKS
│   ├─ Face verification ✓
│   ├─ Device fingerprint ✓
│   ├─ AI risk score ✓
│   ├─ Location check ✓
│   ├─ Time check ✓
│   └─ WiFi check ✓
│
└─ 7️⃣ ACCESS GRANTED
    └─ Return file + Log access
```

---

## 🎯 Permission Matrix (Role × Permission)

| Role | View | Edit | Delete | Share | Upload | Download |
|------|:----:|:----:|:------:|:-----:|:------:|:--------:|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Senior Dev | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Junior Dev | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| HR | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Finance | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Employee | ✅* | ❌ | ❌ | ❌ | ❌ | ✅* |

**Notes:**
- ✅ = Full access
- ✅* = Own files only
- ❌ = No access

---

## 📈 Category Access Matrix (Role × Category)

| Role | Public | Internal | Confidential | Code | Finance | HR | Executive |
|------|:------:|:--------:|:------------:|:----:|:-------:|:--:|:---------:|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ❌ | 🔐* | 🔐* | ❌ |
| Senior Dev | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Junior Dev | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| HR | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Finance | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Employee | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Notes:**
- ✅ = Full access
- 🔐* = Department-specific access
- ❌ = No access

---

## 🔍 Error Handling

| Error | HTTP Code | Message |
|-------|-----------|---------|
| User not authenticated | 401 | Unauthorized |
| User role not found | 403 | Insufficient permissions |
| Permission denied | 403 | User doesn't have {permission} permission |
| Category not accessible | 403 | Cannot access {category} files |
| File not shared | 404 | File not found or not shared with you |
| Sharing failed | 400 | Failed to share file |

---

## 🧪 Testing Scenarios

### **Scenario 1: Manager accessing confidential file**
```
User: manager@company.com (role: manager)
File: quarterly_report.pdf (category: confidential)
Permission needed: view
Result: ✅ ALLOWED (manager can view confidential)
```

### **Scenario 2: Junior Dev uploading code file**
```
User: junior@company.com (role: junior_dev)
File: app.py (category: code)
Permission needed: upload
Result: ❌ DENIED (junior_dev cannot upload)
```

### **Scenario 3: Employee accessing HR file**
```
User: emp@company.com (role: employee)
File: salaries.xlsx (category: hr)
Permission needed: view
Result: ❌ DENIED (employee cannot access hr category)
```

### **Scenario 4: Shared file access**
```
User: junior@company.com (role: junior_dev)
File: guide.pdf (category: confidential, shared with junior@company.com)
Permission needed: view
Result: ✅ ALLOWED (explicitly shared)
```

---

## 🚀 Deployment Checklist

- [ ] Update User model with role/department/permissions
- [ ] Update File model with category/allowed_roles/allowed_users
- [ ] Create Roles collection with default roles
- [ ] Create RBAC service module
- [ ] Create File Sharing collection
- [ ] Update authentication route to assign roles
- [ ] Update file access route with permission checks
- [ ] Create RBAC management routes
- [ ] Update frontend to show/hide actions
- [ ] Create admin role management UI
- [ ] Database migration for existing users/files
- [ ] Test all access control scenarios
- [ ] Audit logging for permission changes
- [ ] Documentation for role management

---

## 📊 Phase-wise Implementation

### **Phase 1: Database & Models** (Estimated: 2-3 hours)
- Update User model
- Update File model
- Create Roles collection
- Create File Sharing collection
- Database migration

### **Phase 2: RBAC Service** (Estimated: 3-4 hours)
- Create rbac.py service
- Implement permission checking
- Implement role management
- Implement file sharing logic

### **Phase 3: Backend Routes** (Estimated: 4-5 hours)
- Update file access routes
- Create RBAC routes
- Implement file sharing endpoints
- Update admin routes

### **Phase 4: Frontend** (Estimated: 5-6 hours)
- Update file viewer component
- Create file sharing modal
- Create role management interface
- Update permission-based UI rendering

### **Phase 5: Testing & Deployment** (Estimated: 2-3 hours)
- Unit tests for RBAC service
- Integration tests for routes
- End-to-end testing
- Deployment and monitoring

**Total Estimated Time: 16-21 hours**

---

## 🔗 Integration Points

1. **Authentication System** → Already handles JWT, just add role to token
2. **File Encryption** → No changes needed, RBAC is added layer
3. **Device Fingerprinting** → No changes needed, RBAC is independent
4. **Geo-fencing/Time** → No changes needed, RBAC is independent
5. **AI Monitoring** → Can enhance with role-based anomaly detection
6. **Audit Logs** → Will track permission changes

---

## 🎯 Success Metrics

✅ Users can only access files their role permits
✅ Files can be shared with specific users with custom permissions
✅ Admins can manage roles and permissions
✅ All access attempts are logged with permission details
✅ No performance degradation from permission checks
✅ UI reflects user's available actions
✅ Proper error messages for permission denials

