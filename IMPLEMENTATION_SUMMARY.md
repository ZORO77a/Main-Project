# GeoCrypt - Implementation Summary

## ✅ Completed Features

This document summarizes the implementation of the Zero-Trust Geo-Secure File Access Platform (GeoCrypt).

### 🔐 Authentication Flow (3-Step Process)

1. **Step 1: Login (Email + Password)**
   - User enters email and password
   - Backend validates credentials
   - OTP sent to email

2. **Step 2: OTP Verification**
   - User enters OTP
   - Backend validates OTP
   - Returns temporary token (NOT full access)

3. **Step 3: Face Verification (MANDATORY)**
   - User must take a selfie
   - Face embedding extracted using DeepFace/Facenet *(feature removed)*
   - Compared with stored face embedding (cosine similarity ≥ 0.75)
   - If match: Full JWT token issued
   - If no match: Access denied

**Routes:**
- `POST /auth/login` - Step 1
- `POST /auth/verify-otp` - Step 2 (returns temp_token)
# NOTE: Face endpoints have been removed from the project.
# The following entries remain for historical documentation.
- `POST /auth/face/verify` - Step 3 (returns full token)
- `POST /auth/face/register` - Admin registers face for user

### 👤 Device Fingerprinting

**Features:**
- Browser fingerprint generation from:
  - User agent
  - Screen resolution
  - Timezone
  - Language
  - Platform
  - CPU cores
  - WebGL vendor/renderer
- SHA256 hash-based fingerprint storage
- Device registration and verification
- Trusted/untrusted device management

**Routes:**
- `POST /auth/device/register` - Register device
- `POST /auth/device/verify` - Verify device
- `GET /auth/device/list` - List registered devices
- `DELETE /auth/device/{device_id}` - Revoke device

### 🗺️ Geo-Fencing (500m Radius)

**Implementation:**
- Haversine distance calculation for GPS coordinates
- 500m default radius (configurable per user)
- Real-time location check on file access
- Location violation logging

**Storage:**
```json
{
  "allocated_location": {
    "lat": 12.9716,
    "lng": 77.5946,
    "radius": 500
  }
}
```

### 🕒 Time Window Rules

**Features:**
- Supports regular windows (09:00-18:00)
- Supports overnight windows (22:00-06:00)
- Time-based access control
- Violation logging

**Storage:**
```json
{
  "allocated_time_start": "09:00",
  "allocated_time_end": "18:00"
}
```

### 📡 WiFi SSID Validation (Soft Rule)

**Features:**
- WiFi SSID validation (soft rule, not absolute)
- GPS + Time are hard rules
- WiFi is confidence boost
- Case-insensitive matching

**Storage:**
```json
{
  "allocated_wifi_ssid": "GeoCrypt-Office"
}
```

### 🔒 File Encryption (AES-256 + X25519)

**Implementation:**
- Hybrid encryption using AES-256-GCM + X25519 key exchange
- Files encrypted before storage in MongoDB
- Keys stored separately
- Decryption happens in-memory only
- Files never written to disk (streamed directly)

**Flow:**
1. File encrypted with AES-256-GCM
2. AES key encrypted with X25519 public key
3. Encrypted blob stored in MongoDB
4. Decryption only happens in memory
5. Streamed to browser (never written to disk)

### 🧠 AI Risk Scoring (30-Day Analysis)

**Features:**
- Analyzes last 30 days of activity logs
- Risk factors:
  1. **Failed Login Attempts** (0-40 points)
     - >10 failures: +40 points
     - >5 failures: +20 points
  
  2. **Geo Violations** (0-30 points)
     - >5 violations: +30 points
     - >0 violations: +15 points
  
  3. **Time Violations** (0-20 points)
     - >3 violations: +20 points
     - >0 violations: +10 points
  
  4. **Network Changes** (0-15 points)
     - >5 networks: +15 points
     - >3 networks: +8 points
  
  5. **File Download Spikes** (0-20 points)
     - >100 downloads: +20 points
     - >50 downloads: +10 points
  
  6. **Movement Speed** (0-15 points)
     - >500 km/h: +15 points (suspicious)
     - >200 km/h: +8 points
  
  7. **Device Changes** (0-10 points)
     - >5 devices: +10 points
     - >3 devices: +5 points

**Risk Levels:**
- **LOW** (0-39): Allow access
- **MEDIUM** (40-69): Require face re-verification
- **HIGH** (70-100): Block access

**Routes:**
- `GET /ai/analyze/{employee_id}` - Full 30-day analysis
- `GET /ai/risk-check/{employee_id}` - Quick risk check

### 🔓 Zero-Trust File Access Flow

Every file access requires **ALL** checks to pass:

1. ✅ **JWT Valid** - User authenticated
2. ✅ **Face Verified** - Session has active face verification
3. ✅ **Device Match** - Device fingerprint matches registered device
4. ✅ **AI Risk < Threshold** - Risk score < 70
5. ✅ **GPS Inside 500m** - Within geofence (if not WFH)
6. ✅ **Time Allowed** - Within time window (if not WFH)
7. ✅ **WiFi Match** - WiFi SSID matches (if not WFH)
8. ✅ **WFH Active** - OR active WFH request (bypasses geo/time/wifi)

**Route:**
- `POST /employee/access-file` - Full zero-trust access check

### 📊 Database Collections

1. **users** - User accounts (admin/employee)
2. **otp** - OTP tokens (temp storage)
3. **files** - Encrypted files
4. **access_logs** - All access attempts (audit trail)
5. **work_from_home_requests** - WFH requests
6. **face_embeddings** - Face embeddings (base64 encoded)
7. **device_fingerprints** - Device fingerprints
8. **sessions** - Active sessions with face verification status

### 🧾 Audit Logging

Every action is logged:
- Login attempts
- OTP verification
- Face verification
- Device registration
- File access attempts
- Geo violations
- Time violations
- WiFi mismatches
- AI risk scores

**Log Structure:**
```json
{
  "user_id": "string",
  "file_id": "string (optional)",
  "action": "string",
  "timestamp": "datetime",
  "success": "boolean",
  "reason": "string",
  "location": {"lat": float, "lng": float},
  "wifi_ssid": "string",
  "device_fingerprint": "string",
  "ai_risk_score": "integer"
}
```

### 👨‍💼 Admin Dashboard Features

**Routes:**
- `GET /admin/dashboard` - Dashboard stats
- `POST /admin/add-employee` - Add employee with geo/time/wifi rules
- `GET /admin/employees` - List employees
- `GET /admin/employee/{id}` - Get employee details
- `PUT /admin/edit-employee/{id}` - Edit employee rules
- `DELETE /admin/employee/{id}` - Deactivate employee
- `POST /admin/approve-wfh/{id}` - Approve WFH request
- `GET /admin/access-logs` - View audit logs
- `GET /ai/analyze/{id}` - AI risk analysis

### 📝 API Endpoints Summary

**Authentication:**
- `POST /auth/login` - Login (email + password)
- `POST /auth/verify-otp` - Verify OTP (returns temp_token)
- `POST /auth/resend-otp` - Resend OTP

**Face Verification:**
- `POST /auth/face/register` - Register face (admin only)
- `POST /auth/face/verify` - Verify face (returns full token)
- `GET /auth/face/status` - Check face status

**Device Fingerprint:**
- `POST /auth/device/register` - Register device
- `POST /auth/device/verify` - Verify device
- `GET /auth/device/list` - List devices
- `DELETE /auth/device/{id}` - Revoke device

**Employee:**
- `GET /employee/dashboard` - Employee dashboard
- `POST /employee/upload-file` - Upload file (encrypted)
- `POST /employee/access-file` - Access file (zero-trust check)
- `GET /employee/open-text-file/{id}` - Open text file
- `PUT /employee/save-text-file/{id}` - Save text file
- `POST /employee/request-work-from-home` - Request WFH

**Admin:**
- `GET /admin/dashboard` - Admin dashboard
- `POST /admin/add-employee` - Add employee
- `GET /admin/employees` - List employees
- `PUT /admin/edit-employee/{id}` - Edit employee
- `DELETE /admin/employee/{id}` - Deactivate employee
- `GET /admin/access-logs` - Access logs

**AI Monitoring:**
- `GET /ai/analyze/{employee_id}` - Full 30-day analysis
- `GET /ai/risk-check/{employee_id}` - Quick risk check

## 🔧 Installation

### Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Key packages:**
- `fastapi` - Web framework
- `motor` (async MongoDB driver)
- `deepface` - Face recognition *(dependency removed)*
- `cryptography` - Encryption
- `bcrypt` - Password hashing
- `pyjwt` - JWT tokens
- `pillow` - Image processing
- `numpy` - Numerical operations

### Environment Variables

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=geocrypt
JWT_SECRET=your-secret-key
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
OTP_EXPIRY_SECONDS=300
```

## 🚀 Next Steps (Frontend)

The frontend needs to implement:

1. **Face Capture Component**
   - Camera access
   - Photo capture
   - Base64 encoding
   - Send to `/auth/face/verify`

2. **GPS Tracking**
   - Get current location
   - Send with file access requests
   - Handle location permissions

3. **WiFi Detection**
   - Detect WiFi SSID (if available)
   - Send with requests

4. **Device Fingerprinting**
   - Collect device info
   - Generate fingerprint
   - Register/verify device

5. **Multi-Step Login Flow**
   - Login → OTP → Face Verification

6. **File Access UI**
   - Request location/GPS
   - Get device fingerprint
   - Check face verification status
   - Display access logs

## 🎯 Security Features Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Multi-Factor Auth | ✅ | Email + Password → OTP → Face |
| Face Verification | ✅ *(deprecated)* | DeepFace/Facenet (cosine similarity ≥ 0.75) |
| Device Fingerprinting | ✅ | Browser fingerprint + SHA256 hash |
| Geo-Fencing | ✅ | 500m radius GPS check |
| Time Windows | ✅ | Configurable time restrictions |
| WiFi Validation | ✅ | Soft SSID matching |
| File Encryption | ✅ | AES-256-GCM + X25519 |
| AI Risk Scoring | ✅ | 30-day behavior analysis |
| Zero-Trust Access | ✅ | All checks required for file access |
| Audit Logging | ✅ | Complete audit trail |

## 📌 Notes

1. **DeepFace Installation**: *This step is obsolete as biometrics have been removed*
2. **Face Verification**: Falls back to dummy embeddings if DeepFace not available (dev mode)
3. **Device Fingerprint**: Uses SHA256 hash for exact matching (fuzzy matching can be added)
4. **GPS Accuracy**: Uses Haversine formula for distance calculation
5. **Time Windows**: Supports both regular and overnight windows
6. **AI Risk**: Uses 30-day rolling window for analysis

## 🔥 Why This Is Enterprise-Level

This system combines features from:
- **Google BeyondCorp** - Geo + Device
- **Microsoft Zero Trust** - Time + Network
- **Okta** - MFA
- **CrowdStrike** - AI behavior

All implemented in GeoCrypt! 🚀
