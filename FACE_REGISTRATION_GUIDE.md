# Face Registration Guide

## How to Register Admin Face

### Step 1: Login as Admin
1. Go to the login page
2. Enter your admin email and password
3. Complete OTP verification
4. **Note:** You'll need to register your face first before you can complete login

### Step 2: Register Your Face (First Time Setup)

**Option A: Using Admin Dashboard (Recommended)**

1. **Temporary Login Bypass** (if face not registered):
   - If you get "Face verification required" error, you may need to temporarily modify the backend to allow admin login without face verification for initial setup
   - OR use the admin face registration page directly

2. **Access Face Registration Page:**
   - Navigate to: `/admin/face-registration`
   - Or click "Face Registration" button in Admin Dashboard

3. **Register Your Face:**
   - Your email should be pre-filled (if you're logged in as admin)
   - Click "Use My Email" button if needed
   - Position your face clearly in the camera frame
   - Ensure good lighting
   - Click "Capture Photo"
   - Review the captured image
   - Click "Register Face"

4. **Success:**
   - You'll see "Face registered successfully!" message
   - Now you can complete the login flow with face verification

**Option B: Using API Directly (For Development)**

If you need to register face programmatically:

```bash
# Get your admin JWT token first
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "your_password"}'

# Verify OTP (get temp_token)
curl -X POST http://localhost:8000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "otp": "123456"}'

# Register face (use temp_token or full token)
curl -X POST http://localhost:8000/auth/face/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "face_image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }'
```

### Step 3: Register Employee Faces

1. **Access Face Registration:**
   - Go to Admin Dashboard
   - Click "Face Registration" button

2. **Select Employee:**
   - Enter employee email OR
   - Click on employee from the list

3. **Capture Face:**
   - Position employee's face in camera
   - Click "Capture Photo"
   - Click "Register Face"

4. **Done:**
   - Employee can now use face verification during login

## Important Notes

### For First-Time Admin Setup:

If you're setting up the system for the first time and the admin doesn't have a face registered:

**Temporary Solution (Development Only):**

You can temporarily modify the backend to allow admin login without face verification:

1. Edit `backend/app/routes/face_verification.py`
2. In the `verify_face` function, add a check for admin role:

```python
# Allow admin to bypass face verification if not registered (first time only)
if user["role"] == "admin":
    stored_face = await face_embeddings_collection.find_one({
        "user_id": str(user["_id"])
    })
    if not stored_face:
        # Allow admin to proceed without face verification for first login
        # They should register their face immediately after
        token = create_jwt_token({
            "user_id": str(user["_id"]),
            "face_verified": False,  # Will need to verify later
        })
        return {
            "token": token,
            "message": "Admin first login - please register your face",
            "requires_face_registration": True,
        }
```

**OR** use a script to register admin face directly in the database.

### Best Practice:

1. **Register Admin Face First:**
   - Before deploying to production, register the admin face
   - This ensures admin can always log in

2. **Register Employee Faces:**
   - Register faces when creating new employees
   - Or have employees register during first login (with admin assistance)

3. **Face Quality:**
   - Ensure good lighting
   - Face should be clearly visible
   - No sunglasses or masks
   - Face should fill most of the frame

## Troubleshooting

### "Face verification required" Error

**Solution:**
1. Make sure your face is registered
2. Go to `/admin/face-registration`
3. Select your email
4. Capture and register your face

### "No face detected" Error

**Solution:**
1. Ensure good lighting
2. Position face clearly in frame
3. Remove sunglasses/masks
4. Try again

### Camera Not Working

**Solution:**
1. Check browser permissions for camera
2. Allow camera access when prompted
3. Try a different browser
4. Check if camera is being used by another app

## API Endpoints

- `POST /auth/face/register` - Register face (Admin only)
- `POST /auth/face/verify` - Verify face (All users)
- `GET /auth/face/status` - Check face registration status

## Security Notes

- Face embeddings are stored encrypted in the database
- Face images are NOT stored permanently (only embeddings)
- Face verification is mandatory for all users after OTP
- Admin can register faces for any user
- Users cannot register their own faces (admin only)
