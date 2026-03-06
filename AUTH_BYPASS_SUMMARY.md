# Authentication Bypass Summary

**Date:** March 5, 2026  
**Purpose:** Development mode - bypassing OTP and Face verification for both Employee and Admin login

## Changes Made

### 1. **auth.py** - Login Endpoint (`/auth/login`)
- **Previous Behavior:** Generated OTP and sent via email, required OTP verification as next step
- **New Behavior:** 
  - Validates credentials (email + password)
  - Creates a session with `face_verified=True` and `face_bypassed=True`
  - Issues a full JWT token with `auth_bypassed=True` flag
  - Returns complete response with token (no OTP step required)

### 2. **auth.py** - OTP Verification Endpoint (`/auth/verify-otp`)
- **Previous Behavior:** Validated OTP hash, required face verification as next step
- **New Behavior:**
  - Accepts any OTP input (no validation)
  - Creates a session directly
  - Issues a full JWT token with `auth_bypassed=True` flag
  - Returns complete response with token
  - Logs action as "OTP & Face verification bypassed"

### 3. **face_verification.py** - Face Verification Endpoint (`/auth/face/verify`)
- **Previous Behavior:** Compared face embedding with stored face, allowed bypass only if no face registered
- **New Behavior:**
  - Completely bypasses face verification for all users
  - Creates a session with `face_verified=True` and `face_bypassed=True`
  - Issues a full JWT token with bypass flags
  - Returns similarity=1.0 (fake perfect match)
  - Works for both Admin and Employee roles

## Login Flow (After Changes)

### Original Flow:
```
Email + Password
    ↓
Login → Send OTP
    ↓
Enter OTP
    ↓
Verify OTP → Get Temp Token
    ↓
Submit Face Image
    ↓
Verify Face → Get Full Token
    ↓
Login Complete
```

### New Bypassed Flow:
```
Email + Password
    ↓
Login → Get Full Token Immediately
    ↓
Login Complete
```

## Testing Instructions

### Employee Login:
1. Email: `employee@example.com`
2. Password: (your employee password)
3. You will get a full JWT token immediately
4. No OTP or face verification required

### Admin Login:
1. Email: `admin@example.com`
2. Password: (your admin password)
3. You will get a full JWT token immediately
4. No OTP or face verification required

## Access Logs
All login attempts are logged with:
- `action`: "login", "otp_verified", or "face_verification"
- `success`: true (all bypassed logins succeed)
- `reason`: Indicates that authentication was bypassed

## Security Notes
⚠️ **WARNING:** This is for DEVELOPMENT ONLY. Do NOT use in production.

- All authentication checks are completely disabled
- Face verification is simulated (returns similarity=1.0)
- OTP validation is skipped
- Use `ALLOW_ADMIN_FACE_BYPASS` environment variable is now ignored

## Reverting Changes
To restore full authentication:
1. Revert auth.py login endpoint to original OTP flow
2. Revert auth.py verify-otp endpoint to original face verification check
3. Revert face_verification.py verify endpoint to original comparison logic

## Files Modified
- `backend/app/routes/auth.py`
- `backend/app/routes/face_verification.py`
