# Showing Encrypted Files to Invigilators

This guide explains how to demonstrate that files are properly encrypted in GeoCrypt before being stored in the database.

## Quick Start: 3 Ways to Show Encryption

### 1. **Run the Demo Script** (Fastest)
```bash
cd backend
python demo_encryption.py
```
This shows real encryption/decryption in action with terminal output.

**Output includes:**
- Original file content (plaintext)
- Kyber768 KEM process details
- Encrypted blob (binary gibberish)
- Database storage simulation
- Successful decryption verification

---

### 2. **View Interactive HTML Demo** (Visual)
```bash
# Open in browser
backend/demo_encryption.html
```
A beautiful step-by-step visual demonstration showing:
- Plaintext file
- Encryption process
- Encrypted result (unreadable)
- Database storage format
- Decryption

---

### 3. **Use Admin Encryption Audit API** (Technical)

#### A. View All Files with Encryption Metadata
```bash
GET /api/admin/files/encryption-audit
```
Response shows:
- Total encrypted files
- Algorithm used (Kyber or X25519)
- Encrypted content sizes
- Key storage confirmation
- Overall encryption status

**Example response:**
```json
{
  "total_files": 5,
  "files": [
    {
      "file_id": "507f1f77bcf86cd799439011",
      "filename": "project_budget.txt",
      "is_encrypted": true,
      "encryption_algorithm": "kyber",
      "encrypted_content_size_bytes": 2847,
      "encrypted_content_preview_hex": "a7b14e3f9c2d5f8a1e4b7c0d3f6a9b2...",
      "encryption_key_present": true
    }
  ],
  "encryption_status": "All files encrypted before storage"
}
```

#### B. Inspect Specific File Details
```bash
GET /api/admin/files/{file_id}/encryption-details
```
Shows:
- File metadata
- Encrypted content (hex preview)
- Encryption key seed (first 64 chars)
- Security summary
- Verification status

**Example response:**
```json
{
  "file_id": "507f1f77bcf86cd799439011",
  "filename": "budget.txt",
  "is_encrypted": true,
  "encryption_algorithm": "kyber",
  "encrypted_content": {
    "total_size_bytes": 2847,
    "first_200_bytes_hex": "a7b14e3f9c2d5f8a1e4b7c0d3f6a9b2e5c8d1f4a7b0c3e6f9...",
    "is_binary": true,
    "readable_as_text": false,
    "contains_plaintext": false
  },
  "security_summary": {
    "encrypted_before_storage": true,
    "key_stored_separately": true,
    "algorithm_strength": "256-bit AES-GCM + 768-bit Kyber",
    "status": "✓ SECURE"
  }
}
```

#### C. View Encryption Statistics
```bash
GET /api/admin/encryption-statistics
```
Shows:
- Total files count
- Encrypted vs unencrypted
- Algorithm breakdown (Kyber vs X25519)
- Total encrypted data size
- Overall security coverage

**Example response:**
```json
{
  "total_files": 12,
  "encrypted_files": 12,
  "encryption_algorithms": {
    "kyber768": 10,
    "x25519": 2
  },
  "total_encrypted_data_mb": 45.23,
  "encryption_coverage": "100%",
  "security_status": "✓ ALL FILES ENCRYPTED"
}
```

---

## How Encryption Works (Technical Details)

### File Upload Flow
```
1. Employee uploads file (plaintext in memory)
           ↓
2. File is encrypted using hybrid encryption:
   - CRYSTALS-Kyber768 for post-quantum key encapsulation
   - AES-256-GCM for symmetric encryption
           ↓
3. Result: Binary encrypted blob (unreadable)
           ↓
4. Store in MongoDB:
   - encrypted_content: Binary encrypted data
   - encryption_key: Base64-encoded key seed
   - encryption_alg: Algorithm identifier
   - is_encrypted: true flag
           ↓
5. File is NOW SECURE in database
```

### Encryption Details

**Algorithm:** CRYSTALS-Kyber768 + AES-256-GCM

**Process:**
```
1. Generate ephemeral Kyber keypair (public/secret)
2. Encapsulate shared secret using ephemeral public key
3. Derive AES-256 key from shared secret via HKDF-SHA256
4. Encrypt file with AES-256-GCM
5. Return: [kyber_pk][kyber_ct][aes_iv][aes_tag][encrypted_data]
```

**Stored Blob Structure:**
```
Bytes  0-1:    Public key length (2 bytes, big-endian)
Bytes  2-3:    Ciphertext length (2 bytes, big-endian)
Bytes  4-1187: Kyber public key (1184 bytes)
Bytes 1188-2275: Kyber ciphertext (1088 bytes)
Bytes 2276-2287: AES IV/Nonce (12 bytes)
Bytes 2288-2303: AES GCM tag (16 bytes)
Bytes 2304+:   Encrypted file data (variable)
```

---

## Verification Checklist for Invigilators

- [ ] Run `python demo_encryption.py` - Verify encryption/decryption works
- [ ] Open `demo_encryption.html` in browser - Visual walkthrough
- [ ] Check API `/api/admin/files/encryption-audit` - Verify all files encrypted
- [ ] Inspect specific file via API - Check encrypted content is binary
- [ ] View statistics `/api/admin/encryption-statistics` - 100% coverage
- [ ] Confirm `is_encrypted: true` on all files
- [ ] Verify no plaintext in `encrypted_content` field
- [ ] Check `encryption_key` is stored and separate
- [ ] Confirm algorithm is "kyber" (post-quantum) or "x25519" (fallback)

---

## Key Security Properties

✓ **Encryption Before Storage:** Files encrypted in memory before any I/O  
✓ **Post-Quantum Safe:** Kyber768 resistant to quantum attacks  
✓ **Authenticated Encryption:** GCM mode ensures integrity  
✓ **Unique Keys:** Each file gets unique ephemeral keypair  
✓ **Key Separation:** Encryption keys stored separately from content  
✓ **No Plaintext in DB:** Database contains only binary ciphertext  
✓ **Decryption on Access:** Files only decrypted when accessed by authorized user  
✓ **Full Audit Trail:** All access attempts logged  

---

## Integration with Project Setup

The new endpoints are automatically included:

```python
# In app/main.py
from app.routes.encryption_audit import router as encryption_audit_router
app.include_router(encryption_audit_router)  # /api/admin/*
```

**Available endpoints:**
- `GET /api/admin/files/encryption-audit` - Complete audit
- `GET /api/admin/files/{file_id}/encryption-details` - Single file details
- `GET /api/admin/encryption-statistics` - Statistics overview

All endpoints require **admin/manager role** for security.

---

## For Presentation Purposes

**Talking Points:**

1. **Security Architecture:**
   - Hybrid encryption combining post-quantum (Kyber) with traditional (AES)
   - Each file encrypted with unique ephemeral keypair
   - Authenticated encryption ensures data hasn't been tampered with

2. **Evidence of Encryption:**
   - Run demo script showing encryption → binary gibberish → decryption
   - Show database records with binary encrypted_content field
   - Explain that without the key, content is unreadable

3. **Zero-Trust Implementation:**
   - Files encrypted before storage
   - Keys stored separately in database
   - Decryption only happens on authorized access
   - All access logged and audited

4. **Future-Proof:**
   - Kyber768 is post-quantum resistant
   - Already standardized by NIST (ML-KEM-768)
   - Safe against quantum computing threats

---

## Troubleshooting

**Q: Demo script says "kyber library not available"**
```bash
pip install kyber-py --upgrade
# Then run: python demo_encryption.py
```

**Q: API returns 403 Forbidden**
```
You need admin/manager role to access encryption audit endpoints
```

**Q: Want to see actual files in database?**
```bash
# MongoDB
db.files.find({}, {encrypted_content: 0})  # Hide binary data
db.files.findOne({_id: ObjectId("...")})   # Specific file
```

---

## Summary

You have **3 proven ways** to demonstrate file encryption to your invigilator:

1. 📊 **Script Demo:** `python demo_encryption.py` - Shows real encryption
2. 🎨 **Visual Demo:** `demo_encryption.html` - Step-by-step walkthrough  
3. 🔍 **API Audit:** REST endpoints - Technical verification

Each method provides evidence that:
- Files are encrypted **before** storage
- Encrypted data is completely unreadable
- Only authorized users can decrypt files
- Post-quantum cryptography is in use
