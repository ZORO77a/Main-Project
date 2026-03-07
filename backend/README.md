# GeoCrypt Backend

A comprehensive geofencing-based access control system with OTP-based authentication, post-quantum cryptography, and AI-powered monitoring.

## Features

- **Multi-factor Authentication**: OTP only (no biometrics)
- **Role-based Access Control**: Admin and Employee roles
- **Geofencing**: Location-based access control
- **WiFi Verification**: Network-based security
- **Time-based Access**: Scheduled access windows
- **File Encryption**: Post-quantum cryptography protection
- **AI Monitoring**: Anomaly detection and pattern analysis
- **Work-from-Home**: Request system for remote access

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **MongoDB Setup**:
   - Install MongoDB locally or use MongoDB Atlas
   - Update `MONGO_URL` in `.env` if needed

3. **Create Initial Admin**:
   ```bash
   python create_admin.py
   ```

4. **Run the Server**:
   ```bash
   python run.py
   ```

The API will be available at `http://localhost:8000`

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email/password
- `POST /auth/verify-otp` - Verify OTP

### Admin
- `GET /admin/dashboard` - Admin dashboard data
- `POST /admin/add-employee` - Add new employee
- `PUT /admin/edit-employee` - Edit employee details
- `DELETE /admin/employee/{id}` - Deactivate employee
- `POST /admin/approve-wfh/{id}` - Approve work-from-home request
- `POST /admin/reject-wfh/{id}` - Reject work-from-home request

### Employee
- `GET /employee/dashboard` - Employee dashboard
- `POST /employee/request-work-from-home` - Request work-from-home access
- `POST /employee/upload-file` - Upload encrypted file
- `POST /employee/access-file` - Access decrypted file (with conditions)

### AI Monitoring
- `GET /ai/analyze-employee/{id}` - Analyze employee access patterns

## Security Features

- **Location Tracking**: GPS-based geofencing with configurable tolerance
- **WiFi Verification**: SSID matching for network security
- **Time Windows**: Configurable access time slots
- **File Encryption**: AES encryption (can be upgraded to post-quantum)
- **Access Logging**: Comprehensive audit trail
- **Anomaly Detection**: ML-based pattern analysis

## Environment Variables

- `MONGO_URL`: MongoDB connection string
- `DB_NAME`: Database name
- `JWT_SECRET`: JWT signing secret
- `OTP_EXPIRY_SECONDS`: OTP validity duration
- `EMAIL_SMTP_SERVER`: SMTP server for OTP emails
- `EMAIL_SMTP_PORT`: SMTP port
- `EMAIL_USERNAME`: Email username
- `EMAIL_PASSWORD`: Email password/app password

## Development

The backend is built with:
- **FastAPI**: Modern Python web framework
- **MongoDB**: NoSQL database with Motor async driver
- **Pydantic**: Data validation and serialization
- **OpenCV**: Used for auxiliary image handling (face components removed)
- **Cryptography**: File encryption/decryption
- **scikit-learn**: Machine learning for anomaly detection

## Production Considerations

- Use proper email service (SendGrid, AWS SES) instead of SMTP
- Implement rate limiting
- Add input validation and sanitization
- Use HTTPS in production
- Implement proper logging and monitoring
- Regular security audits
- Backup strategies for database and encrypted files