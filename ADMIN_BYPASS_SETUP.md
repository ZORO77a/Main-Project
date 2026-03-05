# Admin Face Verification Bypass (Development Mode)

## Overview

For initial setup and development, admins can bypass face verification if their face is not yet registered. This feature is **DEVELOPMENT ONLY** and should be disabled in production.

## How It Works

When an admin tries to verify their face but doesn't have a face registered:

1. Backend checks if `ALLOW_ADMIN_FACE_BYPASS` environment variable is set to `"true"` (default: enabled)
2. If admin and bypass enabled → Admin gets a token with `face_bypassed: True` flag
3. Admin can access the system but receives warnings to register their face
4. File access still works (bypass is checked in file access route)

## Configuration

### Enable Bypass (Default - Development)

```env
ALLOW_ADMIN_FACE_BYPASS=true
```

### Disable Bypass (Production)

```env
ALLOW_ADMIN_FACE_BYPASS=false
```

## Setup Steps

### Step 1: Login as Admin

1. Go to login page
2. Enter admin email and password
3. Complete OTP verification
4. You'll be redirected to face verification page

### Step 2: Face Verification (With Bypass)

**Option A: Register Face Immediately (Recommended)**
1. Capture your face
2. Click "Verify Face"
3. If face not registered, backend will automatically allow bypass
4. You'll get a warning message
5. Register your face in admin panel immediately

**Option B: Skip Face Capture (Bypass)**
1. On face verification page, if you're admin and face not registered
2. Backend will automatically allow bypass when you try to verify
3. You'll get a token with bypass flag
4. Navigate to `/admin/face-registration` to register your face

### Step 3: Register Your Face

1. After logging in (with bypass), go to Admin Dashboard
2. Click "Face Registration" button
3. Select your email (or click "Use My Email")
4. Capture your face
5. Click "Register Face"
6. Your face is now registered for future logins

## Important Notes

### ⚠️ Development Only

- This bypass is **ONLY for development**
- **DISABLE in production** by setting `ALLOW_ADMIN_FACE_BYPASS=false`
- Always register admin face before production deployment

### Security Implications

- Bypass allows admin to login without face verification
- File access still works (bypass is checked)
- All actions are logged with "face_bypassed" flag
- Session has `face_bypassed: True` flag for tracking

### Production Checklist

Before deploying to production:

- [ ] Register admin face
- [ ] Set `ALLOW_ADMIN_FACE_BYPASS=false` in environment
- [ ] Test that face verification is required
- [ ] Verify all admins have faces registered

## API Behavior

### Face Verification Endpoint

**Request:**
```json
POST /auth/face/verify
{
  "email": "admin@example.com",
  "face_image": "data:image/jpeg;base64,..."
}
```

**Response (Bypass Enabled):**
```json
{
  "token": "jwt_token_here",
  "message": "Admin login allowed (DEV MODE). Please register your face immediately.",
  "requires_face_registration": true,
  "warning": "⚠️ DEV MODE: Face verification bypassed. Register your face for production use.",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### File Access with Bypass

File access route checks for either:
- `face_verified: True` (normal verification)
- `face_bypassed: True` (admin bypass in dev mode)

Both allow file access.

## Troubleshooting

### Bypass Not Working

1. Check environment variable: `ALLOW_ADMIN_FACE_BYPASS=true`
2. Verify user role is "admin"
3. Check backend logs for bypass messages
4. Ensure face is NOT registered (bypass only works if face not registered)

### Want to Force Face Verification

1. Set `ALLOW_ADMIN_FACE_BYPASS=false`
2. Restart backend
3. Admin must register face before login

### Bypass Still Active After Registering Face

- Once face is registered, bypass is no longer used
- Normal face verification flow applies
- Bypass only works when face is NOT registered

## Code Locations

- **Backend Bypass Logic:** `backend/app/routes/face_verification.py` (line ~104)
- **File Access Bypass Check:** `backend/app/routes/employee.py` (line ~230)
- **Environment Variable:** Set in `.env` file or environment

## Example .env Configuration

```env
# Development (Bypass Enabled)
ALLOW_ADMIN_FACE_BYPASS=true

# Production (Bypass Disabled)
ALLOW_ADMIN_FACE_BYPASS=false
```
