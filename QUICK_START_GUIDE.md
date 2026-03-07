# GeoCrypt Quick Start Guide

## 🚀 First-Time Admin Setup

### Step 1: Create Admin Account

If you don't have an admin account yet, create one:

```bash
cd backend
python create_admin.py
```

Or use the API directly to create an admin.

### Step 2: Login as Admin

1. Go to login page: `http://localhost:3000/`
2. Enter admin email and password
3. Complete OTP verification (check email or console for OTP)
4. You'll be redirected to face verification page

### Step 3: Face Verification (First Login)

**Option A: Admin Bypass (Development Mode - Default)**

1. On face verification page, capture any face image
2. Click "Verify Face"
3. Backend will detect no registered face and **automatically allow bypass** (if you're admin)
4. You'll see: "Login successful! ⚠️ DEV MODE: Face verification bypassed..."
5. You'll be redirected to Admin Dashboard

**Option B: Register Face Immediately**

1. On face verification page, capture your face
2. Click "Verify Face"
3. If face not registered, bypass will be used automatically
4. After login, go to Admin Dashboard → "Face Registration"
5. Register your face for future logins

### Step 4: Register Your Face (Recommended)

1. After logging in (with bypass), go to Admin Dashboard
2. Click **"Face Registration"** button
3. Your email should be pre-filled, or click "Use My Email"
4. Position your face clearly in camera
5. Click "Capture Photo"
6. Click "Register Face"
7. Success! Your face is now registered

### Step 5: Register Employee Faces

1. Go to Admin Dashboard
2. Click "Face Registration"
3. Select employee from list or enter their email
4. Capture their face
5. Click "Register Face"

## 🔧 Configuration

### Post-Quantum Encryption (CRYSTALS-Kyber)

GeoCrypt can optionally use a post‑quantum KEM (CRYSTALS-Kyber) instead of
the legacy X25519/ECDH exchange when encrypting files.  To activate the new
algorithm set the following environment variable **before uploading files**:

```env
USE_KYBER=true   # requires the `pqcrypto` package
```

If `USE_KYBER` is not set or the Python library is unavailable the system will
fall back to the original X25519-based scheme.  Existing files encrypted with
the legacy algorithm continue to decrypt normally.


### Enable/Disable Admin Bypass

**Development (Default - Bypass Enabled):**
```env
# (face bypass variable is deprecated and ignored)
#ALLOW_ADMIN_FACE_BYPASS=true
```

**Production (Bypass Disabled):**
```env
#ALLOW_ADMIN_FACE_BYPASS=false
```

## 📝 Common Issues

### "Face verification required" Error

**For Employees:**
- Your face is not registered
- Contact your administrator to register your face
- Admin can register it at `/admin/face-registration`

**For Admins:**
- If bypass is enabled, this shouldn't happen
- Face bypass is no longer used; you can ignore `ALLOW_ADMIN_FACE_BYPASS`.
- Or register your face in admin panel

### "Face not registered" Error

**Solution:**
1. Go to `/admin/face-registration` (as admin)
2. Select your email
3. Capture and register your face

### Admin Bypass Not Working

**Check:**
1. (Deprecated) `ALLOW_ADMIN_FACE_BYPASS` is ignored
2. User role is "admin"
3. Face is NOT registered (bypass only works if face not registered)
4. Check backend logs for bypass messages

## 🎯 Quick Commands

### Start Backend
```bash
cd backend
python run.py
# or
uvicorn app.main:app --reload
```

### Start Frontend
```bash
cd frontend
npm start
```

### Create Admin (if needed)
```bash
cd backend
python create_admin.py
```

## ✅ Setup Checklist

- [ ] Admin account created
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] MongoDB connected
- [ ] Admin logged in (with bypass if needed)
- [ ] Admin face registered
- [ ] Employee faces registered (as needed)
- [ ] Environment variables configured

## 🔐 Security Notes

- **Development:** Admin bypass is enabled by default
- **Production:** face bypass settings are no longer applicable
- Always register admin face before production
- Register employee faces when creating accounts

## 📞 Need Help?

1. Check backend logs for error messages
2. Verify environment variables are set
3. Ensure MongoDB is running and connected
4. Check that user role is correct in database
