# RBAC Implementation - Visual Guide & Quick Reference

## 🎨 System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          GEOCRYPT RBAC SYSTEM                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────┐          ┌──────────────────────┐               │
│  │   USER ROLES (7)    │          │   PERMISSIONS (6)    │               │
│  ├─────────────────────┤          ├──────────────────────┤               │
│  │ • Admin             │          │ • View               │               │
│  │ • Manager           │──────┬──→│ • Edit               │               │
│  │ • Senior Dev        │      │   │ • Delete             │               │
│  │ • Junior Dev        │      │   │ • Share              │               │
│  │ • HR                │      │   │ • Upload             │               │
│  │ • Finance           │      │   │ • Download           │               │
│  │ • Employee          │      │   └──────────────────────┘               │
│  └─────────────────────┘      │                                          │
│                               │   ┌──────────────────────┐               │
│                               │   │ CATEGORIES (7)       │               │
│                               │   ├──────────────────────┤               │
│                               └──→│ • Public             │               │
│                                   │ • Internal           │               │
│                    ┌─────────────→│ • Confidential       │               │
│                    │              │ • Code               │               │
│                    │              │ • Finance            │               │
│                    │              │ • HR                 │               │
│                    │              │ • Executive          │               │
│                    │              └──────────────────────┘               │
│                    │                                                      │
│  ┌─────────────────┴────────────────────────────────────────┐            │
│  │          RBAC ACCESS DECISION ENGINE                     │            │
│  ├────────────────────────────────────────────────────────────┤          │
│  │                                                             │          │
│  │  INPUT: User(role), File(category), Action(permission)    │          │
│  │                                                             │          │
│  │  1. Check: Does role have permission? ─→ No? → DENY       │          │
│  │  2. Check: Can role access category? ─→ No? → DENY        │          │
│  │  3. Check: Is file explicitly shared? ─→ Yes? → ALLOW     │          │
│  │  4. Other checks (face, device, location, etc.)           │          │
│  │                                                             │          │
│  │  OUTPUT: ALLOW / DENY + Log Event                         │          │
│  └────────────────────────────────────────────────────────────┘          │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: File Access Request

```
USER REQUESTS FILE ACCESS
           │
           ↓
┌──────────────────────────────────┐
│ 1. AUTHENTICATION CHECK          │
│    JWT Valid?                    │
│    ├─ NO → 401 Unauthorized      │
│    └─ YES ↓                      │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│ 2. FACE VERIFICATION              │
│    Face verified in session?     │
│    ├─ NO → 403 Re-verify         │
│    └─ YES ↓                      │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│ 3. DEVICE FINGERPRINT             │
│    Device registered & trusted?  │
│    ├─ NO → 403 Device Unknown    │
│    └─ YES ↓                      │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│ 4. AI RISK SCORE                 │
│    Risk score < 70?              │
│    ├─ NO → 403 High Risk         │
│    └─ YES ↓                      │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│ 5. LOCATION CHECK                │
│    Within geofence? (if WFH=no) │
│    ├─ NO → 403 Location          │
│    └─ YES ↓                      │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│ 6. TIME CHECK                    │
│    Within time window? (WFH=no)  │
│    ├─ NO → 403 Time              │
│    └─ YES ↓                      │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│ 7. WIFI CHECK                    │
│    WiFi SSID match? (WFH=no)     │
│    ├─ NO → 403 WiFi              │
│    └─ YES ↓                      │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│ 8. RBAC PERMISSION CHECK (NEW)   │
│    Role has permission?          │
│    ├─ NO → 403 Permission Denied │
│    └─ YES ↓                      │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│ 9. RBAC CATEGORY CHECK (NEW)     │
│    Role can access category?     │
│    ├─ NO → Check if Shared      │
│    └─ YES ↓                      │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│ 10. FILE SHARING CHECK (NEW)     │
│     Explicitly shared? Perms ok? │
│     ├─ NO → 403 No Access        │
│     └─ YES ↓                     │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│ 11. ALL CHECKS PASSED            │
│     ✅ DECRYPT & RETURN FILE     │
│     📝 LOG SUCCESSFUL ACCESS     │
└──────────────────────────────────┘
```

---

## 📊 Role Hierarchy & Permissions

```
                              ADMIN
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                 MANAGER      (SPECIAL)   (SPECIAL)
                    │           │           │
                    │       HR MANAGER    FINANCE MGR
                    │           │           │
          ┌─────────┼─────────┐ │ ┌─────────┘
          │         │         │ │ │
      SENIOR_DEV  (other)  (other)│
          │         │         │   │
      JUNIOR_DEV  ...        ... ...
          │
       EMPLOYEE


PERMISSIONS INCREASE ↑ AS YOU GO UP
┌───────────────────────────────────────┐
│ Admin       : All 6 permissions       │ ✅✅✅✅✅✅
├───────────────────────────────────────┤
│ Manager     : 5 permissions (no del)  │ ✅✅✅✅✅❌
├───────────────────────────────────────┤
│ Senior Dev  : 4 permissions           │ ✅✅❌❌✅✅
├───────────────────────────────────────┤
│ Junior Dev  : 2 permissions           │ ✅❌❌❌❌✅
├───────────────────────────────────────┤
│ HR/Finance  : 5 permissions           │ ✅✅✅✅✅❌
├───────────────────────────────────────┤
│ Employee    : 1 permission (self)     │ ✅❌❌❌❌✅
└───────────────────────────────────────┘
  View Edit Delete Share Upload Download
```

---

## 📁 File Categories Access

```
           PUBLIC          (Accessible: Everyone)
             │
             │
        INTERNAL           (Accessible: Senior+ & Managers)
             │
             │
   CONFIDENTIAL (SECRET)   (Accessible: Managers & Admin)
             │
     ┌───────┼───────┐
     │       │       │
   CODE    FINANCE   HR     (Accessible: Specific Teams + Admin)
     │       │       │
     └───────┴───────┘
             │
             │
         EXECUTIVE         (Accessible: Admin Only)


CATEGORY FLOW:
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Employee │ --> │ Manager  │ --> │ Admin    │ <-- │Executive │
│ Public   │     │Internal  │     │ All      │     │ Only     │
│ Code*    │     │Conf.     │     │          │     │          │
└──────────┘     │Finance*  │     └──────────┘     └──────────┘
                 │HR*       │
                 └──────────┘
* Department-specific
```

---

## 🔒 Permission Request Matrix

```
REQUEST STRUCTURE:
┌─────────────────────────────────────────────┐
│ User:  user_id, role, department            │
│ File:  file_id, category, owner_id          │
│ Action: permission (view, edit, etc)        │
└─────────────────────────────────────────────┘

DECISION TREE:
                    START
                      │
          ┌───────────┴───────────┐
          │                       │
        IS             ┌─ YES ── ALLOWED
       OWNER?          │
        │              └─ NO
        │
       NO
        │
    ┌───┴────────────────────────────┐
    │                                │
  IS ADMIN?                    ┌─ YES ── ALLOWED
    │        ┌─ YES ─────────┘
    │        │
   NO      NO
    │
    ├─ Check: Role has permission? ──── NO ──→ DENIED
    │  (view, edit, delete, share, etc.)
    │
    └─ Check: Role can access category? ──┐
       (public, internal, confidential)    │
                                           │
       ┌─ YES ──────────────────────────┬─┘
       │                                │
       │                            ┌─ YES ────→ ALLOWED
       │                            │
       │                        NO
       │                            │
       │                    ┌─ Check: File Shared?
       │                    │      (file_sharing collection)
       │                    │
       │                    ├─ YES, with permission ──→ ALLOWED
       │                    │
       │                    └─ NO or permission not included ──→ DENIED
       │
       └─ NO (Category not accessible)
           │
           └─ Check: File Shared?
              │
              ├─ YES, with permission ──→ ALLOWED
              │
              └─ NO or permission not included ──→ DENIED
```

---

## 🚀 Implementation Timeline

```
WEEK 1: Backend Core
├─ Day 1-2: RBAC Service & Models ✅ DONE
├─ Day 3-4: RBAC Routes ✅ DONE
└─ Day 5: DB Setup & Documentation ✅ DONE

WEEK 2: Integration
├─ Day 1-2: Update File Upload/Access Routes 🔄 TODO
├─ Day 3-4: Update Admin Routes 🔄 TODO
└─ Day 5: Integration Testing 🔄 TODO

WEEK 3: Frontend
├─ Day 1-2: File Upload & Category UI 🔄 TODO
├─ Day 3: File Sharing Modal 🔄 TODO
├─ Day 4: Role Management UI 🔄 TODO
└─ Day 5: Permission Indicators 🔄 TODO

WEEK 4: Finalization
├─ Day 1: Database Migration Script 🔄 TODO
├─ Day 2-3: Comprehensive Testing 🔄 TODO
├─ Day 4: Performance Testing 🔄 TODO
└─ Day 5: Production Deployment 🔄 TODO
```

---

## 📊 Database Schema Summary

```
USERS COLLECTION
┌─────────────────────────────────────┐
│ _id: ObjectId                       │
│ email: string                       │
│ password_hash: string               │
│ role: string (7 types)              │ ← NEW
│ department: string                  │ ← NEW
│ permissions: [string]               │ ← NEW
│ ... existing fields ...             │
└─────────────────────────────────────┘

FILES COLLECTION
┌─────────────────────────────────────┐
│ _id: ObjectId                       │
│ filename: string                    │
│ owner_id: ObjectId                  │
│ category: string (7 types)          │ ← NEW
│ allowed_roles: [string]             │ ← NEW
│ allowed_users: [string]             │ ← NEW
│ encrypted_content: bytes            │
│ encryption_key: string              │
│ ... existing fields ...             │
└─────────────────────────────────────┘

ROLES COLLECTION (NEW)
┌─────────────────────────────────────┐
│ _id: ObjectId                       │
│ name: string                        │
│ display_name: string                │
│ permissions: [string]               │
│ created_at: Date                    │
└─────────────────────────────────────┘

FILE_SHARING COLLECTION (NEW)
┌─────────────────────────────────────┐
│ _id: ObjectId                       │
│ file_id: string                     │
│ shared_by: string                   │
│ shared_with: string                 │
│ permissions: [string]               │
│ created_at: Date                    │
│ expires_at: Date                    │
└─────────────────────────────────────┘
```

---

## 🎯 Success Criteria

```
Feature                          Status      Evidence
─────────────────────────────────────────────────────────────
7 User Roles Defined             ✅ DONE     In rbac.py
6 Permissions Implemented        ✅ DONE     In rbac.py
7 Categories Supported           ✅ DONE     In rbac.py
Permission Matrix Complete       ✅ DONE     In IMPLEMENTATION.md
Category Matrix Complete         ✅ DONE     In IMPLEMENTATION.md
RBAC Service Created             ✅ DONE     app/services/rbac.py
RBAC Routes Created              ✅ DONE     app/routes/rbac.py
Models Updated                   ✅ DONE     app/models.py
Database Collections Added       ✅ DONE     app/database.py
File Upload Integrated           🔄 TODO     Phase 2
File Access Integrated           🔄 TODO     Phase 2
Admin Routes Updated             🔄 TODO     Phase 2
Frontend UI Built                🔄 TODO     Phase 3
Migration Script Created         🔄 TODO     Phase 4
Full Testing Complete            🔄 TODO     Phase 5
Production Ready                 🔄 TODO     Phase 5
```

---

## 🔗 Quick Links

### Documentation
- [Complete Implementation](ROLE_BASED_ACCESS_CONTROL_IMPLEMENTATION.md)
- [Remaining Work](RBAC_IMPLEMENTATION_REMAINING_WORK.md)
- [API Reference](RBAC_API_REFERENCE.md)
- [Summary](RBAC_IMPLEMENTATION_SUMMARY.md)

### Code Files
- [RBAC Service](backend/app/services/rbac.py)
- [RBAC Routes](backend/app/routes/rbac.py)
- [Updated Models](backend/app/models.py)
- [Database Setup](backend/app/database.py)

### Next Steps
1. Review [ROLE_BASED_ACCESS_CONTROL_IMPLEMENTATION.md](ROLE_BASED_ACCESS_CONTROL_IMPLEMENTATION.md)
2. Follow [RBAC_IMPLEMENTATION_REMAINING_WORK.md](RBAC_IMPLEMENTATION_REMAINING_WORK.md)
3. Use [RBAC_API_REFERENCE.md](RBAC_API_REFERENCE.md) for testing

---

## 🧪 Testing Quick Commands

```bash
# Initialize roles (run once)
curl -X POST http://localhost:8000/rbac/initialize-roles \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get all roles
curl http://localhost:8000/rbac/roles \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Assign role to user
curl -X POST "http://localhost:8000/rbac/assign-role?user_id=USER_ID&role=manager" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Share file
curl -X POST "http://localhost:8000/rbac/file/share?file_id=FILE_ID&target_user_id=TARGET_ID&permissions=view,download" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check access
curl "http://localhost:8000/rbac/file/FILE_ID/access-check?permission=view" \
  -H "Authorization: Bearer $USER_TOKEN"
```

---

**Version:** 1.0
**Date:** February 2, 2026
**Project:** GeoCrypt RBAC Implementation

